import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { updateRecommendation } from "@/lib/knowledge-graph";

const patchSchema = z.object({
  status: z.enum(["active", "draft", "deprecated"]).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  name: z.string().min(1).max(200).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await context.params;
  try {
    const ctx = await loadAgencyContext();
    const isOwner = ctx.workspace.ownerId === ctx.userId;
    if (!isOwner && ctx.role !== "owner" && ctx.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    const row = await updateRecommendation(slug, parsed.data);
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ recommendation: row });
  } catch {
    return Response.json({ error: "Could not update recommendation" }, { status: 500 });
  }
}
