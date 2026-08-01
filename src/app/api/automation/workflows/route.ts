import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { generateWorkflow } from "@/lib/automation";
import { canManageAutomation } from "@/lib/automation/permissions";

const bodySchema = z.object({
  opportunityId: z.string().uuid(),
  agentSlug: z.string().min(1).max(64).optional(),
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
    const result = await generateWorkflow({
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      opportunityId: parsed.data.opportunityId,
      agentSlug: parsed.data.agentSlug,
    });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ workflow: result.workflow });
  } catch {
    return Response.json({ error: "Could not generate workflow" }, { status: 500 });
  }
}
