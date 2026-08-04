import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { canManageDeveloperMode } from "@/lib/developer/authz";
import {
  createFixflowProposal,
  listFixflowProposalsForOpportunity,
} from "@/lib/fixflow";

const postSchema = z.object({
  opportunityId: z.string().uuid(),
  repoId: z.string().uuid().optional().nullable(),
});

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    const opportunityId = new URL(req.url).searchParams.get("opportunityId");
    if (!opportunityId) {
      return Response.json({ error: "opportunityId required" }, { status: 400 });
    }
    const proposals = await listFixflowProposalsForOpportunity({
      workspaceId: ctx.workspace.id,
      opportunityId,
    });
    return Response.json({ proposals });
  } catch {
    return Response.json({ error: "Could not list proposals" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    if (!canManageDeveloperMode(ctx)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const parsed = postSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    const result = await createFixflowProposal({
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      opportunityId: parsed.data.opportunityId,
      repoId: parsed.data.repoId,
    });
    return Response.json({
      proposal: result.record,
      diffPreview: result.diffPreview,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create proposal";
    const status = message.includes("not found") ? 404 : 500;
    return Response.json({ error: message }, { status });
  }
}
