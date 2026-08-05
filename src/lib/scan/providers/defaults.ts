import { classifyPageType, extractSinglePage, toScrapedPage } from "moneygap-crawler";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { crawlPages, websiteAnalyses, websitePages } from "@/db/schema";
import { runScanDiscovery } from "../discovery";
import {
  MAX_PAGE_ATTEMPTS,
  STALE_PROCESSING_MS,
  shouldRetryAfterFail,
} from "../reclaim";
import { scanLog, scanWarn } from "../scan-log";
import type { ScanProfile } from "../types";
import type {
  CrawlerProvider,
  NotificationProvider,
  ProgressProvider,
  QueueProvider,
  StorageProvider,
} from "./types";

const HARD_PAGE_CEILING = 50;

function parseClaimRows(
  result: unknown,
): Array<{ id: string; url: string; attempts: number }> {
  const rows =
    (result as { rows?: Array<Record<string, unknown>> })?.rows ??
    (Array.isArray(result) ? (result as Array<Record<string, unknown>>) : []);
  return rows
    .map((r) => ({
      id: String(r.id ?? ""),
      url: String(r.url ?? ""),
      attempts: Number(r.attempts ?? 0),
    }))
    .filter((r) => r.id && r.url);
}

export const defaultCrawlerProvider: CrawlerProvider = {
  async discover({ url, profile }) {
    return runScanDiscovery({ url, profile });
  },
  async extractPage(url) {
    const record = await extractSinglePage(url, {
      playwrightEnabled: process.env.PLAYWRIGHT_ENABLED === "1",
      timeoutMs: 15_000,
    });
    if (!record || record.markdown.trim().length < 40) return null;
    return toScrapedPage(record);
  },
};

export const defaultQueueProvider: QueueProvider = {
  async enqueueUrls(jobId, urls) {
    if (urls.length === 0) return 0;
    const capped = urls.slice(0, HARD_PAGE_CEILING);
    const values = capped.map((url) => ({
      jobId,
      url,
      pageType: classifyPageType(url, capped[0]!),
      state: "queued" as const,
      attempts: 0,
    }));
    let inserted = 0;
    const chunk = 100;
    for (let i = 0; i < values.length; i += chunk) {
      const slice = values.slice(i, i + chunk);
      try {
        await db.insert(crawlPages).values(slice).onConflictDoNothing();
        inserted += slice.length;
      } catch {
        for (const row of slice) {
          try {
            await db.insert(crawlPages).values(row).onConflictDoNothing();
            inserted += 1;
          } catch {
            // skip duplicates
          }
        }
      }
    }
    scanLog("QUEUE", `Enqueued up to ${capped.length} URLs`, {
      jobId,
      inserted,
      skippedCap: urls.length - capped.length,
    });
    return inserted;
  },

  async claimBatch(jobId, limit) {
    if (limit <= 0) return [];

    // Atomic-ish claim: UPDATE only if still queued/retry, RETURNING.
    // Neon HTTP lacks interactive FOR UPDATE SKIP LOCKED transactions;
    // the state guard on UPDATE prevents most double-claims.
    try {
      const result = await db.execute(sql`
        UPDATE crawl_pages AS p
        SET
          state = 'processing',
          attempts = p.attempts + 1,
          updated_at = NOW()
        WHERE p.id IN (
          SELECT id
          FROM crawl_pages
          WHERE job_id = ${jobId}::uuid
            AND state IN ('queued', 'retry')
          ORDER BY created_at ASC
          LIMIT ${limit}
        )
        AND p.state IN ('queued', 'retry')
        RETURNING p.id, p.url, p.attempts
      `);
      const claimed = parseClaimRows(result);
      scanLog("CRAWLER", `Claimed ${claimed.length} pages`, {
        jobId,
        limit,
      });
      return claimed;
    } catch (err) {
      scanWarn("CRAWLER", "Atomic claim failed; falling back to select+update", {
        jobId,
        error: err instanceof Error ? err.message : String(err),
      });
      const rows = await db
        .select({
          id: crawlPages.id,
          url: crawlPages.url,
          attempts: crawlPages.attempts,
        })
        .from(crawlPages)
        .where(
          and(
            eq(crawlPages.jobId, jobId),
            inArray(crawlPages.state, ["queued", "retry"]),
          ),
        )
        .limit(limit);

      if (rows.length === 0) return [];

      const ids = rows.map((r) => r.id);
      await db
        .update(crawlPages)
        .set({
          state: "processing",
          attempts: sql`${crawlPages.attempts} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(inArray(crawlPages.id, ids), inArray(crawlPages.state, ["queued", "retry"])),
        );

      return rows.map((r) => ({
        id: r.id,
        url: r.url,
        attempts: r.attempts + 1,
      }));
    }
  },

  async markCompleted(pageId, data) {
    await db
      .update(crawlPages)
      .set({
        state: "completed",
        title: data.title,
        markdown: data.markdown,
        pageType: data.pageType,
        metadata: data.metadata,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(crawlPages.id, pageId));
  },

  async markFailed(pageId, error, retry) {
    const row = await db.query.crawlPages.findFirst({
      where: eq(crawlPages.id, pageId),
      columns: { attempts: true },
    });
    const attempts = row?.attempts ?? 0;
    const doRetry = shouldRetryAfterFail(attempts, retry);
    await db
      .update(crawlPages)
      .set({
        state: doRetry ? "retry" : "failed",
        lastError: error,
        updatedAt: new Date(),
      })
      .where(eq(crawlPages.id, pageId));
    if (!doRetry && retry) {
      scanWarn("QUEUE", "Page permanently failed (max attempts)", {
        pageId,
        attempts,
        error,
      });
    }
  },

  async countByState(jobId) {
    const rows = await db
      .select({
        state: crawlPages.state,
        n: sql<number>`count(*)::int`,
      })
      .from(crawlPages)
      .where(eq(crawlPages.jobId, jobId))
      .groupBy(crawlPages.state);
    const out: Record<string, number> = {};
    for (const r of rows) out[r.state] = r.n;
    return out;
  },

  async reclaimStaleProcessing(jobId, staleMs = STALE_PROCESSING_MS) {
    const cutoff = new Date(Date.now() - staleMs);
    const stale = await db
      .select({
        id: crawlPages.id,
        attempts: crawlPages.attempts,
      })
      .from(crawlPages)
      .where(
        and(
          eq(crawlPages.jobId, jobId),
          eq(crawlPages.state, "processing"),
          lt(crawlPages.updatedAt, cutoff),
        ),
      );

    let retried = 0;
    let failed = 0;
    for (const row of stale) {
      if (row.attempts >= MAX_PAGE_ATTEMPTS) {
        await db
          .update(crawlPages)
          .set({
            state: "failed",
            lastError: "Stale processing reclaim — max attempts exceeded",
            updatedAt: new Date(),
          })
          .where(eq(crawlPages.id, row.id));
        failed += 1;
      } else {
        await db
          .update(crawlPages)
          .set({
            state: "retry",
            lastError: "Stale processing reclaim — requeued",
            updatedAt: new Date(),
          })
          .where(eq(crawlPages.id, row.id));
        retried += 1;
      }
    }

    if (retried || failed) {
      scanWarn("QUEUE", "Reclaimed stale processing pages", {
        jobId,
        retried,
        failed,
        staleMs,
      });
    }
    return { retried, failed };
  },
};

export const defaultStorageProvider: StorageProvider = {
  async mirrorWebsitePage(input) {
    await db.insert(websitePages).values({
      analysisId: input.analysisId,
      url: input.url,
      pageType: input.pageType,
      title: input.title,
      markdown: input.markdown,
      metadata: input.metadata,
    });
  },
};

export const defaultProgressProvider: ProgressProvider = {
  async update(analysisId, patch) {
    const meta = patch.scanMeta
      ? {
          ...(patch.currentUrl != null ? { currentUrl: patch.currentUrl } : {}),
          ...patch.scanMeta,
        }
      : patch.currentUrl != null
        ? { currentUrl: patch.currentUrl }
        : undefined;

    const existing = meta
      ? await db.query.websiteAnalyses.findFirst({
          where: eq(websiteAnalyses.id, analysisId),
          columns: { scanMeta: true },
        })
      : null;

    await db
      .update(websiteAnalyses)
      .set({
        ...(patch.scanPhase != null ? { scanPhase: patch.scanPhase } : {}),
        ...(patch.stage != null ? { stage: patch.stage } : {}),
        ...(patch.progress != null ? { progress: patch.progress } : {}),
        ...(patch.pagesDiscovered != null
          ? { pagesDiscovered: patch.pagesDiscovered }
          : {}),
        ...(patch.pagesCompleted != null
          ? { pagesCompleted: patch.pagesCompleted }
          : {}),
        ...(patch.pagesFailed != null ? { pagesFailed: patch.pagesFailed } : {}),
        ...(patch.estimatedRemainingMs !== undefined
          ? { estimatedRemainingMs: patch.estimatedRemainingMs }
          : {}),
        ...(meta
          ? {
              scanMeta: {
                ...((existing?.scanMeta as Record<string, unknown>) ?? {}),
                ...meta,
              },
            }
          : {}),
      })
      .where(eq(websiteAnalyses.id, analysisId));
  },
};

export const defaultNotificationProvider: NotificationProvider = {
  async onScanComplete() {
    /* poll UI is primary; webhooks already fire from pipeline */
  },
  async onScanFailed() {
    /* no-op */
  },
};
