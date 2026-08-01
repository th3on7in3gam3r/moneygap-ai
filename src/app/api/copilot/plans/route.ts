import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  generateCopilotPlan,
  isGrowthCopilotEnabled,
  listCopilotPlans,
  type PlanKind,
} from "@/lib/copilot";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthCopilotEnabled()) {
    return Response.json({ enabled: false, plans: [] });
  }
  try {
    const ctx = await loadAgencyContext();
    const plans = await listCopilotPlans(ctx.workspace.id);
    return Response.json({ enabled: true, plans });
  } catch {
    return Response.json({ error: "Could not list plans" }, { status: 500 });
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
    const { requireFeatureAndUsage, upgradeResponse, recordUsage } = await import(
      "@/lib/billing"
    );
    const gate = await requireFeatureAndUsage({
      workspaceId: ctx.workspace.id,
      feature: "ai_advisor",
      usageType: "ai_generation",
    });
    if (!gate.ok) return upgradeResponse(gate);

    const body = (await req.json()) as {
      kind?: PlanKind;
      horizon?: string | null;
      websiteId?: string;
    };
    const kind = body.kind ?? "growth";
    const plan = await generateCopilotPlan({
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      kind,
      horizon: body.horizon,
      websiteId: body.websiteId,
    });

    await recordUsage({
      workspaceId: ctx.workspace.id,
      type: "ai_generation",
      meta: { kind: "copilot_plan", planKind: kind },
    });

    return Response.json({ plan });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Plan failed" },
      { status: 500 },
    );
  }
}
