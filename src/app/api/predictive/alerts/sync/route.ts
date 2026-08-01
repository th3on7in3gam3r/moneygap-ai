import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  generateWorkspacePredictions,
  isPredictiveIntelEnabled,
  syncPredictiveAlerts,
} from "@/lib/predictive";

export async function POST() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPredictiveIntelEnabled()) {
    return Response.json({ error: "Predictive Intelligence disabled" }, { status: 403 });
  }

  try {
    const ctx = await loadAgencyContext();
    await generateWorkspacePredictions(ctx.workspace.id);
    const result = await syncPredictiveAlerts(ctx.workspace.id);
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Alert sync failed" },
      { status: 500 },
    );
  }
}
