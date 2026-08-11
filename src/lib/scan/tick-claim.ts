import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
import { log } from "@/lib/observability/logger";
import {
  isTickClaimFresh,
  TICK_CLAIM_FRESH_MS,
} from "@/lib/scan/tick-errors";

/**
 * Atomically claim a crawl tick so HTTP ACK + in-process fallback + stall
 * kicks cannot run overlapping processScanTick invocations.
 */
export async function claimScanTick(analysisId: string): Promise<{
  claimed: boolean;
  reason: string;
}> {
  const existing = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: { id: true, status: true, reportId: true, scanMeta: true, scanPhase: true },
  });
  if (!existing) return { claimed: false, reason: "missing" };
  if (existing.status === "completed" || existing.reportId) {
    return { claimed: false, reason: "already_complete" };
  }
  if (existing.status === "failed") {
    return { claimed: false, reason: "already_failed" };
  }
  if (
    existing.scanPhase === "paused" ||
    existing.scanPhase === "cancelled" ||
    existing.scanPhase === "analyzing"
  ) {
    return { claimed: false, reason: "not_crawl_phase" };
  }

  const meta = (existing.scanMeta as Record<string, unknown>) ?? {};
  const claimedAt =
    typeof meta.tickClaimedAt === "number" ? meta.tickClaimedAt : null;
  const lastProgressAt =
    typeof meta.tickLastProgressAt === "number"
      ? meta.tickLastProgressAt
      : typeof meta.lastProgressAt === "number"
        ? meta.lastProgressAt
        : null;

  if (isTickClaimFresh({ claimedAt, lastProgressAt })) {
    return { claimed: false, reason: "already_claimed" };
  }

  const now = Date.now();
  const result = await db.execute(sql`
    UPDATE website_analyses
    SET
      scan_meta = COALESCE(scan_meta, '{}'::jsonb) || ${JSON.stringify({
        tickClaimedAt: now,
        tickLastProgressAt: now,
      })}::jsonb
    WHERE id = ${analysisId}::uuid
      AND status IN ('running', 'queued')
      AND report_id IS NULL
      AND (
        scan_meta IS NULL
        OR scan_meta->>'tickClaimedAt' IS NULL
        OR COALESCE((scan_meta->>'tickClaimedAt')::bigint, 0) < ${now - TICK_CLAIM_FRESH_MS}
      )
    RETURNING id
  `);

  const rows =
    ((result as unknown as { rows?: Array<Record<string, unknown>> }).rows ??
      []) as Array<Record<string, unknown>>;

  if (rows.length === 0) {
    log("info", "tick_claim_lost_race", { analysisId });
    return { claimed: false, reason: "lost_race" };
  }

  log("info", "tick_claim_acquired", { analysisId, claimedAt: now });
  return { claimed: true, reason: "claimed" };
}

export async function touchTickProgress(
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
    await db
      .update(websiteAnalyses)
      .set({
        scanMeta: {
          ...((existing.scanMeta as Record<string, unknown>) ?? {}),
          tickLastProgressAt: Date.now(),
          lastProgressAt: Date.now(),
          ...patch,
        },
      })
      .where(eq(websiteAnalyses.id, analysisId));
  } catch {
    /* soft */
  }
}

export async function releaseTickClaim(
  analysisId: string,
  patch: Record<string, unknown> = {},
): Promise<void> {
  try {
    const existing = await db.query.websiteAnalyses.findFirst({
      where: eq(websiteAnalyses.id, analysisId),
      columns: { scanMeta: true },
    });
    const meta = { ...((existing?.scanMeta as Record<string, unknown>) ?? {}) };
    delete meta.tickClaimedAt;
    await db
      .update(websiteAnalyses)
      .set({
        scanMeta: {
          ...meta,
          ...patch,
          tickLastProgressAt: Date.now(),
        },
      })
      .where(eq(websiteAnalyses.id, analysisId));
  } catch {
    /* soft */
  }
}

/** Read-only: whether another tick currently owns the scan. */
export function tickClaimFromMeta(meta: Record<string, unknown> | null | undefined): {
  claimedAt: number | null;
  lastProgressAt: number | null;
  fresh: boolean;
} {
  const m = meta ?? {};
  const claimedAt =
    typeof m.tickClaimedAt === "number" ? m.tickClaimedAt : null;
  const lastProgressAt =
    typeof m.tickLastProgressAt === "number"
      ? m.tickLastProgressAt
      : typeof m.lastProgressAt === "number"
        ? m.lastProgressAt
        : null;
  return {
    claimedAt,
    lastProgressAt,
    fresh: isTickClaimFresh({ claimedAt, lastProgressAt }),
  };
}
