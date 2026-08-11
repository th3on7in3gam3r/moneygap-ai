import { after } from "next/server";
import { z } from "zod";
import { authorizeCron } from "@/lib/cron/auth";
import { runPostCrawlAnalysis } from "@/lib/analysis/pipeline";
import { log } from "@/lib/observability/logger";

export const maxDuration = 300;

const bodySchema = z.object({
  analysisId: z.string().uuid(),
});

/**
 * Called by the Render crawl worker (or tick handoff) when page extracts are drained.
 * ACK immediately — MoneyGap Engine / report generation runs in after().
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

  after(() => {
    log("info", "POST_CRAWL_PROCESS_START", { analysisId });
    const processStarted = Date.now();
    void runPostCrawlAnalysis(analysisId)
      .then(() => {
        log("info", "POST_CRAWL_PROCESS_COMPLETE", {
          analysisId,
          processingDurationMs: Date.now() - processStarted,
        });
      })
      .catch((err) => {
        console.error("scan complete / post-crawl failed", analysisId, err);
      });
  });

  log("info", "POST_CRAWL_SCHEDULE_ACK", {
    analysisId,
    ackDurationMs: Date.now() - ackStarted,
    accepted: true,
    started: true,
  });

  return Response.json(
    { ok: true, analysisId, accepted: true, started: true },
    { status: 202 },
  );
}
