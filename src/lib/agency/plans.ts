/**
 * Compatibility shim — agency limits resolve from monetization catalog.
 * Prefer importing from `@/lib/billing/catalog` for new client-safe code.
 */
import {
  getPlanDefinition,
  resolvePlanId,
  type PlanId,
} from "@/lib/billing/catalog";

export type AgencyPlan = PlanId;

export type PlanLimits = {
  maxClients: number;
  maxSeats: number;
  reportsPerMonth: number;
  whiteLabel: boolean;
  label: string;
};

export function resolvePlan(plan: string): PlanId {
  return resolvePlanId(plan);
}

export function getPlanLimits(plan: string): PlanLimits {
  const def = getPlanDefinition(plan);
  return {
    label: def.name,
    maxClients: def.limits.maxClients,
    maxSeats: def.limits.maxSeats,
    reportsPerMonth: def.limits.reportsPerMonth,
    whiteLabel: def.features.includes("white_label_reports"),
  };
}

/** @deprecated Use PLAN_CATALOG from @/lib/billing/catalog */
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  starter: getPlanLimits("starter"),
  small_agency: getPlanLimits("agency"),
  growth_agency: getPlanLimits("agency"),
  enterprise: getPlanLimits("enterprise"),
  free: getPlanLimits("free"),
  growth: getPlanLimits("growth"),
  professional: getPlanLimits("professional"),
  agency: getPlanLimits("agency"),
};
