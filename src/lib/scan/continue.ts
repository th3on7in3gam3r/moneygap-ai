import { after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
import { getSiteOrigin } from "@/lib/seo";
import { scanLog, scanWarn } from "./scan-log";

const TICK_FETCH_TIMEOUT_MS = 5_000;

/** Schedule the next serverless crawl tick (fire-and-forget, timed). */
export async function scheduleScanTick(analysisId: string): Promise<void> {
  const secret = process.env.CRON_SECRET?.trim();
  const origin =
    process.env.APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    getSiteOrigin();

  if (!secret || !origin) {
    scanWarn("SCAN", "scheduleScanTick: missing CRON_SECRET or APP_URL", {
      analysisId,
      hasSecret: Boolean(secret),
      hasOrigin: Boolean(origin),
    });
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
            tickScheduleError:
              "Missing CRON_SECRET or APP_URL — crawl ticks cannot continue.",
          },
        })
        .where(eq(websiteAnalyses.id, analysisId));
    } catch {
      /* ignore */
    }
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
      scanLog("SCAN", "Scheduled next tick", {
        analysisId,
        status: res.status,
      });
    } catch (err) {
      scanWarn("SCAN", "scheduleScanTick failed", {
        analysisId,
        error: err instanceof Error ? err.message : String(err),
      });
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
