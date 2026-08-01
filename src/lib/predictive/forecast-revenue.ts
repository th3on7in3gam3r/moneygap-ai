import { scorePredictionConfidence } from "@/lib/predictive/confidence";
import type { PredictionDraft, PredictiveFeedContext } from "@/lib/predictive/types";

export function forecastRevenue(ctx: PredictiveFeedContext): PredictionDraft {
  const revenueGaps = ctx.openGaps.filter(
    (g) =>
      g.moduleId === "revenue" ||
      g.moduleId === "conversion" ||
      /revenue|pricing|checkout/i.test(g.category + g.title),
  );
  const atRisk = ctx.scores[0]?.revenueAtRisk ?? 0;
  const gapSum = revenueGaps.reduce(
    (n, g) => n + (g.estimatedAnnualRevenue ?? 0),
    0,
  );

  const evidence = [
    atRisk > 0 ? `Latest revenue at risk snapshot: $${atRisk.toLocaleString()}` : null,
    ...revenueGaps.slice(0, 3).map(
      (g) =>
        `Open: ${g.title}${g.estimatedAnnualRevenue ? ` (~$${g.estimatedAnnualRevenue.toLocaleString()} AI Estimate)` : ""}`,
    ),
    ...ctx.notes.slice(0, 1),
  ].filter(Boolean) as string[];

  if (!evidence.length) {
    evidence.push("No revenue-at-risk series yet — forecast from open gaps only.");
  }

  const prediction =
    revenueGaps.length > 0 || atRisk > 0
      ? `Over 30 days, uncaptured revenue pressure remains elevated while ${revenueGaps.length || "key"} revenue/conversion gap(s) stay open. Combined AI Estimate exposure near $${Math.max(atRisk, gapSum).toLocaleString()} annualized — not a guarantee.`
      : "Revenue outlook is quieter with few open monetization gaps; re-run analysis after major funnel changes. AI Estimate.";

  const horizon = "30d" as const;
  return {
    kind: "revenue",
    title: "Revenue outlook",
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
      revenueGaps[0]
        ? `Prioritize “${revenueGaps[0].title}” via Fix Path Chooser™ on the report.`
        : "Open Money Gaps and filter revenue/conversion modules.",
    impactEstimate: {
      labeled: "AI Estimate",
      summary: `Annualized exposure band uses snapshot + gap estimates (AI Estimate).`,
      revenueDelta: Math.max(atRisk, gapSum) || undefined,
    },
    websiteId: ctx.websiteId,
  };
}
