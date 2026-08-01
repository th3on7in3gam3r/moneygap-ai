import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext, requireAgencyPermission } from "@/lib/agency/workspace";
import {
  getPlanDefinition,
  getWorkspaceEntitlements,
  getWorkspaceSubscription,
  getCurrentPeriodUsage,
} from "@/lib/billing";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await requireAgencyPermission("viewBilling");
  if (!gate.ok) {
    // Fall back: any member can view their own workspace subscription summary
    try {
      const ctx = await loadAgencyContext();
      return Response.json(await buildPayload(ctx.workspace.id));
    } catch {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return Response.json(await buildPayload(gate.ctx.workspace.id));
}

async function buildPayload(workspaceId: string) {
  const subscription = await getWorkspaceSubscription(workspaceId);
  const plan = getPlanDefinition(subscription.planId);
  const entitlements = getWorkspaceEntitlements(subscription.planId);
  const usage = await getCurrentPeriodUsage(workspaceId);

  return {
    subscription: {
      id: subscription.id,
      planId: subscription.planId,
      status: subscription.status,
      billingInterval: subscription.billingInterval,
      currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      stripeCustomerId: subscription.stripeCustomerId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
    },
    plan: {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      monthlyPriceCents: plan.monthlyPriceCents,
      annualPriceCents: plan.annualPriceCents,
      limits: plan.limits,
      features: plan.features,
    },
    entitlements,
    usage,
  };
}
