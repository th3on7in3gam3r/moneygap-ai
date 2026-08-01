import type { ImplementationPlanJson, TechStackProfile } from "@/db/schema";

export function summarizeRisk(plan: ImplementationPlanJson): string {
  const parts = [
    `Risk: ${plan.riskLevel}`,
    plan.riskSummary,
    plan.rollbackSteps.length
      ? `Rollback: ${plan.rollbackSteps.slice(0, 2).join("; ")}`
      : null,
  ].filter(Boolean);
  return parts.join(" — ");
}

export function inferRiskLevel(input: {
  filesCreate: number;
  filesUpdate: number;
  stack?: TechStackProfile | null;
}): "low" | "medium" | "high" {
  const total = input.filesCreate + input.filesUpdate;
  if (total >= 8 || (!input.stack?.frontend && !input.stack?.backend)) return "high";
  if (total >= 4) return "medium";
  return "low";
}
