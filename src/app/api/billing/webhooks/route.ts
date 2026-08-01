import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { workspaceSubscriptions, workspaces } from "@/db/schema";
import {
  constructStripeEvent,
  isStripeConfigured,
  resolvePlanId,
  softChangePlan,
  type PlanId,
} from "@/lib/billing";
import { trackProductMetric } from "@/lib/observability/metrics";
import { log } from "@/lib/observability/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return Response.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  const constructed = await constructStripeEvent(rawBody, signature);
  if (!constructed.ok) {
    return Response.json({ error: constructed.error }, { status: 400 });
  }

  const event = constructed.event;

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = String(session.metadata?.workspaceId ?? "");
      const planId = resolvePlanId(
        String(session.metadata?.planId ?? "professional"),
      ) as PlanId;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? "";
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? "";

      if (workspaceId) {
        if (customerId) {
          await db
            .update(workspaces)
            .set({ stripeCustomerId: customerId, plan: planId })
            .where(eq(workspaces.id, workspaceId));
        }
        await softChangePlan({
          workspaceId,
          planId,
          billingInterval:
            session.metadata?.billingInterval === "annual"
              ? "annual"
              : "monthly",
        });
        const sub = await db.query.workspaceSubscriptions.findFirst({
          where: eq(workspaceSubscriptions.workspaceId, workspaceId),
        });
        if (sub) {
          await db
            .update(workspaceSubscriptions)
            .set({
              stripeCustomerId: customerId || sub.stripeCustomerId,
              stripeSubscriptionId: subscriptionId || sub.stripeSubscriptionId,
              status: "active",
              updatedAt: new Date(),
            })
            .where(eq(workspaceSubscriptions.id, sub.id));
        }
        void trackProductMetric({
          type: "report_created",
          workspaceId,
          meta: { kind: "billing_checkout_completed", planId },
        });
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const workspaceId = String(subscription.metadata?.workspaceId ?? "");
      if (workspaceId) {
        const sub = await db.query.workspaceSubscriptions.findFirst({
          where: eq(workspaceSubscriptions.workspaceId, workspaceId),
        });
        if (sub) {
          await db
            .update(workspaceSubscriptions)
            .set({
              status:
                event.type === "customer.subscription.deleted"
                  ? "canceled"
                  : subscription.status || sub.status,
              updatedAt: new Date(),
            })
            .where(eq(workspaceSubscriptions.id, sub.id));
        }
      }
    }
  } catch (err) {
    log("error", "stripe_webhook_handler_error", {
      error: err instanceof Error ? err.message : String(err),
      type: event.type,
    });
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
