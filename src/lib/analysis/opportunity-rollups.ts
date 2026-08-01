import type { OpportunityFix } from "@/db/schema";
import type { MoneyGapEngineResult } from "@/lib/analysis/money-gap-engine";

export type OpportunityRollup = {
  moneyGapScore: number;
  revenueAtRisk: number;
  capturePotential: number;
  opportunitySummary: string;
  executiveBrief: string;
};

/**
 * Prefer orchestrator-computed rollups; fall back for older callers.
 */
export function computeOpportunityRollups(
  result: MoneyGapEngineResult,
): OpportunityRollup {
  if (
    typeof result.moneyGapScore === "number" &&
    typeof result.revenueAtRisk === "number"
  ) {
    return {
      moneyGapScore: result.moneyGapScore,
      revenueAtRisk: result.revenueAtRisk,
      capturePotential: result.capturePotential,
      opportunitySummary:
        result.opportunitySummary ||
        "Review the highest-priority missing opportunities and start with Quick Wins.",
      executiveBrief:
        result.executiveBrief ||
        result.opportunitySummary ||
        "Focus on the highest Opportunity Index™ findings first.",
    };
  }

  const opportunities = result.opportunities ?? [];
  const revenueAtRisk = opportunities.reduce(
    (sum, o) => sum + (o.estimatedAnnualRevenue ?? 0),
    0,
  );
  const capturePotential = Math.round(revenueAtRisk * 0.65);
  const avgPriority =
    opportunities.length > 0
      ? opportunities.reduce((s, o) => s + o.priorityScore, 0) /
        opportunities.length
      : 0;
  const countFactor = Math.min(30, opportunities.length * 4);
  const moneyGapScore = Math.max(
    0,
    Math.min(100, Math.round(avgPriority * 0.7 + countFactor)),
  );

  return {
    moneyGapScore,
    revenueAtRisk,
    capturePotential,
    opportunitySummary:
      result.opportunitySummary ||
      "Review the highest-priority missing opportunities and start with Quick Wins.",
    executiveBrief:
      result.executiveBrief ||
      result.opportunitySummary ||
      "Focus on the highest Opportunity Index™ findings first.",
  };
}

export function sortOpportunities<
  T extends {
    priorityScore: number;
    severity: string;
    opportunityIndex?: number;
  },
>(items: T[]): T[] {
  const severityRank: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return [...items].sort((a, b) => {
    const sev =
      (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
    if (sev !== 0) return sev;
    const ai = a.opportunityIndex ?? a.priorityScore;
    const bi = b.opportunityIndex ?? b.priorityScore;
    if (bi !== ai) return bi - ai;
    return b.priorityScore - a.priorityScore;
  });
}

export function normalizeFixes(fixes: OpportunityFix[]): OpportunityFix[] {
  const order = { quick_win: 0, medium: 1, long_term: 2 } as const;
  return [...fixes].sort((a, b) => (order[a.tier] ?? 9) - (order[b.tier] ?? 9));
}
