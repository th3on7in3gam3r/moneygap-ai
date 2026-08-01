import Stripe from "stripe";
import type { PlanId } from "@/lib/billing/plans";

export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY?.trim() &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()
  );
}

export function getStripePriceId(
  planId: PlanId,
  interval: "monthly" | "annual",
): string | null {
  const key =
    interval === "annual"
      ? `STRIPE_PRICE_${planId.toUpperCase()}_ANNUAL`
      : `STRIPE_PRICE_${planId.toUpperCase()}_MONTHLY`;
  const v = process.env[key]?.trim();
  return v || null;
}

let stripeClient: Stripe | null | undefined;

function getStripe(): Stripe | null {
  if (!isStripeConfigured()) return null;
  if (stripeClient !== undefined) return stripeClient;
  try {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
    return stripeClient;
  } catch {
    stripeClient = null;
    return null;
  }
}

export async function createCheckoutSession(input: {
  workspaceId: string;
  userEmail: string;
  planId: PlanId;
  billingInterval: "monthly" | "annual";
  successUrl: string;
  cancelUrl: string;
  customerId?: string | null;
}): Promise<
  | { ok: true; url: string; customerId: string }
  | { ok: false; status: number; error: string }
> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      status: 503,
      error: "Stripe is not configured (set STRIPE_SECRET_KEY and price IDs).",
    };
  }
  const priceId = getStripePriceId(input.planId, input.billingInterval);
  if (!priceId) {
    return {
      ok: false,
      status: 503,
      error: `Missing Stripe price env for ${input.planId} ${input.billingInterval}`,
    };
  }
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, status: 503, error: "Stripe client unavailable" };
  }

  let customerId = input.customerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: input.userEmail,
      metadata: { workspaceId: input.workspaceId },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      workspaceId: input.workspaceId,
      planId: input.planId,
      billingInterval: input.billingInterval,
    },
    subscription_data: {
      metadata: {
        workspaceId: input.workspaceId,
        planId: input.planId,
      },
    },
  });

  if (!session.url) {
    return { ok: false, status: 500, error: "Checkout session missing URL" };
  }
  return { ok: true, url: session.url, customerId };
}

export async function createPortalSession(input: {
  customerId: string;
  returnUrl: string;
}): Promise<
  | { ok: true; url: string }
  | { ok: false; status: number; error: string }
> {
  if (!isStripeConfigured()) {
    return { ok: false, status: 503, error: "Stripe is not configured." };
  }
  if (!input.customerId) {
    return {
      ok: false,
      status: 400,
      error: "No Stripe customer on this workspace yet.",
    };
  }
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, status: 503, error: "Stripe client unavailable" };
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: input.returnUrl,
  });
  return { ok: true, url: session.url };
}

export async function constructStripeEvent(
  rawBody: string,
  signature: string,
): Promise<{ ok: true; event: Stripe.Event } | { ok: false; error: string }> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !isStripeConfigured()) {
    return { ok: false, error: "Stripe webhook not configured" };
  }
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, error: "Stripe client unavailable" };
  }
  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    return { ok: true, event };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid signature",
    };
  }
}
