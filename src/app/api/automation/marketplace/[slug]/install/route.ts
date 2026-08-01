import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { installMarketplaceTemplate } from "@/lib/automation";
import { canManageAutomation } from "@/lib/automation/permissions";

export async function POST(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await context.params;
  try {
    const ctx = await loadAgencyContext();
    if (!canManageAutomation(ctx)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await installMarketplaceTemplate({
      workspaceId: ctx.workspace.id,
      slug,
    });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ workflow: result.workflow });
  } catch {
    return Response.json({ error: "Could not install template" }, { status: 500 });
  }
}
