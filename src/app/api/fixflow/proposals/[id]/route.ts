import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { canManageDeveloperMode } from "@/lib/developer/authz";
import {
  getFixflowPrReadiness,
  getFixflowProposal,
  updateFixflowProposalStatus,
} from "@/lib/fixflow";

const patchSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await ctx.params;
    const agency = await loadAgencyContext();
    const loaded = await getFixflowProposal({
      workspaceId: agency.workspace.id,
      id,
    });
    if (!loaded) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const readiness = await getFixflowPrReadiness({
      workspaceId: agency.workspace.id,
      id,
    });
    return Response.json({
      proposal: loaded.record,
      diffPreview: loaded.diffPreview,
      readiness,
    });
  } catch {
    return Response.json({ error: "Could not load proposal" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const agency = await loadAgencyContext();
    if (!canManageDeveloperMode(agency)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json({ error: "action must be approve or reject" }, { status: 400 });
    }
    const proposal = await updateFixflowProposalStatus({
      workspaceId: agency.workspace.id,
      userId: agency.userId,
      id,
      action: parsed.data.action,
    });
    return Response.json({ proposal });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update proposal";
    const status = message.includes("not found") ? 404 : 500;
    return Response.json({ error: message }, { status });
  }
}
