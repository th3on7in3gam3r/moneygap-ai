import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  isPredictiveIntelEnabled,
  listWhatIfScenarios,
  runWhatIfScenario,
} from "@/lib/predictive";
import type { WhatIfInputs } from "@/db/schema";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPredictiveIntelEnabled()) {
    return Response.json({ enabled: false, scenarios: [] });
  }
  try {
    const ctx = await loadAgencyContext();
    const scenarios = await listWhatIfScenarios(ctx.workspace.id);
    return Response.json({ enabled: true, scenarios });
  } catch {
    return Response.json({ error: "Could not list scenarios" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPredictiveIntelEnabled()) {
    return Response.json(
      { error: "Predictive Intelligence disabled" },
      { status: 403 },
    );
  }

  try {
    const ctx = await loadAgencyContext();
    const body = (await req.json()) as {
      title?: string;
      websiteId?: string;
      inputs?: Partial<WhatIfInputs>;
    };

    const inputs: WhatIfInputs = {
      conversionLiftPct: Number(body.inputs?.conversionLiftPct ?? 0),
      trafficGrowthPct: Number(body.inputs?.trafficGrowthPct ?? 0),
      pricingChangePct: Number(body.inputs?.pricingChangePct ?? 0),
      contentProductionBoostPct: Number(
        body.inputs?.contentProductionBoostPct ?? 0,
      ),
      automationAdoptionPct: Number(body.inputs?.automationAdoptionPct ?? 0),
    };

    const scenario = await runWhatIfScenario({
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      title: body.title,
      inputs,
      websiteId: body.websiteId ?? null,
    });

    return Response.json({ scenario });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "What-If failed" },
      { status: 500 },
    );
  }
}
