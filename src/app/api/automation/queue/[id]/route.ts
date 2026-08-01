import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { patchQueueItem } from "@/lib/automation";
import { canManageAutomation } from "@/lib/automation/permissions";

const bodySchema = z.object({
  status: z.enum(["queued", "in_progress", "done", "dismissed"]).optional(),
  agentSlug: z.string().min(1).max(64).nullable().optional(),
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
    if (!canManageAutomation(ctx)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    const item = await patchQueueItem({
      workspaceId: ctx.workspace.id,
      id,
      status: parsed.data.status,
      agentSlug: parsed.data.agentSlug,
    });
    if (!item) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({ item });
  } catch {
    return Response.json({ error: "Could not update queue item" }, { status: 500 });
  }
}
