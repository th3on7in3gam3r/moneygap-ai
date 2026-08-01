import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  isPredictiveIntelEnabled,
  patchPredictionStatus,
} from "@/lib/predictive";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPredictiveIntelEnabled()) {
    return Response.json({ error: "Predictive Intelligence disabled" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const ctx = await loadAgencyContext();
    const body = (await req.json()) as { status?: "open" | "dismissed" | "acted" };
    if (!body.status) {
      return Response.json({ error: "status required" }, { status: 400 });
    }
    const row = await patchPredictionStatus({
      workspaceId: ctx.workspace.id,
      id,
      status: body.status,
    });
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ prediction: row });
  } catch {
    return Response.json({ error: "Could not update prediction" }, { status: 500 });
  }
}
