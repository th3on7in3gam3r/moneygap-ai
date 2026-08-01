import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  generateWorkspacePredictions,
  isPredictiveIntelEnabled,
  syncPredictiveAlerts,
} from "@/lib/predictive";

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
    let websiteId: string | null = null;
    try {
      const body = (await req.json()) as { websiteId?: string };
      websiteId = body.websiteId ?? null;
    } catch {
      websiteId = new URL(req.url).searchParams.get("website");
    }

    const result = await generateWorkspacePredictions(
      ctx.workspace.id,
      websiteId,
    );
    try {
      await syncPredictiveAlerts(ctx.workspace.id);
    } catch {
      /* soft */
    }
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Generate failed" },
      { status: 500 },
    );
  }
}
