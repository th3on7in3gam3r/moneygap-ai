import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/agency/audit";
import { requireAgencyPermission } from "@/lib/agency/workspace";
import { softChangePlan, type PlanId } from "@/lib/billing";

const schema = z.object({
  planId: z.enum([
    "free",
    "starter",
    "growth",
    "professional",
    "agency",
    "enterprise",
  ]),
  billingInterval: z.enum(["monthly", "annual"]).optional(),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await requireAgencyPermission("manageWorkspace");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const subscription = await softChangePlan({
    workspaceId: gate.ctx.workspace.id,
    planId: parsed.data.planId as PlanId,
    billingInterval: parsed.data.billingInterval,
  });

  await writeAuditLog({
    workspaceId: gate.ctx.workspace.id,
    actorUserId: gate.ctx.userId,
    action: "billing.plan_change",
    entityType: "workspace_subscription",
    entityId: subscription.id,
    meta: {
      planId: parsed.data.planId,
      billingInterval: parsed.data.billingInterval ?? subscription.billingInterval,
      note: "Soft plan switch (pre-Stripe)",
    },
  });

  return Response.json({
    subscription: {
      id: subscription.id,
      planId: subscription.planId,
      status: subscription.status,
      billingInterval: subscription.billingInterval,
    },
  });
}
