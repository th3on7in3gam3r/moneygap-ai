import type { CategoryScores } from "@/db/schema";
import type {
  FindingSeverity,
  ModuleId,
  MoneyGapFinding,
} from "@/lib/analysis/engine/types";
import {
  EMPTY_CATEGORY_SCORES,
  MODULE_IDS,
} from "@/lib/analysis/engine/types";

const severityWeight: Record<FindingSeverity, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

const difficultyEase: Record<string, number> = {
  easy: 1,
  low: 1,
  simple: 1,
  medium: 0.65,
  moderate: 0.65,
  hard: 0.35,
  high: 0.35,
  difficult: 0.35,
};

function easeFromDifficulty(difficulty: string): number {
  const key = difficulty.trim().toLowerCase();
  for (const [k, v] of Object.entries(difficultyEase)) {
    if (key.includes(k)) return v;
  }
  return 0.55;
}

/** Recompute Opportunity Index™ from impact, confidence, ROI, inverse difficulty. */
export function computeOpportunityIndex(finding: MoneyGapFinding): number {
  const impact =
    finding.estimatedAnnualRevenue != null && finding.estimatedAnnualRevenue > 0
      ? Math.min(100, Math.log10(finding.estimatedAnnualRevenue + 1) * 20)
      : finding.priorityScore * 0.7;
  const confidence = finding.confidence;
  const roi = (clamp(finding.expectedRoi, 1, 5) / 5) * 100;
  const ease = easeFromDifficulty(finding.difficulty) * 100;

  return clamp(
    impact * 0.35 + confidence * 0.25 + roi * 0.25 + ease * 0.15,
  );
}

export function normalizeFindingScores(finding: MoneyGapFinding): MoneyGapFinding {
  const opportunityIndex = computeOpportunityIndex(finding);
  const severity = refineSeverity(finding.severity, opportunityIndex);
  const priorityScore = clamp(
    Math.round(opportunityIndex * 0.85 + severityWeight[severity] * 0.15),
  );
  return {
    ...finding,
    opportunityIndex,
    priorityScore,
    severity,
    expectedRoi: clamp(finding.expectedRoi, 1, 5),
  };
}

function refineSeverity(
  current: FindingSeverity,
  index: number,
): FindingSeverity {
  if (index >= 85) return "critical";
  if (index >= 70) return current === "critical" ? "critical" : "high";
  if (index >= 45) return current === "low" ? "medium" : current;
  return current === "critical" || current === "high" ? "medium" : current;
}

export function computeCategoryScores(
  findings: MoneyGapFinding[],
): CategoryScores {
  const scores = { ...EMPTY_CATEGORY_SCORES };
  for (const id of MODULE_IDS) {
    const items = findings.filter((f) => f.moduleId === id);
    if (items.length === 0) {
      scores[id] = 0;
      continue;
    }
    const avgIndex =
      items.reduce((s, f) => s + f.opportunityIndex, 0) / items.length;
    const volume = Math.min(25, items.length * 8);
    const sevBoost =
      items.reduce((s, f) => s + severityWeight[f.severity], 0) /
      items.length /
      4;
    scores[id] = clamp(avgIndex * 0.65 + volume + sevBoost);
  }
  return scores;
}

export function computeMoneyGapScore(
  findings: MoneyGapFinding[],
  categoryScores: CategoryScores,
): number {
  if (findings.length === 0) return 0;
  const categoryAvg =
    MODULE_IDS.reduce((s, id) => s + categoryScores[id], 0) / MODULE_IDS.length;
  const topIndexes = [...findings]
    .sort((a, b) => b.opportunityIndex - a.opportunityIndex)
    .slice(0, 8);
  const topAvg =
    topIndexes.reduce((s, f) => s + f.opportunityIndex, 0) / topIndexes.length;
  const countFactor = Math.min(20, findings.length * 1.5);
  return clamp(categoryAvg * 0.45 + topAvg * 0.4 + countFactor);
}

export function computeRevenueRollups(findings: MoneyGapFinding[]): {
  revenueAtRisk: number;
  capturePotential: number;
} {
  const revenueAtRisk = findings.reduce(
    (sum, o) => sum + (o.estimatedAnnualRevenue ?? 0),
    0,
  );
  return {
    revenueAtRisk,
    capturePotential: Math.round(revenueAtRisk * 0.65),
  };
}

export function buildExecutiveBrief(findings: MoneyGapFinding[]): {
  opportunitySummary: string;
  executiveBrief: string;
} {
  const sorted = [...findings].sort(
    (a, b) => b.opportunityIndex - a.opportunityIndex,
  );
  const top = sorted.slice(0, 3);
  if (top.length === 0) {
    return {
      opportunitySummary:
        "Review growth systems and re-run MoneyGap Engine™ when ready.",
      executiveBrief:
        "No high-confidence growth gaps were returned. Re-run the engine after updating the site, or expand crawl coverage.",
    };
  }

  const first = top[0]!;
  const opportunitySummary = `Start with “${first.title}” (${first.severity}) — then tackle the next highest Opportunity Index™ items.`;

  const lines = top.map(
    (f, i) =>
      `${i + 1}. ${f.title}: ${f.summary || f.whatsMissing} (Opportunity Index™ ${f.opportunityIndex}).`,
  );

  const executiveBrief = [
    `The biggest blockers to full growth potential center on ${top
      .map((f) => f.moduleId)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(", ")}.`,
    lines.join(" "),
    "Prioritize Quick Wins this week, then Medium Effort plays this month, keeping Long-Term Strategy on the quarterly roadmap. All figures are AI Estimates — strategic guidance, not guaranteed results.",
  ].join("\n\n");

  return { opportunitySummary, executiveBrief };
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number.isFinite(n) ? n : min)));
}

export function isModuleId(value: string): value is ModuleId {
  return (MODULE_IDS as readonly string[]).includes(value);
}
