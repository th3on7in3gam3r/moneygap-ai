import { scorePredictionConfidence } from "@/lib/predictive/confidence";
import type { PredictionDraft, PredictiveFeedContext } from "@/lib/predictive/types";

export function detectMarketSignals(ctx: PredictiveFeedContext): PredictionDraft {
  const evidence = [
    ctx.industrySlug ? `Industry context: ${ctx.industrySlug}` : "Industry slug unknown",
    ctx.hubConnectedCount
      ? `${ctx.hubConnectedCount} Hub connection(s) available for richer signals later`
      : "Hub disconnected — signals are KG/gap soft notes only",
    ...ctx.openGaps.slice(0, 2).map((g) => `Pattern cue via gap: ${g.title}`),
    ...ctx.notes.slice(0, 2),
  ];

  const prediction = ctx.industrySlug
    ? `Market signal (soft): industry “${ctx.industrySlug}” peers often prioritize trust + capture gaps similar to your open portfolio. Use Knowledge Graph playbooks when prioritizing. AI Estimate.`
    : "Market signals are limited without industry classification — set industry on the site or re-run analysis. AI Estimate.";

  const horizon = "90d" as const;
  return {
    kind: "market_signal",
    title: "Market signal",
    prediction,
    evidence,
    confidence: scorePredictionConfidence({
      evidenceCount: evidence.length,
      snapshotCount: ctx.scores.length,
      softFailNotes: ctx.notes.length + (ctx.industrySlug ? 0 : 2),
      horizon,
    }),
    horizon,
    recommendedAction:
      "Open Knowledge Graph / industry playbooks and align Top 3 Today.",
    impactEstimate: {
      labeled: "AI Estimate",
      summary: "Market signals are qualitative soft cues (AI Estimate).",
    },
    websiteId: ctx.websiteId,
  };
}
