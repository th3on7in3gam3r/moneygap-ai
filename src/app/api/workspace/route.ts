import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  loadAgencyContext,
  requireAgencyPermission,
  updateWorkspaceProfile,
} from "@/lib/agency/workspace";
import { writeAuditLog } from "@/lib/agency/audit";
import { getPlanLimits } from "@/lib/agency/plans";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    return Response.json({
      workspace: ctx.workspace,
      role: ctx.role,
      isAgency: ctx.isAgency,
      planLimits: getPlanLimits(ctx.workspace.plan),
    });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const patchSchema = z.object({
  type: z.enum(["individual", "agency", "enterprise"]).optional(),
  name: z.string().min(1).max(120).optional(),
  agencyName: z.string().max(120).nullable().optional(),
  websiteUrl: z.string().max(500).nullable().optional(),
  contactEmail: z.string().max(200).nullable().optional(),
  plan: z
    .enum([
      "free",
      "starter",
      "growth",
      "professional",
      "agency",
      "enterprise",
      "small_agency",
      "growth_agency",
      "scale",
    ])
    .optional(),
});

export async function PATCH(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await requireAgencyPermission("manageWorkspace");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const { plan, ...rest } = body.data;

  const workspace = await updateWorkspaceProfile({
    workspaceId: gate.ctx.workspace.id,
    ...rest,
  });

  if (plan) {
    const { softChangePlan, resolvePlanId } = await import("@/lib/billing");
    await softChangePlan({
      workspaceId: gate.ctx.workspace.id,
      planId: resolvePlanId(plan),
    });
  }

  await writeAuditLog({
    workspaceId: gate.ctx.workspace.id,
    actorUserId: gate.ctx.userId,
    action: "workspace.update",
    entityType: "workspace",
    entityId: workspace.id,
    meta: body.data,
  });

  const refreshed = plan
    ? { ...workspace, plan: (await import("@/lib/billing")).resolvePlanId(plan) }
    : workspace;

  return Response.json({ workspace: refreshed });
}
