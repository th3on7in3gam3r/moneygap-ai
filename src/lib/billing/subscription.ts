import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceSubscriptions, workspaces } from "@/db/schema";
import { ensureBillingPlansSeeded, resolvePlanId, type PlanId } from "@/lib/billing/plans";

export async function getWorkspaceSubscription(workspaceId: string) {
  await ensureBillingPlansSeeded();
  let sub = await db.query.workspaceSubscriptions.findFirst({
    where: eq(workspaceSubscriptions.workspaceId, workspaceId),
  });

  if (!sub) {
    const ws = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });
    const planId = resolvePlanId(ws?.plan ?? "free");
    const now = new Date();
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const [created] = await db
      .insert(workspaceSubscriptions)
      .values({
        workspaceId,
        planId,
        status: "active",
        billingInterval: "monthly",
        stripeCustomerId: ws?.stripeCustomerId ?? null,
        stripeSubscriptionId: ws?.stripeSubscriptionId ?? null,
        currentPeriodStart: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
        ),
        currentPeriodEnd: periodEnd,
      })
      .returning();
    sub = created;
  }

  return sub;
}

export async function softChangePlan(input: {
  workspaceId: string;
  planId: PlanId;
  billingInterval?: "monthly" | "annual";
}) {
  await ensureBillingPlansSeeded();
  const planId = resolvePlanId(input.planId);
  const existing = await getWorkspaceSubscription(input.workspaceId);

  const [sub] = await db
    .update(workspaceSubscriptions)
    .set({
      planId,
      billingInterval: input.billingInterval ?? existing.billingInterval,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(workspaceSubscriptions.id, existing.id))
    .returning();

  await db
    .update(workspaces)
    .set({ plan: planId })
    .where(eq(workspaces.id, input.workspaceId));

  // Agency workspace type when on agency/enterprise plans
  if (planId === "agency" || planId === "enterprise") {
    await db
      .update(workspaces)
      .set({ type: planId === "enterprise" ? "enterprise" : "agency" })
      .where(eq(workspaces.id, input.workspaceId));
  }

  return sub;
}
