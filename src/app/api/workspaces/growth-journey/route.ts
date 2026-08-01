import { auth } from "@clerk/nextjs/server";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { getGrowthJourney } from "@/lib/monitor/growth-journey";

export async function GET() {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspace } = await ensureUserAndWorkspace();
    const journey = await getGrowthJourney(workspace.id);
    return Response.json({ journey, workspaceId: workspace.id });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
