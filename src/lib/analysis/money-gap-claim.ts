import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { reports, websiteAnalyses } from "@/db/schema";
import {
  isMoneyGapClaimFresh,
  MONEYGAP_CLAIM_FRESH_MS,
} from "@/lib/analysis/roadmap-errors";
import { log } from "@/lib/observability/logger";

/**
 * Atomically claim Money Gap engine work so stale resume / overlapping
 * ticks cannot run two module fan-outs at once.
 */
export async function claimMoneyGapEngine(analysisId: string): Promise<{
  claimed: boolean;
  reason: string;
}> {
  const existing = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: { id: true, status: true, reportId: true, scanMeta: true },
  });
  if (!existing) return { claimed: false, reason: "missing" };
  if (existing.status === "completed") {
    return { claimed: false, reason: "already_complete" };
  }
  if (existing.status === "failed") {
    return { claimed: false, reason: "already_failed" };
  }
  if (!existing.reportId) {
    return { claimed: false, reason: "no_report" };
  }

  const report = await db.query.reports.findFirst({
    where: eq(reports.id, existing.reportId),
    columns: { moneyGapEngineStatus: true },
  });
  if (report?.moneyGapEngineStatus === "completed") {
    return { claimed: false, reason: "engine_completed" };
  }

  const meta = (existing.scanMeta as Record<string, unknown>) ?? {};
  const claimedAt =
    typeof meta.moneyGapClaimedAt === "number" ? meta.moneyGapClaimedAt : null;
  const lastProgressAt =
    typeof meta.lastProgressAt === "number"
      ? meta.lastProgressAt
      : typeof meta.moneyGapLastProgressAt === "number"
        ? meta.moneyGapLastProgressAt
        : null;

  if (isMoneyGapClaimFresh({ claimedAt, lastProgressAt })) {
    return { claimed: false, reason: "already_claimed" };
  }

  const now = Date.now();
  const result = await db.execute(sql`
    UPDATE website_analyses
    SET
      scan_meta = COALESCE(scan_meta, '{}'::jsonb) || ${JSON.stringify({
        moneyGapClaimedAt: now,
        moneyGapLastProgressAt: now,
        moneyGapModulesTotal: null,
        moneyGapModulesCompleted: 0,
        moneyGapStageStartedAt: now,
      })}::jsonb
    WHERE id = ${analysisId}::uuid
      AND status = 'running'
      AND report_id IS NOT NULL
      AND (
        scan_meta IS NULL
        OR scan_meta->>'moneyGapClaimedAt' IS NULL
        OR COALESCE((scan_meta->>'moneyGapClaimedAt')::bigint, 0) < ${now - MONEYGAP_CLAIM_FRESH_MS}
      )
    RETURNING id
  `);

  const rows =
    ((result as unknown as { rows?: Array<Record<string, unknown>> }).rows ??
      []) as Array<Record<string, unknown>>;

  if (rows.length === 0) {
    log("info", "money_gap_claim_lost_race", { analysisId });
    return { claimed: false, reason: "lost_race" };
  }

  log("info", "money_gap_claim_acquired", { analysisId, claimedAt: now });
  return { claimed: true, reason: "claimed" };
}

export async function touchMoneyGapProgress(
  analysisId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  try {
    const existing = await db.query.websiteAnalyses.findFirst({
      where: eq(websiteAnalyses.id, analysisId),
      columns: { scanMeta: true, status: true },
    });
    if (!existing || existing.status === "failed" || existing.status === "completed") {
      return;
    }
    await db
      .update(websiteAnalyses)
      .set({
        scanMeta: {
          ...((existing.scanMeta as Record<string, unknown>) ?? {}),
          moneyGapLastProgressAt: Date.now(),
          lastProgressAt: Date.now(),
          ...patch,
        },
      })
      .where(eq(websiteAnalyses.id, analysisId));
  } catch {
    /* soft */
  }
}

export async function releaseMoneyGapClaim(
  analysisId: string,
  patch: Record<string, unknown> = {},
): Promise<void> {
  try {
    const existing = await db.query.websiteAnalyses.findFirst({
      where: eq(websiteAnalyses.id, analysisId),
      columns: { scanMeta: true },
    });
    const meta = { ...((existing?.scanMeta as Record<string, unknown>) ?? {}) };
    delete meta.moneyGapClaimedAt;
    await db
      .update(websiteAnalyses)
      .set({
        scanMeta: {
          ...meta,
          ...patch,
          moneyGapLastProgressAt: Date.now(),
        },
      })
      .where(eq(websiteAnalyses.id, analysisId));
  } catch {
    /* soft */
  }
}
