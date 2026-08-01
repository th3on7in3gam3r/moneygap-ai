import { scorePredictionConfidence } from "@/lib/predictive/confidence";
import type { PredictionDraft, PredictiveFeedContext } from "@/lib/predictive/types";

export function forecastCompetitive(ctx: PredictiveFeedContext): PredictionDraft {
  const evidence = [
    ...ctx.competitorNotes.slice(0, 4),
    ctx.competitorNotes.length
      ? `${ctx.competitorNotes.length} competitor signal note(s)`
      : "Competitor fingerprint history limited",
    ...ctx.notes.filter((n) => /competitor/i.test(n)).slice(0, 2),
  ];
  if (!evidence.length) {
    evidence.push("No competitor snapshots yet — movement forecast is cautious.");
  }

  const prediction =
    ctx.competitorNotes.length > 0
      ? "Over 30 days, competitor fingerprint changes may continue; watch for offer/trust/content shifts that widen strategic gaps. Full competitor monitoring remains future work — this is a soft movement signal. AI Estimate."
      : "Insufficient competitor snapshot depth for a strong movement call. Re-run Competitive Intelligence after Monitor cycles. AI Estimate.";

  const horizon = "30d" as const;
  return {
    kind: "competitive_movement",
    title: "Competitive movement",
    prediction,
    evidence,
    confidence: scorePredictionConfidence({
      evidenceCount: evidence.length,
      snapshotCount: Math.min(ctx.scores.length, ctx.competitorNotes.length),
      softFailNotes: ctx.notes.length,
      horizon,
    }),
    horizon,
    recommendedAction:
      "Open the latest report Competitive panel and note gaps vs peers.",
    impactEstimate: {
      labeled: "AI Estimate",
      summary: "Competitive pressure is qualitative until deeper monitoring ships.",
    },
    websiteId: ctx.websiteId,
  };
}
