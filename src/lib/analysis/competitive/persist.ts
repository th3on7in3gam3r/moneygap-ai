import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { competitors, reports } from "@/db/schema";
import { runCompetitiveOrchestrator } from "@/lib/analysis/competitive/orchestrator";
import type { CompetitiveContext } from "@/lib/analysis/competitive/types";
import {
  COMPETITIVE_ENGINE_ERROR,
  MISSING_KEYS_ERROR,
} from "@/lib/analysis/stages";

export async function persistCompetitiveIntelligence(input: {
  analysisId: string;
  reportId: string;
  websiteId: string;
  ctx: CompetitiveContext;
  hooks?: {
    onDiscoverDone?: () => Promise<void> | void;
    onProfileStart?: () => Promise<void> | void;
    onAnalyzeStart?: () => Promise<void> | void;
  };
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const result = await runCompetitiveOrchestrator(input.ctx, input.hooks);

    await db
      .delete(competitors)
      .where(
        and(
          eq(competitors.reportId, input.reportId),
          eq(competitors.analysisId, input.analysisId),
        ),
      );

    if (result.competitors.length > 0) {
      await db.insert(competitors).values(
        result.competitors.map((c, index) => ({
          websiteId: input.websiteId,
          reportId: input.reportId,
          analysisId: input.analysisId,
          name: c.name,
          domain: c.domain,
          url: c.url,
          businessSummary: c.businessSummary,
          industry: c.industry,
          targetAudience: c.targetAudience,
          estimatedCompanySize: c.estimatedCompanySize,
          profile: c.profile,
          corpusExcerpt: c.corpus.slice(0, 8000) || null,
          sortOrder: index,
          status: c.status,
        })),
      );
    }

    const existing = await db.query.reports.findFirst({
      where: eq(reports.id, input.reportId),
      columns: { categoryScores: true },
    });

    const categoryScores = {
      revenue: existing?.categoryScores?.revenue ?? 0,
      authority: existing?.categoryScores?.authority ?? 0,
      seo: existing?.categoryScores?.seo ?? 0,
      content: existing?.categoryScores?.content ?? 0,
      trust: existing?.categoryScores?.trust ?? 0,
      conversion: existing?.categoryScores?.conversion ?? 0,
      marketing: existing?.categoryScores?.marketing ?? 0,
      automation: existing?.categoryScores?.automation ?? 0,
      customer: existing?.categoryScores?.customer ?? 0,
      ai: existing?.categoryScores?.ai ?? 0,
      competitive: result.competitiveScore,
    };

    await db
      .update(reports)
      .set({
        competitiveBrief: result.competitiveBrief,
        competitiveAnalysis: result.competitiveAnalysis,
        categoryScores,
        competitiveEngineStatus: "completed",
        competitiveEngineError: null,
      })
      .where(eq(reports.id, input.reportId));

    return { ok: true };
  } catch (err) {
    console.error("persistCompetitiveIntelligence:", err);
    const message =
      err instanceof Error &&
      (err.message === COMPETITIVE_ENGINE_ERROR ||
        err.message === MISSING_KEYS_ERROR)
        ? err.message
        : COMPETITIVE_ENGINE_ERROR;

    await db
      .update(reports)
      .set({
        competitiveEngineStatus: "failed",
        competitiveEngineError: message,
      })
      .where(eq(reports.id, input.reportId));

    return { ok: false, error: message };
  }
}
