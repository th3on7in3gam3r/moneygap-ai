import { scorePredictionConfidence } from "@/lib/predictive/confidence";
import type { PredictionDraft, PredictiveFeedContext } from "@/lib/predictive/types";

export function forecastSeo(ctx: PredictiveFeedContext): PredictionDraft {
  const seoGaps = ctx.openGaps.filter(
    (g) =>
      g.moduleId === "seo" ||
      g.moduleId === "authority" ||
      /seo|content|discover|organic/i.test(g.category + g.title),
  );

  const evidence = [
    ...seoGaps.slice(0, 4).map((g) => `Open discovery gap: ${g.title}`),
    ctx.scores.length
      ? `${ctx.scores.length} score snapshot(s) available for trend context`
      : "No score history for SEO category deltas yet",
    ...ctx.notes.slice(0, 1),
  ];

  const prediction =
    seoGaps.length > 0
      ? `Over 90 days, discovery/visibility gaps (${seoGaps.length} open) likely continue to constrain Visibility → Traffic unless content/authority work ships. Framed as growth-chain impact — not a rank tracker. AI Estimate.`
      : "Few open SEO/authority gaps detected; watch Monitor re-analysis for new discovery leaks. AI Estimate.";

  const horizon = "90d" as const;
  return {
    kind: "seo_trend",
    title: "SEO / discovery trend",
    prediction,
    evidence,
    confidence: scorePredictionConfidence({
      evidenceCount: evidence.length,
      snapshotCount: ctx.scores.length,
      softFailNotes: ctx.notes.length,
      horizon,
    }),
    horizon,
    recommendedAction:
      seoGaps[0]
        ? `Address “${seoGaps[0].title}” with Action Center or content Fix Paths.`
        : "Schedule Monitor re-analysis to refresh discovery signals.",
    impactEstimate: {
      labeled: "AI Estimate",
      summary: "Traffic/visibility impact is directional only (AI Estimate).",
    },
    websiteId: ctx.websiteId,
  };
}
