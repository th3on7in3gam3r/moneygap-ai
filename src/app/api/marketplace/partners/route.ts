import { auth } from "@clerk/nextjs/server";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { isMarketplaceEnabled, listPartners } from "@/lib/marketplace";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isMarketplaceEnabled()) {
    return Response.json({
      enabled: false,
      message: "Marketplace™ is disabled (FEATURE_MARKETPLACE).",
      partners: [],
    });
  }

  await ensureUserAndWorkspace();
  const partners = await listPartners();
  return Response.json({
    enabled: true,
    partners: partners.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      type: p.type,
      website: p.website,
      blurb: p.blurb,
      verified: p.verified,
    })),
  });
}
