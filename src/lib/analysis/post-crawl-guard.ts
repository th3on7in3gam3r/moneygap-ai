import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
import { log } from "@/lib/observability/logger";

/** Fresh post-crawl lease — stale claims can be stolen so preparing cannot orphan. */
export const POST_CRAWL_CLAIM_FRESH_MS = 2.5 * 60_000;

/** Hard watchdog: claimed with no report and no progress for this long → release + reschedule. */
export const POST_CRAWL_WATCHDOG_MS = 5 * 60_000;

export function isPostCrawlClaimFresh(input: {
  claimedAt: number | null;
  lastProgressAt?: number | null;
  now?: number;
}): boolean {
  const now = input.now ?? Date.now();
  if (input.claimedAt == null) return false;
  const progressAt = input.lastProgressAt ?? input.claimedAt;
  if (now - progressAt >= POST_CRAWL_CLAIM_FRESH_MS) return false;
  return true;
}

export function postCrawlClaimFromMeta(
  meta: Record<string, unknown> | null | undefined,
): {
  claimedAt: number | null;
  lastProgressAt: number | null;
  fresh: boolean;
} {
  const m = meta ?? {};
  const claimedAt =
    typeof m.postCrawlClaimedAt === "number" ? m.postCrawlClaimedAt : null;
  const lastProgressAt =
    typeof m.postCrawlLastProgressAt === "number"
      ? m.postCrawlLastProgressAt
      : typeof m.lastProgressAt === "number"
        ? m.lastProgressAt
        : null;
  return {
    claimedAt,
    lastProgressAt,
    fresh: isPostCrawlClaimFresh({ claimedAt, lastProgressAt }),
  };
}

/**
 * Atomically claim post-crawl analysis so concurrent complete handlers
 * cannot spawn duplicate OpenAI + report insert races.
 * Stale leases can be stolen (same pattern as tick / Money Gap claims).
 */
export async function claimPostCrawlAnalysis(analysisId: string): Promise<{
  claimed: boolean;
  reason: string;
  reportId: string | null;
}> {
  const existing = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: {
      id: true,
      status: true,
      reportId: true,
      scanPhase: true,
      scanMeta: true,
    },
  });
  if (!existing) return { claimed: false, reason: "missing", reportId: null };
  if (existing.status === "completed") {
    return { claimed: false, reason: "already_complete", reportId: existing.reportId };
  }
  if (existing.status === "failed") {
    return { claimed: false, reason: "already_failed", reportId: existing.reportId };
  }
  if (existing.reportId) {
    return {
      claimed: false,
      reason: "report_exists",
      reportId: existing.reportId,
    };
  }

  const meta = (existing.scanMeta as Record<string, unknown>) ?? {};
  const lease = postCrawlClaimFromMeta(meta);
  if (lease.fresh) {
    return { claimed: false, reason: "already_claimed", reportId: null };
  }

  const claimedAt = Date.now();
  const result = await db.execute(sql`
    UPDATE website_analyses
    SET
      scan_phase = 'analyzing',
      scan_meta = COALESCE(scan_meta, '{}'::jsonb) || ${JSON.stringify({
        postCrawlClaimedAt: claimedAt,
        postCrawlLastProgressAt: claimedAt,
        lastProgressAt: claimedAt,
        tickScheduleError: null,
        tickScheduleSeverity: "RECOVERED",
        tickScheduleNote:
          "Prior tick schedule timeout recovered — crawl completed successfully.",
        completeNotifyFailed: null,
      })}::jsonb
    WHERE id = ${analysisId}::uuid
      AND status = 'running'
      AND report_id IS NULL
      AND (
        scan_meta IS NULL
        OR scan_meta->>'postCrawlClaimedAt' IS NULL
        OR COALESCE((scan_meta->>'postCrawlLastProgressAt')::bigint,
             (scan_meta->>'postCrawlClaimedAt')::bigint, 0) < ${claimedAt - POST_CRAWL_CLAIM_FRESH_MS}
      )
    RETURNING id
  `);

  const rows =
    ((result as unknown as { rows?: Array<Record<string, unknown>> }).rows ??
      []) as Array<Record<string, unknown>>;

  if (rows.length === 0) {
    log("info", "post_crawl_claim_lost_race", { analysisId });
    return { claimed: false, reason: "lost_race", reportId: null };
  }

  log("info", "post_crawl_claim_acquired", { analysisId, claimedAt });
  return { claimed: true, reason: "claimed", reportId: null };
}

export async function touchPostCrawlProgress(
  analysisId: string,
  patch: Record<string, unknown> = {},
): Promise<void> {
  try {
    const existing = await db.query.websiteAnalyses.findFirst({
      where: eq(websiteAnalyses.id, analysisId),
      columns: { scanMeta: true, status: true },
    });
    if (
      !existing ||
      existing.status === "failed" ||
      existing.status === "completed"
    ) {
      return;
    }
    const now = Date.now();
    await db
      .update(websiteAnalyses)
      .set({
        scanMeta: {
          ...((existing.scanMeta as Record<string, unknown>) ?? {}),
          postCrawlLastProgressAt: now,
          lastProgressAt: now,
          ...patch,
        },
      })
      .where(eq(websiteAnalyses.id, analysisId));
  } catch {
    /* soft */
  }
}

/**
 * Clear the post-crawl lease so a later complete kick can reclaim.
 */
export async function releasePostCrawlClaim(
  analysisId: string,
  patch: Record<string, unknown> = {},
): Promise<void> {
  try {
    const existing = await db.query.websiteAnalyses.findFirst({
      where: eq(websiteAnalyses.id, analysisId),
      columns: { scanMeta: true },
    });
    const meta = { ...((existing?.scanMeta as Record<string, unknown>) ?? {}) };
    delete meta.postCrawlClaimedAt;
    await db
      .update(websiteAnalyses)
      .set({
        scanMeta: {
          ...meta,
          ...patch,
          postCrawlLastProgressAt: Date.now(),
        },
      })
      .where(eq(websiteAnalyses.id, analysisId));
  } catch {
    /* ignore */
  }
}
