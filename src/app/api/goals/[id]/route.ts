import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { deleteGoal, updateGoal } from "@/lib/growth-os/goals";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: z
    .enum([
      "leads",
      "revenue",
      "product",
      "subscribers",
      "seo",
      "authority",
      "conversions",
      "custom",
    ])
    .optional(),
  targetValue: z.string().max(200).nullable().optional(),
  status: z.enum(["active", "paused", "completed", "archived"]).optional(),
  priority: z.number().int().min(0).max(100).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const ctx = await loadAgencyContext();
    const json = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    const goal = await updateGoal(id, ctx.workspace.id, parsed.data);
    if (!goal) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ goal });
  } catch {
    return Response.json({ error: "Could not update goal" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const ctx = await loadAgencyContext();
    await deleteGoal(id, ctx.workspace.id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not delete goal" }, { status: 500 });
  }
}
