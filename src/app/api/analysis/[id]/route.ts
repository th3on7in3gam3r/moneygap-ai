import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
import {
  isStaleRunningAnalysis,
  resumeStuckAnalysis,
  failStalePreReportAnalysis,
} from "@/lib/analysis/pipeline";
import { ANALYSIS_STAGES } from "@/lib/analysis/stages";

export const maxDuration = 300;

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  let analysis = await db.query.websiteAnalyses.findFirst({
    where: and(eq(websiteAnalyses.id, id), eq(websiteAnalyses.userId, userId)),
    with: { website: true },
  });

  if (!analysis) {
    return Response.json({ error: "Analysis not found." }, { status: 404 });
  }

  const stale = isStaleRunningAnalysis({
    status: analysis.status,
    startedAt: analysis.startedAt,
    reportId: analysis.reportId,
  });

  // Serverless often dies mid Money Gap Engine — resume when polling detects a stale run.
  if (stale && analysis.reportId) {
    after(() => {
      void resumeStuckAnalysis(id).catch((err) => {
        console.error("Stuck analysis resume failed:", err);
      });
    });
  } else if (
    !analysis.reportId &&
    (analysis.status === "running" || analysis.status === "queued")
  ) {
    // Hung during crawl / Reading pages — fail after stale budget so UI unlocks.
    // Incremental profiles use a longer budget (see failStalePreReportAnalysis).
    const failedStale = await failStalePreReportAnalysis(id);
    if (failedStale.ok) {
      analysis = await db.query.websiteAnalyses.findFirst({
        where: and(eq(websiteAnalyses.id, id), eq(websiteAnalyses.userId, userId)),
        with: { website: true },
      });
      if (!analysis) {
        return Response.json({ error: "Analysis not found." }, { status: 404 });
      }
    }
  }

  const currentIndex = resolveAnalysisStageIndex(
    analysis.stage,
    analysis.progress ?? 0,
  );

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
    scanProfile: analysis.scanProfile,
    scanPhase: analysis.scanPhase,
    pagesDiscovered: analysis.pagesDiscovered ?? 0,
    pagesCompleted: analysis.pagesCompleted ?? 0,
    pagesFailed: analysis.pagesFailed ?? 0,
    estimatedRemainingMs: analysis.estimatedRemainingMs,
    scanMeta: analysis.scanMeta,
    currentUrl:
      analysis.scanMeta &&
      typeof (analysis.scanMeta as { currentUrl?: unknown }).currentUrl === "string"
        ? (analysis.scanMeta as { currentUrl: string }).currentUrl
        : null,
    tickScheduleError:
      analysis.scanMeta &&
      typeof (analysis.scanMeta as { tickScheduleError?: unknown })
        .tickScheduleError === "string"
        ? (analysis.scanMeta as { tickScheduleError: string }).tickScheduleError
        : null,
    scanStage:
      analysis.scanMeta &&
      typeof (analysis.scanMeta as { scanStage?: unknown }).scanStage === "string"
        ? (analysis.scanMeta as { scanStage: string }).scanStage
        : null,
    stages: ANALYSIS_STAGES.map((s, index) => {
      const done =
        analysis.status === "completed" ||
        (currentIndex >= 0 && index < currentIndex);
      const active =
        analysis.status === "failed"
          ? index === currentIndex
          : analysis.status === "queued"
            ? index === 0
            : analysis.status === "running" && index === currentIndex;

      return {
        id: s.id,
        label: s.label,
        done,
        active,
      };
    }),
  });
}

/**
 * Map DB stage label → checklist index. Custom Money Gap heartbeats
 * (e.g. "Running opportunity modules…") must not fall through to index 0
 * ("Connecting to website").
 */
function resolveAnalysisStageIndex(stage: string, progress: number): number {
  const byLabel = ANALYSIS_STAGES.findIndex((s) => s.label === stage);
  if (byLabel >= 0) return byLabel;

  const lower = stage.toLowerCase();
  if (
    lower.startsWith("reading page") ||
    lower.startsWith("reading pages") ||
    lower.includes("looking for sitemap") ||
    lower.includes("checking robots") ||
    lower.includes("building crawl queue") ||
    (lower.includes("found ") && lower.includes("pages"))
  ) {
    return ANALYSIS_STAGES.findIndex((s) => s.id === "reading");
  }
  if (
    lower.includes("opportunity module") ||
    lower.includes("scoring growth roadmap") ||
    lower.includes("crawlability") ||
    lower.includes("saving growth roadmap") ||
    lower.includes("growth roadmap")
  ) {
    return ANALYSIS_STAGES.findIndex((s) => s.id === "action_plans");
  }

  let best = 0;
  for (let i = 0; i < ANALYSIS_STAGES.length; i++) {
    if (ANALYSIS_STAGES[i]!.progress <= progress) best = i;
  }
  return best;
}
