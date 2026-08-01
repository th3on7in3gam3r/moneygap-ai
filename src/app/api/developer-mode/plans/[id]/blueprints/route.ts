import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  canManageDeveloperMode,
  generatePlanBlueprints,
} from "@/lib/developer";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const ctx = await loadAgencyContext();
    if (!canManageDeveloperMode(ctx)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await generatePlanBlueprints({
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      planId: id,
    });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ blueprints: result.blueprints });
  } catch {
    return Response.json(
      { error: "Could not generate blueprints" },
      { status: 500 },
    );
  }
}
