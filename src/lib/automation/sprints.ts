import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  automationQueueItems,
  automationSprints,
  reports,
} from "@/db/schema";
import { listQueueItems } from "@/lib/automation/queue";
import { getWorkspaceBlockedOpportunityIds } from "@/lib/growth-os/dependencies";

export async function createSprintFromQueue(input: {
  workspaceId: string;
  title?: string;
  limit?: number;
}) {
  const limit = input.limit ?? 5;
  const items = (await listQueueItems(input.workspaceId)).filter(
    (i) => i.status === "queued" || i.status === "in_progress",
  );

  const reportRows = await db.query.reports.findMany({
    where: eq(reports.workspaceId, input.workspaceId),
    columns: { id: true },
    limit: 30,
  });
  const blocked = await getWorkspaceBlockedOpportunityIds(
    reportRows.map((r) => r.id),
  );

  const selected = items
    .filter((i) => !blocked.has(i.opportunityId))
    .slice(0, limit);

  const now = new Date();
  const ends = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const focus = selected.map(
    (i) =>
      (i.meta as { title?: string } | null)?.title ??
      `Opportunity ${i.opportunityId.slice(0, 8)}`,
  );

  const [sprint] = await db
    .insert(automationSprints)
    .values({
      workspaceId: input.workspaceId,
      title: input.title?.trim() || `Growth sprint · ${now.toLocaleDateString()}`,
      startsAt: now,
      endsAt: ends,
      goalSummary: `Ship top ${selected.length} queued opportunities this week.`,
      status: "active",
      plan: {
        opportunityIds: selected.map((i) => i.opportunityId),
        queueItemIds: selected.map((i) => i.id),
        focus,
        notes: "Respects Growth OS dependency blocks. Drafts only — no auto-publish.",
      },
    })
    .returning();

  for (const i of selected) {
    if (i.status === "queued") {
      await db
        .update(automationQueueItems)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(eq(automationQueueItems.id, i.id));
    }
  }

  return sprint!;
}

export async function listSprints(workspaceId: string) {
  return db.query.automationSprints.findMany({
    where: eq(automationSprints.workspaceId, workspaceId),
    orderBy: [desc(automationSprints.createdAt)],
    limit: 20,
  });
}

export async function getActiveSprint(workspaceId: string) {
  return db.query.automationSprints.findFirst({
    where: and(
      eq(automationSprints.workspaceId, workspaceId),
      eq(automationSprints.status, "active"),
    ),
    orderBy: [desc(automationSprints.createdAt)],
  });
}
