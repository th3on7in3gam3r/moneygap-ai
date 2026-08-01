import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
import { ANALYSIS_STAGES } from "@/lib/analysis/stages";

export async function GET(
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
    with: { website: true },
  });

  if (!analysis) {
    return Response.json({ error: "Analysis not found." }, { status: 404 });
  }

  const stageLabels = ANALYSIS_STAGES.map((s) => s.label);
  const currentIndex = stageLabels.findIndex((label) => label === analysis.stage);

  return Response.json({
    id: analysis.id,
    url: analysis.url,
    domain: analysis.website.domain,
    status: analysis.status,
    stage: analysis.stage,
    progress: analysis.progress,
    error: analysis.error,
    reportId: analysis.reportId,
    startedAt: analysis.startedAt,
    completedAt: analysis.completedAt,
    stages: ANALYSIS_STAGES.map((s, index) => {
      const done =
        analysis.status === "completed" ||
        (currentIndex >= 0 && index < currentIndex);
      const active =
        analysis.status === "failed"
          ? analysis.stage === s.label || (currentIndex === -1 && index === 0)
          : analysis.status === "queued"
            ? index === 0
            : analysis.status === "running" &&
              (analysis.stage === s.label || (currentIndex === -1 && index === 0));

      return {
        id: s.id,
        label: s.label,
        done,
        active,
      };
    }),
  });
}
