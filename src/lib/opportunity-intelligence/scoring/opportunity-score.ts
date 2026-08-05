import type { OpportunityScoreFactors } from "@/lib/opportunity-intelligence/types";

/**
 * Opportunity Score™ — additive proprietary score (0–100).
 * Does NOT modify Opportunity Index™ / MoneyGap Score™ formulas.
 */
export const OPPORTUNITY_SCORE_WEIGHTS = {
  businessValue: 0.2,
  revenuePotential: 0.18,
  searchDemand: 0.14,
  competition: 0.12, // inverted: lower competition → higher score
  implementationEffort: 0.12, // inverted: lower effort → higher score
  aiVisibility: 0.12,
  topicalAuthority: 0.12,
} as const;

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function computeOpportunityScore(factors: OpportunityScoreFactors): number {
  const w = OPPORTUNITY_SCORE_WEIGHTS;
  const raw =
    w.businessValue * clamp01(factors.businessValue) +
    w.revenuePotential * clamp01(factors.revenuePotential) +
    w.searchDemand * clamp01(factors.searchDemand) +
    w.competition * (1 - clamp01(factors.competition)) +
    w.implementationEffort * (1 - clamp01(factors.implementationEffort)) +
    w.aiVisibility * clamp01(factors.aiVisibility) +
    w.topicalAuthority * clamp01(factors.topicalAuthority);
  return Math.round(Math.max(0, Math.min(100, raw * 100)));
}

export function impactToValue(level: "high" | "medium" | "low"): number {
  if (level === "high") return 0.9;
  if (level === "low") return 0.35;
  return 0.6;
}

export function difficultyToEffort(difficulty: string): number {
  const d = difficulty.toLowerCase();
  if (d.includes("easy") || d.includes("quick") || d.includes("low")) return 0.25;
  if (d.includes("hard") || d.includes("complex") || d.includes("high")) return 0.85;
  return 0.5;
}
