import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  getCurrentPeriodUsage,
  getPlanDefinition,
  getWorkspaceSubscription,
} from "@/lib/billing";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ctx = await loadAgencyContext();
    const sub = await getWorkspaceSubscription(ctx.workspace.id);
    const plan = getPlanDefinition(sub.planId);
    const usage = await getCurrentPeriodUsage(ctx.workspace.id);

    return Response.json({
      planId: sub.planId,
      periodStart: usage.periodStart.toISOString(),
      periodEnd: usage.periodEnd.toISOString(),
      counters: usage.counters,
      limits: {
        website_analysis: plan.limits.analysesPerMonth,
        ai_generation: plan.limits.aiGenerationsPerMonth,
        report_created: plan.limits.reportsPerMonth,
        competitor_analysis: plan.limits.competitorAnalysesPerMonth,
        export: plan.limits.exportsPerMonth,
        api_call: plan.limits.apiCallsPerMonth,
      },
    });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
