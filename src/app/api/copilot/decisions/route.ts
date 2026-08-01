import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  approveDecisionSimulation,
  isGrowthCopilotEnabled,
  listDecisionSimulations,
  runDecisionSimulation,
} from "@/lib/copilot";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthCopilotEnabled()) {
    return Response.json({ enabled: false, decisions: [] });
  }
  try {
    const ctx = await loadAgencyContext();
    const decisions = await listDecisionSimulations(ctx.workspace.id);
    return Response.json({ enabled: true, decisions });
  } catch {
    return Response.json({ error: "Could not list decisions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthCopilotEnabled()) {
    return Response.json({ error: "Growth Copilot disabled" }, { status: 403 });
  }

  try {
    const ctx = await loadAgencyContext();
    const body = (await req.json()) as {
      title?: string;
      options?: { label: string; description?: string }[];
      criteria?: string[];
      approveId?: string;
      websiteId?: string;
    };

    if (body.approveId) {
      const row = await approveDecisionSimulation({
        workspaceId: ctx.workspace.id,
        id: body.approveId,
      });
      if (!row) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ decision: row });
    }

    const options = body.options ?? [];
    if (options.length < 2) {
      return Response.json(
        { error: "Provide at least two options" },
        { status: 400 },
      );
    }

    const decision = await runDecisionSimulation({
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      title: body.title?.trim() || "Decision comparison",
      options,
      criteria: body.criteria,
      websiteId: body.websiteId,
    });

    return Response.json({ decision });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Decision failed" },
      { status: 500 },
    );
  }
}
