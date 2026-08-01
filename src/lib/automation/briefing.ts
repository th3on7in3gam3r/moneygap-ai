import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  automationWorkflowRuns,
  automationWorkflows,
  executiveBriefings,
  growthBriefs,
  moneyGapOpportunities,
  reports,
  type ExecutiveBriefingPayload,
} from "@/db/schema";
import { listQueueItems } from "@/lib/automation/queue";
import { getActiveSprint } from "@/lib/automation/sprints";
import { getTodayPriorities } from "@/lib/growth-os/priority";
import {
  listWorkspaceWebsites,
  resolveFocusWebsite,
} from "@/lib/websites/workspace";

export async function generateExecutiveBriefing(
  workspaceId: string,
  preferredWebsiteId?: string | null,
) {
  const sites = await listWorkspaceWebsites(workspaceId);
  const focus = resolveFocusWebsite(sites, preferredWebsiteId);
  const focusId = focus?.id ?? null;

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  const workspaceReports = await db.query.reports.findMany({
    where: focusId
      ? and(
          eq(reports.workspaceId, workspaceId),
          eq(reports.websiteId, focusId),
        )
      : eq(reports.workspaceId, workspaceId),
    with: {
      website: { columns: { id: true, name: true, domain: true } },
    },
    orderBy: [desc(reports.createdAt)],
    limit: 25,
  });
  const reportIds = workspaceReports.map((r) => r.id);
  const reportSite = new Map(
    workspaceReports.map((r) => [
      r.id,
      {
        websiteId: r.websiteId,
        websiteName: r.website?.name ?? null,
        websiteDomain: r.website?.domain ?? null,
      },
    ]),
  );

  const growthScore =
    workspaceReports.find((r) => r.moneyGapScore != null)?.moneyGapScore ?? null;

  const priorities = (await getTodayPriorities(workspaceId, 10))
    .filter((p) => !focusId || p.websiteId === focusId)
    .slice(0, 5);

  const queue = await listQueueItems(workspaceId);
  const activeSprint = await getActiveSprint(workspaceId);

  let completed: ExecutiveBriefingPayload["completed"] = [];
  let recommendations: ExecutiveBriefingPayload["recommendations"] = [];
  if (reportIds.length > 0) {
    const opps = await db.query.moneyGapOpportunities.findMany({
      where: inArray(moneyGapOpportunities.reportId, reportIds),
      orderBy: [desc(moneyGapOpportunities.createdAt)],
      limit: 80,
    });
    completed = opps
      .filter(
        (o) =>
          o.implementationStatus === "completed" ||
          o.lifecycleStatus === "completed" ||
          o.lifecycleStatus === "resolved",
      )
      .slice(0, 8)
      .map((o) => {
        const site = reportSite.get(o.reportId);
        return {
          id: o.id,
          title: o.title,
          websiteId: site?.websiteId ?? null,
          websiteName: site?.websiteName ?? null,
          websiteDomain: site?.websiteDomain ?? null,
        };
      });
    recommendations = opps
      .filter((o) => o.implementationStatus === "open")
      .sort(
        (a, b) => (b.opportunityIndex ?? 0) - (a.opportunityIndex ?? 0),
      )
      .slice(0, 6)
      .map((o) => {
        const site = reportSite.get(o.reportId);
        return {
          id: o.id,
          title: o.title,
          moduleId: o.moduleId,
          websiteId: site?.websiteId ?? null,
          websiteName: site?.websiteName ?? null,
          websiteDomain: site?.websiteDomain ?? null,
        };
      });
  }

  const workflows = await db.query.automationWorkflows.findMany({
    where: eq(automationWorkflows.workspaceId, workspaceId),
  });
  const draftCount = workflows.filter((w) => w.status === "draft").length;
  let runCount = 0;
  if (workflows.length > 0) {
    const runs = await db.query.automationWorkflowRuns.findMany({
      where: inArray(
        automationWorkflowRuns.workflowId,
        workflows.map((w) => w.id),
      ),
    });
    runCount = runs.length;
  }

  let monitorBriefSnippet: string | null = null;
  try {
    const brief = await db.query.growthBriefs.findFirst({
      where: focusId
        ? and(
            eq(growthBriefs.workspaceId, workspaceId),
            eq(growthBriefs.websiteId, focusId),
          )
        : eq(growthBriefs.workspaceId, workspaceId),
      orderBy: [desc(growthBriefs.createdAt)],
    });
    if (brief?.body) monitorBriefSnippet = brief.body.slice(0, 280);
  } catch {
    /* soft */
  }

  const payload: ExecutiveBriefingPayload = {
    progressSummary:
      completed.length > 0
        ? `${completed.length} improvements completed recently; ${queue.filter((q) => q.status === "queued").length} items still queued.`
        : `Focus on ${priorities.length || queue.length} top priorities this week. Queue depth: ${queue.length}.`,
    growthScore,
    topPriorities: priorities.map((p) => ({
      id: p.id,
      title: p.title,
      websiteId: p.websiteId,
      websiteName: p.websiteName,
      websiteDomain: p.websiteDomain,
    })),
    completed,
    recommendations,
    automationHealth: {
      queueDepth: queue.filter((q) => q.status === "queued").length,
      workflowDrafts: draftCount,
      workflowRuns: runCount,
      activeSprint: activeSprint?.title ?? null,
    },
    monitorBriefSnippet,
    focusWebsite: focus
      ? { id: focus.id, name: focus.name, domain: focus.domain }
      : null,
  };

  const [row] = await db
    .insert(executiveBriefings)
    .values({
      workspaceId,
      periodStart,
      periodEnd,
      payload,
    })
    .returning();

  return row!;
}

export async function listExecutiveBriefings(
  workspaceId: string,
  opts?: { limit?: number; websiteId?: string | null },
) {
  const limit = opts?.limit ?? 12;
  const rows = await db.query.executiveBriefings.findMany({
    where: eq(executiveBriefings.workspaceId, workspaceId),
    orderBy: [desc(executiveBriefings.createdAt)],
    limit: opts?.websiteId ? 40 : limit,
  });

  if (!opts?.websiteId) return rows.slice(0, limit);

  const sites = await listWorkspaceWebsites(workspaceId);
  const focus = resolveFocusWebsite(sites, opts.websiteId);
  if (!focus) return rows.slice(0, limit);

  return rows
    .filter(
      (b) =>
        !b.payload.focusWebsite?.id ||
        b.payload.focusWebsite.id === focus.id,
    )
    .slice(0, limit);
}
