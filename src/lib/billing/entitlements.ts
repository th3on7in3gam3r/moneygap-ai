import type { FeatureKey, PlanId } from "@/lib/billing/catalog";
import { getPlanDefinition, resolvePlanId } from "@/lib/billing/catalog";

export const ALL_FEATURES: FeatureKey[] = [
  "moneygap_engine",
  "ai_advisor",
  "action_center",
  "monitor",
  "competitor_intelligence",
  "white_label_reports",
  "agency_workspace",
  "api_access",
  "team_members",
  "scheduled_reports",
];

export function planHasFeature(planId: string, feature: FeatureKey): boolean {
  const plan = getPlanDefinition(planId);
  return plan.features.includes(feature);
}

export function getWorkspaceEntitlements(planId: string): {
  planId: PlanId;
  features: FeatureKey[];
  limits: ReturnType<typeof getPlanDefinition>["limits"];
} {
  const plan = getPlanDefinition(planId);
  return {
    planId: resolvePlanId(planId),
    features: plan.features,
    limits: plan.limits,
  };
}

export function suggestedPlanForFeature(feature: FeatureKey): PlanId {
  for (const id of [
    "starter",
    "growth",
    "professional",
    "agency",
    "enterprise",
  ] as PlanId[]) {
    if (planHasFeature(id, feature)) return id;
  }
  return "growth";
}
