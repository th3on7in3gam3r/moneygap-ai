import { scorePredictionConfidence } from "@/lib/predictive/confidence";
import type { PredictionDraft, PredictiveFeedContext } from "@/lib/predictive/types";

export function forecastOpportunity(ctx: PredictiveFeedContext): PredictionDraft {
  const top = ctx.openGaps.slice(0, 5);
  const evidence = top.map(
    (g) => `OI ${g.opportunityIndex}: ${g.title}`,
  );
  if (!evidence.length) {
    evidence.push("No open opportunities — run analysis to refresh the portfolio.");
  }

  const avgOi =
    top.length > 0
      ? Math.round(top.reduce((n, g) => n + g.opportunityIndex, 0) / top.length)
      : 0;

  const prediction =
    top.length > 0
      ? `Over 30 days, the top open portfolio (avg OI ~${avgOi}) remains the highest-leverage work queue unless items are completed or Monitor resolves them. AI Estimate.`
      : "Opportunity forecast is empty until open Money Gaps exist. AI Estimate.";

  const horizon = "30d" as const;
  return {
    kind: "opportunity",
    title: "Opportunity forecast",
    prediction,
    evidence,
    confidence: scorePredictionConfidence({
      evidenceCount: evidence.length,
      snapshotCount: ctx.scores.length,
      softFailNotes: ctx.notes.length,
      horizon,
    }),
    horizon,
    recommendedAction: top[0]
      ? `Work “${top[0].title}” in Execution Mode / Action Center.`
      : "Analyze a website to seed the opportunity portfolio.",
    impactEstimate: {
      labeled: "AI Estimate",
      summary: top[0]?.estimatedAnnualRevenue
        ? `Top gap AI Estimate ~$${top[0].estimatedAnnualRevenue.toLocaleString()}/yr.`
        : "Impact follows Opportunity Index™ ordering (AI Estimate).",
      revenueDelta: top[0]?.estimatedAnnualRevenue ?? undefined,
    },
    websiteId: ctx.websiteId,
    meta: { topOpportunityIds: top.map((g) => g.id) },
  };
}
