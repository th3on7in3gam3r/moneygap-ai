import { crawlCompetitorsWithConcurrency } from "@/lib/analysis/competitive/crawl";
import { analyzeCompetitiveLandscape } from "@/lib/analysis/competitive/analyze";
import { discoverCompetitors } from "@/lib/analysis/competitive/discover";
import { profileCompetitorsWithConcurrency } from "@/lib/analysis/competitive/profile";
import type {
  CompetitiveContext,
  CompetitiveOrchestratorResult,
} from "@/lib/analysis/competitive/types";
import {
  COMPETITIVE_ENGINE_ERROR,
  MISSING_KEYS_ERROR,
} from "@/lib/analysis/stages";

/**
 * Competitive Intelligence™ orchestrator:
 * discover → crawl → profile → strategic analyze
 */
export async function runCompetitiveOrchestrator(
  ctx: CompetitiveContext,
  hooks?: {
    onDiscoverDone?: () => Promise<void> | void;
    onProfileStart?: () => Promise<void> | void;
    onAnalyzeStart?: () => Promise<void> | void;
  },
): Promise<CompetitiveOrchestratorResult> {
  if (!process.env.OPENAI_API_KEY || !process.env.FIRECRAWL_API_KEY) {
    throw new Error(MISSING_KEYS_ERROR);
  }

  try {
    const discovered = await discoverCompetitors(ctx);
    await hooks?.onDiscoverDone?.();

    const crawled = await crawlCompetitorsWithConcurrency(discovered, 2);
    const crawledOk = crawled.filter((c) => c.crawlOk);
    if (crawledOk.length === 0) {
      throw new Error(COMPETITIVE_ENGINE_ERROR);
    }

    await hooks?.onProfileStart?.();
    const profiled = await profileCompetitorsWithConcurrency(crawled, 2);
    const withProfiles = profiled.filter((c) => c.profile);
    if (withProfiles.length === 0) {
      throw new Error(COMPETITIVE_ENGINE_ERROR);
    }

    await hooks?.onAnalyzeStart?.();
    const analysis = await analyzeCompetitiveLandscape({
      ctx,
      competitors: profiled,
    });

    return {
      competitiveBrief: analysis.competitiveBrief,
      competitiveAnalysis: analysis.competitiveAnalysis,
      competitors: profiled,
      competitiveScore: analysis.competitiveScore,
    };
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message === MISSING_KEYS_ERROR ||
        err.message === COMPETITIVE_ENGINE_ERROR)
    ) {
      throw err;
    }
    console.error("Competitive Orchestrator error:", err);
    throw new Error(COMPETITIVE_ENGINE_ERROR);
  }
}
