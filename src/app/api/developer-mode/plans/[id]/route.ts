import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { getDeveloperPlanDetail } from "@/lib/developer";

export async function GET(
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
    const detail = await getDeveloperPlanDetail(ctx.workspace.id, id);
    if (!detail) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({
      plan: detail.plan,
      blueprints: detail.blueprints,
      prDrafts: detail.prDrafts,
      techProfile: detail.techProfile
        ? {
            stack: detail.techProfile.stack,
            confidence: detail.techProfile.confidence,
          }
        : null,
    });
  } catch {
    return Response.json({ error: "Could not load plan" }, { status: 500 });
  }
}
