import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { beginConnect } from "@/lib/integrations";

const bodySchema = z.object({
  apiKey: z.string().min(8).max(800).optional(),
});

export async function POST(
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
    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    const result = await beginConnect({
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      providerSlug: slug,
      apiKey: parsed.data.apiKey,
    });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json(result);
  } catch {
    return Response.json({ error: "Could not connect" }, { status: 500 });
  }
}
