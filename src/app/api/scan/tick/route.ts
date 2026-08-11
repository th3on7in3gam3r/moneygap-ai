import { after } from "next/server";
import { z } from "zod";
import { authorizeCron } from "@/lib/cron/auth";
import { processScanTick } from "@/lib/scan/batch";
import { isWorkerScanExecution } from "@/lib/scan/execution";
import { claimScanTick, releaseTickClaim } from "@/lib/scan/tick-claim";
import { log } from "@/lib/observability/logger";

export const maxDuration = 60;

const bodySchema = z.object({
  analysisId: z.string().uuid(),
});

/**
 * Crawl continuation ACK endpoint.
 * Authenticates, claims ownership, returns 202 immediately.
 * Heavy work (Apify poll / page extract / post-crawl) runs in after().
 */
export async function POST(req: Request) {
  const ackStarted = Date.now();
  if (!authorizeCron(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "analysisId required" }, { status: 400 });
  }

  const { analysisId } = parsed.data;
  const workerEnabled = isWorkerScanExecution();

  const { db } = await import("@/db");
  const { websiteAnalyses } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const { isV3AnalysisMeta } = await import("@/lib/scan-engine/status");
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: { scanMeta: true },
  });
  if (isV3AnalysisMeta(analysis?.scanMeta)) {
    log("info", "TICK_SKIP_V3", { analysisId });
    return Response.json({
      accepted: false,
      reason: "scan_engine_v3",
      analysisId,
      ackDurationMs: Date.now() - ackStarted,
    });
  }

  const claim = await claimScanTick(analysisId);
  if (!claim.claimed) {
    log("info", "TICK_SCHEDULE_ACK", {
      analysisId,
      accepted: false,
      reason: claim.reason,
      ackDurationMs: Date.now() - ackStarted,
      workerEnabled,
      executionMode: workerEnabled ? "worker" : "ticks",
    });
    return Response.json(
      {
        ok: true,
        accepted: false,
        reason: claim.reason,
        analysisId,
      },
      { status: 202 },
    );
  }

  after(() => {
    const processStarted = Date.now();
    log("info", "TICK_PROCESS_START", {
      analysisId,
      claimResult: claim.reason,
      workerEnabled,
      executionMode: workerEnabled ? "worker" : "ticks",
    });
    void processScanTick(analysisId)
      .then((result) => {
        log("info", "TICK_PROCESS_COMPLETE", {
          analysisId,
          processingDurationMs: Date.now() - processStarted,
          done: result.done,
          processed: result.processed,
          claimResult: claim.reason,
          workerEnabled,
          executionMode: workerEnabled ? "worker" : "ticks",
        });
      })
      .catch(async (err) => {
        console.error("scan tick process error", analysisId, err);
        await releaseTickClaim(analysisId, {
          tickProcessError:
            err instanceof Error ? err.message : String(err),
        });
      });
  });

  log("info", "TICK_SCHEDULE_ACK", {
    analysisId,
    accepted: true,
    reason: "claimed",
    ackDurationMs: Date.now() - ackStarted,
    workerEnabled,
    executionMode: workerEnabled ? "worker" : "ticks",
  });

  return Response.json(
    {
      ok: true,
      accepted: true,
      started: true,
      analysisId,
    },
    { status: 202 },
  );
}
