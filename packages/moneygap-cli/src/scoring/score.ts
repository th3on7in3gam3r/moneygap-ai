import type { Category, CategoryScores, Finding, Severity } from "../types/index.js";

const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: 18,
  high: 10,
  medium: 5,
  low: 2,
  info: 0,
};

const DEFAULT_WEIGHTS: Record<Category, number> = {
  seo: 1,
  aeo: 1,
  performance: 1,
  accessibility: 1,
  trust: 1,
  growth: 1,
  aiReadiness: 1,
};

export function computeCategoryScores(
  findings: Finding[],
  weights?: Partial<Record<Category, number>>,
): { categoryScores: CategoryScores; overallScore: number } {
  const categories = Object.keys(DEFAULT_WEIGHTS) as Category[];
  const categoryScores = {} as CategoryScores;

  for (const cat of categories) {
    const catFindings = findings.filter((f) => f.category === cat);
    let score = 100;
    for (const f of catFindings) {
      score -= SEVERITY_PENALTY[f.severity];
    }
    categoryScores[cat] = Math.max(0, Math.min(100, Math.round(score)));
  }

  const w = { ...DEFAULT_WEIGHTS, ...weights };
  let sum = 0;
  let totalW = 0;
  for (const cat of categories) {
    sum += categoryScores[cat] * (w[cat] ?? 1);
    totalW += w[cat] ?? 1;
  }
  const overallScore = totalW > 0 ? Math.round(sum / totalW) : 0;

  return { categoryScores, overallScore };
}

export function executiveSummary(
  overall: number,
  findings: Finding[],
): string {
  const high = findings.filter(
    (f) => f.severity === "critical" || f.severity === "high",
  ).length;
  if (overall >= 90 && high === 0) {
    return "Strong pre-deploy posture. Monitor remaining low/medium findings before launch.";
  }
  if (overall >= 75) {
    return `Solid baseline with ${high} high-priority growth/SEO opportunities to close before launch.`;
  }
  if (overall >= 55) {
    return `Notable gaps across visibility or conversion. Address high-severity findings before shipping.`;
  }
  return `Significant launch risk signals detected. Prioritize critical/high findings before deployment.`;
}
