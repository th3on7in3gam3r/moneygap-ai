import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
import { log } from "@/lib/observability/logger";

/**
 * Atomically claim post-crawl analysis so concurrent ticks/complete handlers
 * cannot spawn duplicate OpenAI + report insert races.
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
  if (typeof meta.postCrawlClaimedAt === "number") {
    return { claimed: false, reason: "already_claimed", reportId: null };
  }

  const claimedAt = Date.now();
  const result = await db.execute(sql`
    UPDATE website_analyses
    SET
      scan_phase = 'analyzing',
      scan_meta = COALESCE(scan_meta, '{}'::jsonb) || ${JSON.stringify({
        postCrawlClaimedAt: claimedAt,
        tickScheduleError: null,
        tickScheduleSeverity: "RECOVERED",
        tickScheduleNote:
          "Prior tick schedule timeout recovered — crawl completed successfully.",
      })}::jsonb
    WHERE id = ${analysisId}::uuid
      AND status = 'running'
      AND report_id IS NULL
      AND (
        scan_meta IS NULL
        OR scan_meta->>'postCrawlClaimedAt' IS NULL
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

export async function releasePostCrawlClaim(
  analysisId: string,
  patch: Record<string, unknown> = {},
): Promise<void> {
  try {
    const existing = await db.query.websiteAnalyses.findFirst({
      where: eq(websiteAnalyses.id, analysisId),
      columns: { scanMeta: true },
    });
    await db
      .update(websiteAnalyses)
      .set({
        scanMeta: {
          ...((existing?.scanMeta as Record<string, unknown>) ?? {}),
          ...patch,
        },
      })
      .where(eq(websiteAnalyses.id, analysisId));
  } catch {
    /* ignore */
  }
}
