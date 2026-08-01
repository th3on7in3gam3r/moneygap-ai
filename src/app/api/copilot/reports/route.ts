import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  generateCopilotReport,
  isGrowthCopilotEnabled,
  type ReportKind,
} from "@/lib/copilot";

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
      kind?: ReportKind;
      clientId?: string | null;
      clientName?: string | null;
      websiteId?: string;
    };

    const kind = body.kind ?? "weekly_report";
    const report = await generateCopilotReport({
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      kind,
      clientId: body.clientId,
      clientName: body.clientName,
      websiteId: body.websiteId,
    });

    await recordUsage({
      workspaceId: ctx.workspace.id,
      type: "ai_generation",
      meta: { kind: "copilot_report", reportKind: kind },
    });

    return Response.json({ report });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Report failed" },
      { status: 500 },
    );
  }
}
