import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { getAutomationStudioOverview } from "@/lib/automation";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    const data = await getAutomationStudioOverview(ctx.workspace.id);
    return Response.json(data);
  } catch {
    return Response.json({ error: "Could not load Automation Studio" }, { status: 500 });
  }
}
