import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { installListing, isMarketplaceEnabled } from "@/lib/marketplace";

const bodySchema = z.object({
  listingId: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isMarketplaceEnabled()) {
    return Response.json(
      { error: "Marketplace™ is disabled (FEATURE_MARKETPLACE)." },
      { status: 503 },
    );
  }

  const { userId, workspace } = await ensureUserAndWorkspace();
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success || (!parsed.data.listingId && !parsed.data.slug)) {
    return Response.json({ error: "listingId or slug required" }, { status: 400 });
  }

  const result = await installListing({
    workspaceId: workspace.id,
    userId,
    listingIdOrSlug: parsed.data.listingId ?? parsed.data.slug!,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    install: result.install,
    resultRef: result.resultRef,
    event: result.event,
    listing: {
      id: result.listing.id,
      slug: result.listing.slug,
      title: result.listing.title,
    },
  });
}
