import { eq } from "drizzle-orm";
import { db } from "@/db";
import { billingPlans } from "@/db/schema";
import { PLAN_CATALOG, resolvePlanId } from "@/lib/billing/catalog";

export {
  PLAN_CATALOG,
  resolvePlanId,
  getPlanDefinition,
  blueprintPersonaForPlan,
  type PlanId,
  type FeatureKey,
  type PlanDefinition,
  type PlanLimitsJson,
} from "@/lib/billing/catalog";

export async function ensureBillingPlansSeeded() {
  for (const p of PLAN_CATALOG) {
    const existing = await db.query.billingPlans.findFirst({
      where: eq(billingPlans.id, p.id),
    });
    if (existing) {
      await db
        .update(billingPlans)
        .set({
          name: p.name,
          description: p.description,
          monthlyPriceCents: p.monthlyPriceCents,
          annualPriceCents: p.annualPriceCents,
          sortOrder: p.sortOrder,
          active: true,
          limits: p.limits,
          features: p.features,
        })
        .where(eq(billingPlans.id, p.id));
    } else {
      await db.insert(billingPlans).values({
        id: p.id,
        name: p.name,
        description: p.description,
        monthlyPriceCents: p.monthlyPriceCents,
        annualPriceCents: p.annualPriceCents,
        sortOrder: p.sortOrder,
        active: true,
        limits: p.limits,
        features: p.features,
      });
    }
  }
}

export async function listBillingPlans() {
  await ensureBillingPlansSeeded();
  return db.query.billingPlans.findMany({
    where: eq(billingPlans.active, true),
  });
}

export async function getPlan(planId: string) {
  await ensureBillingPlansSeeded();
  const id = resolvePlanId(planId);
  const row = await db.query.billingPlans.findFirst({
    where: eq(billingPlans.id, id),
  });
  return row ?? null;
}
