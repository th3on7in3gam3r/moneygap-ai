import { auth } from "@clerk/nextjs/server";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  getMarketplaceAnalytics,
  isMarketplaceEnabled,
} from "@/lib/marketplace";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isMarketplaceEnabled()) {
    return Response.json({
      enabled: false,
      message: "Marketplace™ is disabled (FEATURE_MARKETPLACE).",
    });
  }

  const { workspace } = await ensureUserAndWorkspace();
  const analytics = await getMarketplaceAnalytics(workspace.id);
  return Response.json({
    enabled: true,
    ...analytics,
    recentInstalls: analytics.recentInstalls.map((i) => ({
      id: i.id,
      createdAt: i.createdAt.toISOString(),
      listing: i.listing
        ? { id: i.listing.id, title: i.listing.title, slug: i.listing.slug }
        : null,
      resultRef: i.resultRef,
    })),
    revenueEvents: analytics.revenueEvents.map((e) => ({
      id: e.id,
      amountCents: e.amountCents,
      shareBps: e.shareBps,
      labeled: e.labeled,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
