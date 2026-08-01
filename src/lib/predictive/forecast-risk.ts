import { scorePredictionConfidence } from "@/lib/predictive/confidence";
import type { PredictionDraft, PredictiveFeedContext } from "@/lib/predictive/types";

/** Business / market risk outlook — not Phase 16 implementation Risk Intelligence™. */
export function forecastBusinessRisk(ctx: PredictiveFeedContext): PredictionDraft {
  const risky = ctx.openGaps.filter(
    (g) =>
      g.severity === "critical" ||
      g.severity === "high" ||
      g.moduleId === "trust" ||
      /trust|security|auth|review|testimonial/i.test(g.title),
  );

  const evidence = [
    ...risky.slice(0, 4).map(
      (g) => `${g.severity.toUpperCase()}: ${g.title} (OI ${g.opportunityIndex})`,
    ),
    ...ctx.notes.slice(0, 2),
  ];
  if (!evidence.length) {
    evidence.push("No high-severity open gaps — residual business risk looks moderate.");
  }

  const prediction =
    risky.length > 0
      ? `Over 7–30 days, ${risky.length} high-severity or trust-adjacent open gap(s) elevate conversion and credibility risk if left unaddressed. Distinct from implementation Risk Intelligence™. AI Estimate.`
      : "Business risk outlook is calmer with few high-severity open gaps; keep Monitor alerts on. AI Estimate.";

  const horizon = "7d" as const;
  return {
    kind: "business_risk",
    title: "Business risk outlook",
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
      risky[0]
        ? `Mitigate “${risky[0].title}” first — Trust / Fix Path on the report.`
        : "Scan Confidence Center™ for low-confidence items.",
    impactEstimate: {
      labeled: "AI Estimate",
      summary: "Risk is directional from severity and trust gaps (AI Estimate).",
    },
    websiteId: ctx.websiteId,
  };
}
