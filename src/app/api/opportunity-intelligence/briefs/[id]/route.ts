import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { requireFeature, upgradeResponse } from "@/lib/billing";
import { getOiBrief } from "@/lib/opportunity-intelligence";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ctx = await loadAgencyContext();
    const feature = await requireFeature(
      ctx.workspace.id,
      "opportunity_intelligence",
    );
    if (!feature.ok) return upgradeResponse(feature);

    const { id } = await context.params;
    const result = await getOiBrief({
      workspaceId: ctx.workspace.id,
      briefId: id,
    });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 404 });
    }
    return Response.json(result);
  } catch {
    return Response.json({ error: "Could not load brief" }, { status: 500 });
  }
}
