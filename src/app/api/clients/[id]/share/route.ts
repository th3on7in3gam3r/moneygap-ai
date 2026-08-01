import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createShareLink } from "@/lib/agency/share";
import { requireAgencyPermission } from "@/lib/agency/workspace";

const schema = z.object({
  reportId: z.string().uuid(),
  permissions: z
    .object({
      download: z.boolean().optional(),
      comment: z.boolean().optional(),
      approve: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("manageClients");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await context.params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const { assertWithinLimit, getWorkspacePlanId, recordUsage, upgradeResponse } =
    await import("@/lib/billing");
  const planId = await getWorkspacePlanId(gate.ctx.workspace.id);
  const usageGate = await assertWithinLimit({
    workspaceId: gate.ctx.workspace.id,
    planId,
    type: "export",
  });
  if (!usageGate.ok) {
    return upgradeResponse({
      ok: false,
      code: "usage_limit",
      message: usageGate.message,
      limit: usageGate.limit,
      used: usageGate.used,
      suggestedPlan: "growth",
    });
  }

  const result = await createShareLink({
    workspaceId: gate.ctx.workspace.id,
    clientId: id,
    reportId: parsed.data.reportId,
    createdBy: gate.ctx.userId,
    permissions: parsed.data.permissions,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  await recordUsage({
    workspaceId: gate.ctx.workspace.id,
    userId: gate.ctx.userId,
    type: "export",
    meta: { shareId: result.share.id, reportId: parsed.data.reportId },
  });

  return Response.json({
    share: result.share,
    url: `/share/${result.share.token}`,
  });
}
