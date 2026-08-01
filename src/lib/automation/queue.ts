import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  automationQueueItems,
  moneyGapOpportunities,
  reports,
  type AutomationQueueSource,
  type AutomationQueueStatus,
} from "@/db/schema";
import { agentSlugForModule } from "@/lib/automation/flag";
import { getTodayPriorities } from "@/lib/growth-os/priority";
import { getWorkspaceBlockedOpportunityIds } from "@/lib/growth-os/dependencies";

export async function syncOpportunityQueue(input: {
  workspaceId: string;
  source?: AutomationQueueSource;
}) {
  const source = input.source ?? "priority";
  const workspaceReports = await db.query.reports.findMany({
    where: eq(reports.workspaceId, input.workspaceId),
    columns: { id: true },
    orderBy: [desc(reports.createdAt)],
    limit: 30,
  });
  const reportIds = workspaceReports.map((r) => r.id);
  if (reportIds.length === 0) return { upserted: 0, items: [] };

  const blocked = await getWorkspaceBlockedOpportunityIds(reportIds);
  const priorities = await getTodayPriorities(input.workspaceId, 15);
  const priorityMap = new Map(
    priorities.map((p, i) => [p.id, 100 - i * 3]),
  );

  const opps = await db.query.moneyGapOpportunities.findMany({
    where: and(
      inArray(moneyGapOpportunities.reportId, reportIds),
      inArray(moneyGapOpportunities.implementationStatus, [
        "open",
        "saved",
        "in_progress",
      ]),
    ),
    orderBy: [desc(moneyGapOpportunities.opportunityIndex)],
    limit: 40,
  });

  let upserted = 0;
  for (const o of opps) {
    if (blocked.has(o.id)) continue;
    const priority =
      priorityMap.get(o.id) ??
      Math.min(95, Math.max(10, o.opportunityIndex ?? o.priorityScore ?? 50));
    const agentSlug = agentSlugForModule(o.moduleId);

    const existing = await db.query.automationQueueItems.findFirst({
      where: and(
        eq(automationQueueItems.workspaceId, input.workspaceId),
        eq(automationQueueItems.opportunityId, o.id),
      ),
    });

    if (existing) {
      if (existing.status === "done" || existing.status === "dismissed") continue;
      await db
        .update(automationQueueItems)
        .set({
          priority,
          agentSlug: existing.agentSlug ?? agentSlug,
          source,
          meta: {
            ...(existing.meta ?? {}),
            title: o.title,
            moduleId: o.moduleId,
            reportId: o.reportId,
          },
          updatedAt: new Date(),
        })
        .where(eq(automationQueueItems.id, existing.id));
    } else {
      await db.insert(automationQueueItems).values({
        workspaceId: input.workspaceId,
        opportunityId: o.id,
        agentSlug,
        priority,
        status: "queued",
        source,
        meta: {
          title: o.title,
          moduleId: o.moduleId,
          reportId: o.reportId,
        },
      });
    }
    upserted += 1;
  }

  const items = await listQueueItems(input.workspaceId);
  return { upserted, items };
}

export async function listQueueItems(workspaceId: string) {
  return db.query.automationQueueItems.findMany({
    where: eq(automationQueueItems.workspaceId, workspaceId),
    orderBy: [desc(automationQueueItems.priority)],
    limit: 50,
  });
}

export async function patchQueueItem(input: {
  workspaceId: string;
  id: string;
  status?: AutomationQueueStatus;
  agentSlug?: string | null;
}) {
  const row = await db.query.automationQueueItems.findFirst({
    where: and(
      eq(automationQueueItems.id, input.id),
      eq(automationQueueItems.workspaceId, input.workspaceId),
    ),
  });
  if (!row) return null;
  const [updated] = await db
    .update(automationQueueItems)
    .set({
      status: input.status ?? row.status,
      agentSlug:
        input.agentSlug !== undefined ? input.agentSlug : row.agentSlug,
      updatedAt: new Date(),
    })
    .where(eq(automationQueueItems.id, row.id))
    .returning();
  return updated!;
}

export async function enqueueOpportunityIds(input: {
  workspaceId: string;
  opportunityIds: string[];
  source: AutomationQueueSource;
}) {
  if (input.opportunityIds.length === 0) return 0;
  const opps = await db.query.moneyGapOpportunities.findMany({
    where: inArray(moneyGapOpportunities.id, input.opportunityIds),
  });
  let n = 0;
  for (const o of opps) {
    const existing = await db.query.automationQueueItems.findFirst({
      where: and(
        eq(automationQueueItems.workspaceId, input.workspaceId),
        eq(automationQueueItems.opportunityId, o.id),
      ),
    });
    if (existing) {
      if (existing.status === "done" || existing.status === "dismissed") {
        await db
          .update(automationQueueItems)
          .set({
            status: "queued",
            source: input.source,
            updatedAt: new Date(),
          })
          .where(eq(automationQueueItems.id, existing.id));
        n += 1;
      }
      continue;
    }
    await db.insert(automationQueueItems).values({
      workspaceId: input.workspaceId,
      opportunityId: o.id,
      agentSlug: agentSlugForModule(o.moduleId),
      priority: o.opportunityIndex ?? 50,
      status: "queued",
      source: input.source,
      meta: { title: o.title, moduleId: o.moduleId, reportId: o.reportId },
    });
    n += 1;
  }
  return n;
}
