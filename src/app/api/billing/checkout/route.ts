import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  createCheckoutSession,
  getWorkspaceSubscription,
  isStripeConfigured,
  resolvePlanId,
  type PlanId,
} from "@/lib/billing";
import { trackProductMetric } from "@/lib/observability/metrics";

const bodySchema = z.object({
  planId: z.string(),
  billingInterval: z.enum(["monthly", "annual"]).default("monthly"),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return Response.json(
      {
        error: "Stripe is not configured. Soft plan switching remains available.",
        code: "stripe_not_configured",
      },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const planId = resolvePlanId(parsed.data.planId) as PlanId;
  if (planId === "free") {
    return Response.json(
      { error: "Use Customer Portal or soft switch for Free." },
      { status: 400 },
    );
  }

  const { workspace, userId } = await ensureUserAndWorkspace();
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress;
  if (!email) {
    return Response.json({ error: "No email on account" }, { status: 400 });
  }

  const sub = await getWorkspaceSubscription(workspace.id);
  const origin = new URL(req.url).origin;

  const result = await createCheckoutSession({
    workspaceId: workspace.id,
    userEmail: email,
    planId,
    billingInterval: parsed.data.billingInterval,
    successUrl: `${origin}/dashboard/billing?checkout=success`,
    cancelUrl: `${origin}/dashboard/billing?checkout=cancel`,
    customerId: sub.stripeCustomerId,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  if (result.customerId) {
    await db
      .update(workspaces)
      .set({ stripeCustomerId: result.customerId })
      .where(eq(workspaces.id, workspace.id));
  }

  void trackProductMetric({
    type: "report_created",
    workspaceId: workspace.id,
    meta: { kind: "billing_checkout_started", planId, userId },
  });

  return Response.json({ url: result.url, configured: true });
}

export async function GET() {
  return Response.json({ configured: isStripeConfigured() });
}
