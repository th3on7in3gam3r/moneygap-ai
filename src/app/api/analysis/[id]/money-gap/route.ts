import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
import { runMoneyGapEngineOnly } from "@/lib/analysis/pipeline";

export const maxDuration = 300;

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const analysis = await db.query.websiteAnalyses.findFirst({
    where: and(eq(websiteAnalyses.id, id), eq(websiteAnalyses.userId, userId)),
  });

  if (!analysis) {
    return Response.json({ error: "Analysis not found." }, { status: 404 });
  }

  const { requireFeatureAndUsage, upgradeResponse, recordUsage } = await import(
    "@/lib/billing"
  );
  const gate = await requireFeatureAndUsage({
    workspaceId: analysis.workspaceId,
    feature: "moneygap_engine",
    usageType: "website_analysis",
  });
  if (!gate.ok) return upgradeResponse(gate);

  if (!analysis.reportId) {
    return Response.json(
      { error: "Finish the website analysis before running the Money Gap Engine." },
      { status: 400 },
    );
  }

  // Allow retry when a prior run left status=running mid Money Gap Engine.
  if (analysis.status !== "completed" && analysis.status !== "running" && analysis.status !== "failed") {
    return Response.json(
      { error: "Finish the website analysis before running the Money Gap Engine." },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        error:
          "Analysis requires FIRECRAWL_API_KEY and OPENAI_API_KEY. Add them to your environment and try again.",
      },
      { status: 400 },
    );
  }

  await recordUsage({
    workspaceId: analysis.workspaceId,
    userId: analysis.userId,
    type: "website_analysis",
    meta: { analysisId: id, kind: "money_gap_retry" },
  });

  after(() => {
    void runMoneyGapEngineOnly(id).catch((err) => {
      console.error("Money Gap re-run failed:", err);
    });
  });

  return Response.json({
    analysisId: id,
    reportId: analysis.reportId,
    status: "running",
  });
}
