import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { syncOpportunityQueue } from "@/lib/automation";
import { canManageAutomation } from "@/lib/automation/permissions";

export async function POST() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    if (!canManageAutomation(ctx)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await syncOpportunityQueue({
      workspaceId: ctx.workspace.id,
      source: "priority",
    });
    return Response.json(result);
  } catch {
    return Response.json({ error: "Could not sync queue" }, { status: 500 });
  }
}
