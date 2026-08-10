import { after } from "next/server";
import { z } from "zod";
import { authorizeCron } from "@/lib/cron/auth";
import { runPostCrawlAnalysis } from "@/lib/analysis/pipeline";

export const maxDuration = 300;

const bodySchema = z.object({
  analysisId: z.string().uuid(),
});

/**
 * Called by the Render crawl worker when page extracts are drained.
 * Runs MoneyGap Engine / report generation on the web process (OpenAI keys live here).
 */
export async function POST(req: Request) {
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
    void runPostCrawlAnalysis(analysisId).catch((err) => {
      console.error("scan complete / post-crawl failed", analysisId, err);
    });
  });

  return Response.json({ ok: true, analysisId, started: true });
}
