import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { automationWorkflows } from "@/db/schema";
import { listAutomationAgents, ensureAutomationAgents } from "@/lib/automation/agents";
import { listExecutiveBriefings } from "@/lib/automation/briefing";
import { loadAutomationContext } from "@/lib/automation/context";
import { isAutomationEngineEnabled } from "@/lib/automation/flag";
import {
  listMarketplaceTemplates,
  ensureMarketplaceTemplates,
} from "@/lib/automation/marketplace";
import { listQueueItems } from "@/lib/automation/queue";
import { getActiveSprint, listSprints } from "@/lib/automation/sprints";

export async function getAutomationStudioOverview(workspaceId: string) {
  if (!isAutomationEngineEnabled()) {
    return {
      enabled: false as const,
      message: "Automation Engine is disabled (FEATURE_AUTOMATION_ENGINE=0).",
      agents: [],
      queue: [],
      workflows: [],
      sprints: [],
      activeSprint: null,
      templates: [],
      latestBriefing: null,
      context: null,
    };
  }

  await ensureAutomationAgents();
  await ensureMarketplaceTemplates();

  const [agents, queue, workflows, sprints, activeSprint, templates, briefings, context] =
    await Promise.all([
      listAutomationAgents(),
      listQueueItems(workspaceId),
      db.query.automationWorkflows.findMany({
        where: eq(automationWorkflows.workspaceId, workspaceId),
        orderBy: [desc(automationWorkflows.createdAt)],
        limit: 30,
      }),
      listSprints(workspaceId),
      getActiveSprint(workspaceId),
      listMarketplaceTemplates(),
      listExecutiveBriefings(workspaceId, { limit: 1 }),
      loadAutomationContext(workspaceId),
    ]);

  const queueByAgent: Record<string, number> = {};
  for (const q of queue) {
    const slug = q.agentSlug ?? "unassigned";
    queueByAgent[slug] = (queueByAgent[slug] ?? 0) + 1;
  }

  return {
    enabled: true as const,
    message: null as string | null,
    agents: agents.map((a) => ({
      ...a,
      queueCount: queueByAgent[a.slug] ?? 0,
    })),
    queue: queue.map((q) => ({
      id: q.id,
      opportunityId: q.opportunityId,
      agentSlug: q.agentSlug,
      priority: q.priority,
      status: q.status,
      source: q.source,
      title: (q.meta as { title?: string } | null)?.title ?? null,
      reportId: (q.meta as { reportId?: string } | null)?.reportId ?? null,
      moduleId: (q.meta as { moduleId?: string } | null)?.moduleId ?? null,
    })),
    workflows: workflows.map((w) => ({
      id: w.id,
      title: w.title,
      kind: w.kind,
      agentSlug: w.agentSlug,
      status: w.status,
      opportunityId: w.opportunityId,
      projectId: w.projectId,
      createdAt: w.createdAt.toISOString(),
    })),
    sprints: sprints.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      goalSummary: s.goalSummary,
      focus: s.plan.focus,
    })),
    activeSprint: activeSprint
      ? {
          id: activeSprint.id,
          title: activeSprint.title,
          endsAt: activeSprint.endsAt.toISOString(),
          focus: activeSprint.plan.focus,
        }
      : null,
    templates: templates.map((t) => ({
      slug: t.slug,
      name: t.name,
      kind: t.kind,
      agentSlug: t.agentSlug,
      description: t.description,
    })),
    latestBriefing: briefings[0]
      ? {
          id: briefings[0].id,
          createdAt: briefings[0].createdAt.toISOString(),
          payload: briefings[0].payload,
        }
      : null,
    context,
  };
}
