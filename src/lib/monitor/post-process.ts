import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  analysisComparisons,
  websiteAnalyses,
  websites,
  workspaceMembers,
} from "@/db/schema";
import { compareReports } from "@/lib/monitor/compare";
import { writeScoreSnapshot } from "@/lib/monitor/snapshot";
import { resolveGapsNoLongerDetected } from "@/lib/monitor/resolve";
import { notifyFromComparison } from "@/lib/monitor/notify";
import { buildGrowthBrief, shouldGenerateBrief } from "@/lib/monitor/brief";
import { writeCompetitorSnapshots } from "@/lib/monitor/competitor-snapshot";

/**
 * Soft-fail post-process after Money Gap + Competitive complete.
 * snapshot → compare → lifecycle resolve → notifications → optional brief + competitor snapshots
 */
export async function runMonitorPostProcess(input: {
  websiteId: string;
  reportId: string;
  workspaceId: string;
  analysisId?: string;
}) {
  try {
    await writeScoreSnapshot({
      websiteId: input.websiteId,
      reportId: input.reportId,
    });

    try {
      await writeCompetitorSnapshots({
        websiteId: input.websiteId,
        reportId: input.reportId,
      });
    } catch (err) {
      console.error("competitorSnapshots soft-fail:", err);
    }

    const comparison = await compareReports({
      websiteId: input.websiteId,
      currentReportId: input.reportId,
    });
    if (!comparison) return { ok: true as const };

    const [comparisonRow] = await db
      .insert(analysisComparisons)
      .values({
        websiteId: input.websiteId,
        previousReportId: comparison.previousReportId,
        currentReportId: input.reportId,
        scoreDelta: comparison.scoreDelta,
        summary: comparison.summary,
        changes: comparison.changes,
      })
      .returning();

    const { resolvedCount } = await resolveGapsNoLongerDetected({
      previousReportId: comparison.previousReportId,
      currentReportId: input.reportId,
      changes: comparison.changes,
    });

    const members = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.workspaceId, input.workspaceId),
    });
    const site = await db.query.websites.findFirst({
      where: eq(websites.id, input.websiteId),
    });

    await notifyFromComparison({
      userIds: members.map((m) => m.userId),
      workspaceId: input.workspaceId,
      websiteName: site?.name ?? site?.domain ?? "Website",
      reportId: input.reportId,
      scoreDelta: comparison.scoreDelta,
      changes: comparison.changes,
      resolvedCount,
    });

    if (
      await shouldGenerateBrief(input.websiteId, input.workspaceId)
    ) {
      await buildGrowthBrief({
        workspaceId: input.workspaceId,
        websiteId: input.websiteId,
        websiteName: site?.name ?? site?.domain ?? "Website",
        comparisonId: comparisonRow.id,
      });
    }

    try {
      const { runContinuousOptimizationPass } = await import(
        "@/lib/automation/optimize"
      );
      const { moneyGapOpportunities } = await import("@/db/schema");
      const titles = (comparison.changes?.newOpportunities ?? []).map(
        (o) => o.title,
      );
      let newOpportunityIds: string[] = [];
      if (titles.length > 0) {
        const opps = await db.query.moneyGapOpportunities.findMany({
          where: eq(moneyGapOpportunities.reportId, input.reportId),
        });
        newOpportunityIds = opps
          .filter((o) => titles.includes(o.title))
          .map((o) => o.id);
      }
      await runContinuousOptimizationPass({
        workspaceId: input.workspaceId,
        reportId: input.reportId,
        newOpportunityIds,
        regressedOpportunityIds: [],
      });
    } catch (err) {
      console.error("automation optimize soft-fail:", err);
    }

    try {
      const { isPredictiveIntelEnabled, generateWorkspacePredictions, syncPredictiveAlerts } =
        await import("@/lib/predictive");
      if (isPredictiveIntelEnabled()) {
        await generateWorkspacePredictions(input.workspaceId);
        await syncPredictiveAlerts(input.workspaceId);
      }
    } catch (err) {
      console.error("predictive intel soft-fail:", err);
    }

    return { ok: true as const, comparisonId: comparisonRow.id };
  } catch (err) {
    console.error("runMonitorPostProcess soft-fail:", err);
    return { ok: false as const, error: String(err) };
  }
}

export async function runMonitorPostProcessForAnalysis(analysisId: string) {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
  });
  if (!analysis?.reportId) return { ok: false as const, error: "No report" };
  return runMonitorPostProcess({
    websiteId: analysis.websiteId,
    reportId: analysis.reportId,
    workspaceId: analysis.workspaceId,
    analysisId,
  });
}
