import type { ScoreResult } from "../types";

/**
 * Backlink APIs (Ahrefs/Moz/etc.) are not wired in v1.
 * Returns unavailable score with setup guidance — never fabricates DA.
 */
export function scoreBacklinks(_opts?: {
  referringDomains?: number | null;
}): ScoreResult {
  return {
    score: null,
    unavailableReason:
      "Backlink provider not connected. Connect an authority API to unlock Backlink Health™.",
    findings: [
      {
        category: "backlinks",
        title: "Backlink Intelligence™ setup required",
        problem: "No referring-domain or authority data source is configured.",
        businessImpact:
          "Cannot prioritize outreach or quantify authority gaps vs competitors.",
        whyItMatters:
          "Authority growth compounds SEO and AI discovery for MoneyGap.",
        estimatedOpportunity: null,
        estimateLabeled: "AI Estimate",
        confidence: 40,
        evidence: ["No BACKLINK_API_KEY / provider configured"],
        fixPath:
          "Connect a backlink provider, then re-run Self Optimization™ to score diversity, lost links, and outreach targets.",
        difficulty: "medium",
        estimatedTime: "2–4 hours setup",
        verificationSteps: [
          "Provider credentials set",
          "Backlink Health score populates on next scan",
        ],
      },
    ],
  };
}
