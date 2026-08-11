import { after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
import { log } from "@/lib/observability/logger";
import {
  isActiveCrawlDeadlinePassed,
  resolveActiveCrawlDeadlineAt,
} from "./deadline";
import { isWorkerScanExecution } from "./execution";
import { scanLog, scanWarn } from "./scan-log";
import {
  claimScanTick,
  releaseTickClaim,
  tickClaimFromMeta,
} from "./tick-claim";
import {
  classifyTickScheduleError,
  type TickScheduleErrorClass,
  type TickScheduleSeverity,
} from "./tick-errors";
import { diagnoseTickEnv } from "./tick-env";
import type { ScanProfile } from "./types";

/** Short timeout for ACK-only scheduling (not processing). */
const TICK_FETCH_TIMEOUT_MS = 5_000;
/** Re-kick crawl ticks if no progress heartbeat for this long. */
const STALL_KICK_MS = 90_000;
/** Discover can sit without enqueue — allow kick after this. */
const DISCOVER_STALL_MS = 3 * 60_000;
/** Worker waiting with no heartbeat — kick complete/tick path. */
const WORKER_STALL_MS = 3 * 60_000;
/** Don't spam scheduleScanTick from status polls. */
const KICK_COOLDOWN_MS = 45_000;

async function persistTickScheduleMeta(
  analysisId: string,
  patch: {
    tickScheduleError?: string | null;
    tickScheduleErrorClass?: TickScheduleErrorClass | null;
    tickScheduleSeverity?: TickScheduleSeverity | null;
    tickScheduleNote?: string | null;
  },
): Promise<void> {
  try {
    const existing = await db.query.websiteAnalyses.findFirst({
      where: eq(websiteAnalyses.id, analysisId),
      columns: { scanMeta: true },
    });
    const meta = {
      ...((existing?.scanMeta as Record<string, unknown>) ?? {}),
    };
    if ("tickScheduleError" in patch) {
      meta.tickScheduleError = patch.tickScheduleError;
    }
    if ("tickScheduleErrorClass" in patch) {
      meta.tickScheduleErrorClass = patch.tickScheduleErrorClass;
    }
    if ("tickScheduleSeverity" in patch) {
      meta.tickScheduleSeverity = patch.tickScheduleSeverity;
    }
    if ("tickScheduleNote" in patch) {
      meta.tickScheduleNote = patch.tickScheduleNote;
    }
    await db
      .update(websiteAnalyses)
      .set({ scanMeta: meta })
      .where(eq(websiteAnalyses.id, analysisId));
  } catch {
    /* ignore */
  }
}

async function clearTickScheduleWarning(analysisId: string): Promise<void> {
  await persistTickScheduleMeta(analysisId, {
    tickScheduleError: null,
    tickScheduleErrorClass: null,
    tickScheduleSeverity: "RECOVERED",
    tickScheduleNote: "Tick schedule ACK succeeded.",
  });
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

async function shouldSkipInProcessFallback(analysisId: string): Promise<{
  skip: boolean;
  reason: string;
}> {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: { scanMeta: true, status: true, reportId: true },
  });
  if (!analysis) return { skip: true, reason: "missing" };
  if (analysis.reportId || analysis.status === "completed") {
    return { skip: true, reason: "already_complete" };
  }
  const meta = (analysis.scanMeta as Record<string, unknown>) ?? {};
  const claim = tickClaimFromMeta(meta);
  if (claim.fresh) {
    return { skip: true, reason: "already_claimed" };
  }
  const isApify = meta.execution === "apify" || meta.crawlProvider === "apify";
  if (meta.execution === "worker" && !isApify) {
    return { skip: true, reason: "worker_owns" };
  }
  if (isApify && claim.claimedAt != null && claim.fresh) {
    return { skip: true, reason: "apify_in_flight" };
  }
  return { skip: false, reason: "ok" };
}

/**
 * Best-effort same-process tick when HTTP self-schedule is unavailable.
 * Must acquire the tick claim — never duplicates an in-flight owner.
 */
function fallbackInProcessTick(analysisId: string): void {
  const run = async () => {
    try {
      const skip = await shouldSkipInProcessFallback(analysisId);
      if (skip.skip) {
        scanLog("SCAN", "In-process tick fallback skipped", {
          analysisId,
          reason: skip.reason,
        });
        return;
      }
      const claim = await claimScanTick(analysisId);
      if (!claim.claimed) {
        scanLog("SCAN", "In-process tick fallback not claimed", {
          analysisId,
          reason: claim.reason,
        });
        return;
      }
      const { processScanTick } = await import("./batch");
      const result = await processScanTick(analysisId);
      if (!result.done) scheduleScanTickAsync(analysisId);
    } catch (err) {
      scanWarn("SCAN", "In-process tick fallback failed", {
        analysisId,
        error: err instanceof Error ? err.message : String(err),
      });
      await releaseTickClaim(analysisId).catch(() => undefined);
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

/** Schedule the next crawl tick (ACK-only HTTP; processing is detached). */
export async function scheduleScanTick(analysisId: string): Promise<void> {
  const scheduleStarted = Date.now();
  const diag = diagnoseTickEnv();
  const secret = process.env.CRON_SECRET?.trim();
  const workerEnabled = isWorkerScanExecution();

  log("info", "TICK_SCHEDULE_START", {
    analysisId,
    workerEnabled,
    executionMode: workerEnabled ? "worker" : "ticks",
    hasOrigin: diag.hasOrigin,
    hasSecret: diag.hasSecret,
  });

  if (!diag.ok || !diag.origin || !secret) {
    const msg =
      diag.message ??
      "Crawl ticks cannot self-schedule — check APP_URL and CRON_SECRET.";
    scanWarn("SCAN", "scheduleScanTick: env incomplete", {
      analysisId,
      hasSecret: diag.hasSecret,
      hasOrigin: diag.hasOrigin,
      errorClass: diag.errorClass,
    });
    await persistTickScheduleMeta(analysisId, {
      tickScheduleError: msg,
      tickScheduleErrorClass: diag.errorClass,
      tickScheduleSeverity: "WARNING",
    });
    // Local / misconfigured deploys: advance in-process if nobody owns the tick.
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

      let body: {
        ok?: boolean;
        accepted?: boolean;
        reason?: string;
        started?: boolean;
      } = {};
      try {
        body = (await res.json()) as typeof body;
      } catch {
        /* non-JSON */
      }

      const ackDurationMs = Date.now() - scheduleStarted;
      // 200/202 = scheduling accepted (including already_claimed).
      if (res.ok || res.status === 202) {
        log("info", "TICK_SCHEDULE_ACK", {
          analysisId,
          ackDurationMs,
          status: res.status,
          accepted: body.accepted ?? true,
          reason: body.reason ?? "ok",
          workerEnabled,
        });
        await clearTickScheduleWarning(analysisId);
        scanLog("SCAN", "Scheduled next tick", {
          analysisId,
          status: res.status,
          accepted: body.accepted,
          reason: body.reason,
        });
        return;
      }

      const detail = `Tick HTTP ${res.status} from ${url}`;
      const errorClass = classifyTickScheduleError(new Error(detail));
      scanWarn("SCAN", "scheduleScanTick non-OK response", {
        analysisId,
        status: res.status,
        errorClass,
      });
      await persistTickScheduleMeta(analysisId, {
        tickScheduleError: detail,
        tickScheduleErrorClass: errorClass,
        tickScheduleSeverity: "WARNING",
      });
      const skip = await shouldSkipInProcessFallback(analysisId);
      if (!skip.skip) fallbackInProcessTick(analysisId);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      const errorClass = classifyTickScheduleError(err);
      scanWarn("SCAN", "scheduleScanTick failed", {
        analysisId,
        error: detail,
        errorClass,
      });
      log("info", "TICK_SCHEDULE_ACK", {
        analysisId,
        ackDurationMs: Date.now() - scheduleStarted,
        status: 0,
        accepted: false,
        reason: errorClass,
        workerEnabled,
      });

      // Timeout after ACK-first redesign is infrastructure failure if env is OK.
      // Do not scare customers when another owner / worker is already progressing.
      const skip = await shouldSkipInProcessFallback(analysisId);
      if (skip.skip) {
        await persistTickScheduleMeta(analysisId, {
          tickScheduleError: `Tick schedule failed: ${detail}`,
          tickScheduleErrorClass: errorClass,
          tickScheduleSeverity: "INFO",
          tickScheduleNote: `Scheduling noise while ${skip.reason}; crawl continues.`,
        });
        return;
      }

      await persistTickScheduleMeta(analysisId, {
        tickScheduleError: `Tick schedule failed: ${detail}`,
        tickScheduleErrorClass: errorClass,
        tickScheduleSeverity:
          errorClass === "TICK_CONNECTION_TIMEOUT" ? "INFO" : "WARNING",
      });
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
  const tickSeverity =
    typeof meta.tickScheduleSeverity === "string"
      ? meta.tickScheduleSeverity
      : null;

  const claim = tickClaimFromMeta(meta);
  if (claim.fresh) {
    return { kicked: false, reason: "tick_in_flight" };
  }

  const clock =
    (Number.isFinite(lastProgressAt) ? lastProgressAt : null) ??
    analysis.startedAt?.getTime() ??
    analysis.createdAt.getTime();
  const ageMs = Date.now() - clock;
  const sinceKick = Date.now() - lastTickKickAt;

  const isApify = meta.execution === "apify" || meta.crawlProvider === "apify";
  const isWorker = meta.execution === "worker" && !isApify;

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
    // Single path only — HTTP ACK claims ownership; no parallel in-process tick.
    scheduleScanTickAsync(analysisId);
    return { kicked: true, reason: "active_deadline" };
  }

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
    // Prefer scheduling ACK only; worker owns page drain. Tick may only
    // handle deadline helpers when claim succeeds.
    scheduleScanTickAsync(analysisId);
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

  // INFO/RECOVERED schedule notes should not force endless re-kicks.
  const warningKick =
    Boolean(tickScheduleError) &&
    (tickSeverity === "WARNING" || !tickSeverity);

  const shouldKick = warningKick || ageMs >= STALL_KICK_MS;

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
