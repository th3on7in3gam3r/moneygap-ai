import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { listAutomationAgents } from "@/lib/automation";
import { listQueueItems } from "@/lib/automation";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    const [agents, queue] = await Promise.all([
      listAutomationAgents(),
      listQueueItems(ctx.workspace.id),
    ]);
    const counts: Record<string, number> = {};
    for (const q of queue) {
      const s = q.agentSlug ?? "unassigned";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return Response.json({
      agents: agents.map((a) => ({
        slug: a.slug,
        name: a.name,
        description: a.description,
        moduleIds: a.moduleIds,
        queueCount: counts[a.slug] ?? 0,
      })),
    });
  } catch {
    return Response.json({ error: "Could not load agents" }, { status: 500 });
  }
}
