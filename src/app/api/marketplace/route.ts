import { auth } from "@clerk/nextjs/server";
import type { MarketplaceCategory } from "@/db/schema";
import {
  ensureMarketplaceCatalog,
  isMarketplaceEnabled,
  listListings,
  getListingBySlug,
} from "@/lib/marketplace";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isMarketplaceEnabled()) {
    return Response.json({
      enabled: false,
      message: "Marketplace™ is disabled (FEATURE_MARKETPLACE).",
      listings: [],
    });
  }

  await ensureUserAndWorkspace();
  await ensureMarketplaceCatalog();

  const url = new URL(req.url);
  const category = url.searchParams.get("category") as MarketplaceCategory | null;
  const slug = url.searchParams.get("slug");
  const q = url.searchParams.get("q");

  if (slug) {
    const listing = await getListingBySlug(slug);
    if (!listing) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({ enabled: true, listing });
  }

  const listings = await listListings({
    category: category || null,
    q,
  });

  return Response.json({
    enabled: true,
    listings: listings.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      category: l.category,
      kind: l.kind,
      summary: l.summary,
      payload: l.payload,
      priceCents: l.priceCents,
      installCount: l.installCount,
      ratingAvg: l.ratingAvg,
      ratingCount: l.ratingCount,
      creator: l.creator
        ? {
            id: l.creator.id,
            displayName: l.creator.displayName,
            verified: l.creator.verified,
          }
        : null,
    })),
  });
}
