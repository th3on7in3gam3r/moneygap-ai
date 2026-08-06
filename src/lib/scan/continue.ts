import { after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
import { getSiteOrigin } from "@/lib/seo";
import { scanLog, scanWarn } from "./scan-log";

const TICK_FETCH_TIMEOUT_MS = 5_000;

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
  const secret = process.env.CRON_SECRET?.trim();
  const origin =
    process.env.APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    getSiteOrigin();

  if (!secret || !origin) {
    const msg =
      "Missing CRON_SECRET or APP_URL — crawl ticks cannot self-schedule over HTTP.";
    scanWarn("SCAN", "scheduleScanTick: missing CRON_SECRET or APP_URL", {
      analysisId,
      hasSecret: Boolean(secret),
      hasOrigin: Boolean(origin),
    });
    await persistTickScheduleError(analysisId, msg);
    // Still advance the queue in-process so local/misconfigured deploys don't freeze.
    fallbackInProcessTick(analysisId);
    return;
  }

  const url = `${origin}/api/scan/tick`;
  const run = async () => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
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
