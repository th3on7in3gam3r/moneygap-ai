import { scorePredictionConfidence } from "@/lib/predictive/confidence";
import type { PredictionDraft, PredictiveFeedContext } from "@/lib/predictive/types";

export function forecastGrowth(ctx: PredictiveFeedContext): PredictionDraft {
  const evidence = [
    ...ctx.scores.slice(0, 3).map(
      (s) => `Snapshot score ${s.moneyGapScore} (${s.createdAt.toISOString().slice(0, 10)})`,
    ),
    ...ctx.notes.slice(0, 2),
  ];
  if (!evidence.length) evidence.push("Limited history — cautious growth outlook.");

  const trend = ctx.scoreTrend;
  const prediction =
    trend == null
      ? "With thin score history, expect MoneyGap Score™ to stay near current levels over 30 days unless top gaps close. AI Estimate."
      : trend > 0
        ? `Score has risen ~${trend} pts across recent snapshots — uncaptured opportunity may keep climbing over 30 days if gaps stay open. AI Estimate.`
        : `Score has improved (dropped ~${Math.abs(trend)} pts of risk) recently — sustaining that requires closing remaining high-OI gaps within 30 days. AI Estimate.`;

  const horizon = "30d" as const;
  const confidence = scorePredictionConfidence({
    evidenceCount: evidence.length,
    snapshotCount: ctx.scores.length,
    softFailNotes: ctx.notes.length,
    horizon,
  });

  return {
    kind: "growth",
    title: "Growth trajectory",
    prediction,
    evidence,
    confidence,
    horizon,
    recommendedAction:
      "Review Top 3 Today and close the highest Opportunity Index™ gap this week.",
    impactEstimate: {
      labeled: "AI Estimate",
      summary:
        trend == null
          ? "Insufficient history for a numeric score delta."
          : `Projected score movement band ~${Math.round(Math.abs(trend) / 2)}–${Math.abs(trend)} pts (AI Estimate).`,
      scoreDelta: trend == null ? undefined : Math.round(trend / 2),
    },
    websiteId: ctx.websiteId,
  };
}
