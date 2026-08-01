import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { createGoal, listGoals } from "@/lib/growth-os/goals";
import type { BusinessGoalType } from "@/db/schema";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum([
    "leads",
    "revenue",
    "product",
    "subscribers",
    "seo",
    "authority",
    "conversions",
    "custom",
  ]),
  targetValue: z.string().max(200).optional().nullable(),
  priority: z.number().int().min(0).max(100).optional(),
});

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    const goals = await listGoals(ctx.workspace.id);
    return Response.json({ goals });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    const json = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    const goal = await createGoal({
      workspaceId: ctx.workspace.id,
      title: parsed.data.title,
      type: parsed.data.type as BusinessGoalType,
      targetValue: parsed.data.targetValue,
      priority: parsed.data.priority,
    });
    return Response.json({ goal }, { status: 201 });
  } catch {
    return Response.json({ error: "Could not create goal" }, { status: 500 });
  }
}
