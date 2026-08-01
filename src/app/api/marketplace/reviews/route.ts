import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { isMarketplaceEnabled, upsertReview } from "@/lib/marketplace";

const bodySchema = z.object({
  listingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional().nullable(),
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
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await upsertReview({
    workspaceId: workspace.id,
    userId,
    ...parsed.data,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ review: result.review, event: result.event });
}
