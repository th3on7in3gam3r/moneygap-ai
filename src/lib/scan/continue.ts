import { after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
import {
  isActiveCrawlDeadlinePassed,
  resolveActiveCrawlDeadlineAt,
} from "./deadline";
import { scanLog, scanWarn } from "./scan-log";
import { diagnoseTickEnv } from "./tick-env";
import type { ScanProfile } from "./types";

const TICK_FETCH_TIMEOUT_MS = 5_000;
/** Re-kick crawl ticks if no progress heartbeat for this long. */
const STALL_KICK_MS = 90_000;
/** Discover can sit without enqueue — allow kick after this. */
const DISCOVER_STALL_MS = 3 * 60_000;
/** Worker waiting with no heartbeat — kick complete/tick path. */
const WORKER_STALL_MS = 3 * 60_000;
/** Don't spam scheduleScanTick from status polls. */
const KICK_COOLDOWN_MS = 45_000;

async function persistTickScheduleError(
  analysisId: string,
  message: string | null,
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
          tickScheduleError: message,
        },
      })
      .where(eq(websiteAnalyses.id, analysisId));
  } catch {
    /* ignore */
  }
}

async function persistTickKickMeta(analysisId: string): Promise<void> {
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
          lastTickKickAt: Date.now(),
        },
      })
      .where(eq(websiteAnalyses.id, analysisId));
  } catch {
    /* ignore */
  }
}

/** Best-effort same-process tick when HTTP self-schedule is unavailable. */
function fallbackInProcessTick(analysisId: string): void {
  const run = async () => {
    try {
      const { processScanTick } = await import("./batch");
      const result = await processScanTick(analysisId);
      if (!result.done) scheduleScanTickAsync(analysisId);
    } catch (err) {
      scanWarn("SCAN", "In-process tick fallback failed", {
        analysisId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };
  try {
    after(() => {
      void run();
    });
  } catch {
    void run();
  }
}

/** Schedule the next serverless crawl tick (fire-and-forget, timed). */
export async function scheduleScanTick(analysisId: string): Promise<void> {
  const diag = diagnoseTickEnv();
  const secret = process.env.CRON_SECRET?.trim();

  if (!diag.ok || !diag.origin || !secret) {
    const msg =
      diag.message ??
      "Crawl ticks cannot self-schedule — check APP_URL and CRON_SECRET.";
    scanWarn("SCAN", "scheduleScanTick: env incomplete", {
      analysisId,
      hasSecret: diag.hasSecret,
      hasOrigin: diag.hasOrigin,
    });
    await persistTickScheduleError(analysisId, msg);
    // Still advance the queue in-process so local/misconfigured deploys don't freeze.
    fallbackInProcessTick(analysisId);
    return;
  }

  const url = `${diag.origin}/api/scan/tick`;
  const run = async () => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          // Prefer x-cron-secret — Authorization Bearer can be intercepted by Clerk.
          "x-cron-secret": secret,
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ analysisId }),
        signal: AbortSignal.timeout(TICK_FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        const detail = `Tick HTTP ${res.status} from ${url}`;
        scanWarn("SCAN", "scheduleScanTick non-OK response", {
          analysisId,
          status: res.status,
        });
        await persistTickScheduleError(analysisId, detail);
        fallbackInProcessTick(analysisId);
        return;
      }
      await persistTickScheduleError(analysisId, null);
      scanLog("SCAN", "Scheduled next tick", {
        analysisId,
        status: res.status,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      scanWarn("SCAN", "scheduleScanTick failed", {
        analysisId,
        error: detail,
      });
      await persistTickScheduleError(
        analysisId,
        `Tick schedule failed: ${detail}`,
      );
      fallbackInProcessTick(analysisId);
    }
  };

  // Prefer Next after() so we never await nested ticks in the parent.
  try {
    after(() => {
      void run();
    });
  } catch {
    void run();
  }
}

/** Fire-and-forget helper — never blocks the caller on the child tick. */
export function scheduleScanTickAsync(analysisId: string): void {
  void scheduleScanTick(analysisId);
}

/**
 * If a crawl looks stalled (no page progress heartbeat), re-schedule a tick.
 * Called from status polling so hung "Reading pages" jobs self-heal.
 */
export async function kickStalledScanIfNeeded(analysisId: string): Promise<{
  kicked: boolean;
  reason?: string;
}> {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: {
      id: true,
      status: true,
      reportId: true,
      scanPhase: true,
      scanProfile: true,
      startedAt: true,
      createdAt: true,
      scanMeta: true,
    },
  });

  if (!analysis) return { kicked: false, reason: "missing" };
  if (analysis.reportId) return { kicked: false, reason: "has_report" };
  if (analysis.status !== "running" && analysis.status !== "queued") {
    return { kicked: false, reason: "not_running" };
  }

  const phase = analysis.scanPhase;
  if (
    phase !== "discovering" &&
    phase !== "processing" &&
    phase !== "waiting" &&
    phase !== "queued"
  ) {
    return { kicked: false, reason: "not_crawl_phase" };
  }

  const meta = (analysis.scanMeta as Record<string, unknown>) ?? {};
  const lastProgressAt =
    typeof meta.lastProgressAt === "number"
      ? meta.lastProgressAt
      : typeof meta.lastProgressAt === "string"
        ? Date.parse(meta.lastProgressAt)
        : NaN;
  const lastTickKickAt =
    typeof meta.lastTickKickAt === "number" ? meta.lastTickKickAt : 0;
  const tickScheduleError =
    typeof meta.tickScheduleError === "string" ? meta.tickScheduleError : null;

  const clock =
    (Number.isFinite(lastProgressAt) ? lastProgressAt : null) ??
    analysis.startedAt?.getTime() ??
    analysis.createdAt.getTime();
  const ageMs = Date.now() - clock;
  const sinceKick = Date.now() - lastTickKickAt;

  // Apify polls via the same tick scheduler — always eligible to re-kick.
  const isApify = meta.execution === "apify" || meta.crawlProvider === "apify";
  const isWorker = meta.execution === "worker" && !isApify;

  // Active profile deadline (not the 3h orphan stale ceiling) — force tick so
  // processScanTick can fail or complete-partial instead of waiting for stale unlock.
  const profile = (analysis.scanProfile as ScanProfile) || "standard";
  const deadlineAtMs = resolveActiveCrawlDeadlineAt({
    scanMeta: meta,
    profile,
    startedAt: analysis.startedAt,
    createdAt: analysis.createdAt,
  });
  if (isActiveCrawlDeadlinePassed(deadlineAtMs) && sinceKick >= KICK_COOLDOWN_MS) {
    scanWarn("SCAN", "Active crawlDeadlineAt passed — forcing tick", {
      analysisId,
      deadlineAtMs,
      execution: meta.execution,
    });
    await persistTickKickMeta(analysisId);
    scheduleScanTickAsync(analysisId);
    try {
      const { processScanTick } = await import("./batch");
      await processScanTick(analysisId);
    } catch {
      /* ignore */
    }
    return { kicked: true, reason: "active_deadline" };
  }

  // Worker with stale heartbeat: kick /api/scan/complete attempt via tick path
  // (tick no-ops if queue empty; complete route is separate — schedule tick + warn).
  if (isWorker) {
    if (ageMs < WORKER_STALL_MS) {
      return { kicked: false, reason: "worker_fresh" };
    }
    if (sinceKick < KICK_COOLDOWN_MS) {
      return { kicked: false, reason: "cooldown" };
    }
    scanWarn("SCAN", "Worker crawl stale — re-kicking tick/complete path", {
      analysisId,
      ageMs,
    });
    await persistTickKickMeta(analysisId);
    scheduleScanTickAsync(analysisId);
    // Also try complete if pages already mirrored
    try {
      const { processScanTick } = await import("./batch");
      await processScanTick(analysisId);
    } catch {
      /* ignore */
    }
    return { kicked: true, reason: "worker_stale" };
  }

  const scanStage =
    typeof meta.scanStage === "string" ? meta.scanStage : "";
  const stillDiscovering =
    phase === "discovering" ||
    phase === "queued" ||
    scanStage === "connecting" ||
    scanStage === "robots" ||
    scanStage === "sitemap" ||
    scanStage === "discovery" ||
    scanStage === "queue";

  // Allow kick after discover stall threshold so mid-discover kill cannot freeze forever.
  if (stillDiscovering && !isApify) {
    if (ageMs < DISCOVER_STALL_MS) {
      return { kicked: false, reason: "still_discovering" };
    }
    if (sinceKick < KICK_COOLDOWN_MS) {
      return { kicked: false, reason: "cooldown" };
    }
    scanWarn("SCAN", "Discover stall exceeded — re-kicking", {
      analysisId,
      ageMs,
      scanStage,
    });
    await persistTickKickMeta(analysisId);
    scheduleScanTickAsync(analysisId);
    return { kicked: true, reason: "discover_stalled" };
  }

  const shouldKick =
    Boolean(tickScheduleError) || ageMs >= STALL_KICK_MS;

  if (!shouldKick) return { kicked: false, reason: "fresh" };
  if (sinceKick < KICK_COOLDOWN_MS) {
    return { kicked: false, reason: "cooldown" };
  }

  scanWarn("SCAN", "Re-kicking stalled crawl tick from status poll", {
    analysisId,
    phase,
    ageMs,
    tickScheduleError,
  });
  await persistTickKickMeta(analysisId);
  scheduleScanTickAsync(analysisId);
  return { kicked: true, reason: tickScheduleError ? "tick_error" : "stalled" };
}
