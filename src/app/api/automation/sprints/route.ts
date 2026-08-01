import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { createSprintFromQueue } from "@/lib/automation";
import { canManageAutomation } from "@/lib/automation/permissions";

const bodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  limit: z.number().int().min(1).max(15).optional(),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    if (!canManageAutomation(ctx)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    const sprint = await createSprintFromQueue({
      workspaceId: ctx.workspace.id,
      title: parsed.data.title,
      limit: parsed.data.limit,
    });
    return Response.json({ sprint });
  } catch {
    return Response.json({ error: "Could not create sprint" }, { status: 500 });
  }
}
