import { classifyPageType, extractSinglePage, toScrapedPage } from "moneygap-crawler";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { crawlPages, websiteAnalyses, websitePages } from "@/db/schema";
import { runScanDiscovery } from "../discovery";
import type { ScanProfile } from "../types";
import type {
  CrawlerProvider,
  NotificationProvider,
  ProgressProvider,
  QueueProvider,
  StorageProvider,
} from "./types";

export const defaultCrawlerProvider: CrawlerProvider = {
  async discover({ url, profile }) {
    return runScanDiscovery({ url, profile });
  },
  async extractPage(url) {
    const record = await extractSinglePage(url, {
      playwrightEnabled: process.env.PLAYWRIGHT_ENABLED === "1",
    });
    if (!record || record.markdown.trim().length < 40) return null;
    return toScrapedPage(record);
  },
};

export const defaultQueueProvider: QueueProvider = {
  async enqueueUrls(jobId, urls) {
    if (urls.length === 0) return 0;
    const values = urls.map((url) => ({
      jobId,
      url,
      pageType: classifyPageType(url, urls[0]!),
      state: "queued" as const,
      attempts: 0,
    }));
    // Insert in chunks; ignore duplicates via unique index
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
            // skip
          }
        }
      }
    }
    return inserted;
  },

  async claimBatch(jobId, limit) {
    const rows = await db
      .select({ id: crawlPages.id, url: crawlPages.url })
      .from(crawlPages)
      .where(and(eq(crawlPages.jobId, jobId), inArray(crawlPages.state, ["queued", "retry"])))
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
      .where(inArray(crawlPages.id, ids));

    return rows;
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
    await db
      .update(crawlPages)
      .set({
        state: retry ? "retry" : "failed",
        lastError: error,
        updatedAt: new Date(),
      })
      .where(eq(crawlPages.id, pageId));
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
