import { auth } from "@clerk/nextjs/server";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  createPortalSession,
  getWorkspaceSubscription,
  isStripeConfigured,
} from "@/lib/billing";

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return Response.json(
      {
        error: "Stripe is not configured.",
        code: "stripe_not_configured",
      },
      { status: 503 },
    );
  }

  const { workspace } = await ensureUserAndWorkspace();
  const sub = await getWorkspaceSubscription(workspace.id);
  const customerId = sub.stripeCustomerId || workspace.stripeCustomerId;
  if (!customerId) {
    return Response.json(
      { error: "No Stripe customer yet — start Checkout first." },
      { status: 400 },
    );
  }

  const origin = new URL(req.url).origin;
  const result = await createPortalSession({
    customerId,
    returnUrl: `${origin}/dashboard/billing`,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ url: result.url });
}
