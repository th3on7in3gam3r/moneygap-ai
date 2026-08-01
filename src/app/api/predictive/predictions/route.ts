import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  isPredictiveIntelEnabled,
  listWorkspacePredictions,
} from "@/lib/predictive";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPredictiveIntelEnabled()) {
    return Response.json({ enabled: false, predictions: [] });
  }

  try {
    const ctx = await loadAgencyContext();
    const kind = new URL(req.url).searchParams.get("kind") ?? undefined;
    const predictions = await listWorkspacePredictions(ctx.workspace.id, {
      kind: kind ?? undefined,
    });
    return Response.json({ enabled: true, predictions });
  } catch {
    return Response.json({ error: "Could not list predictions" }, { status: 500 });
  }
}
