import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { growthTimelineEvents } from "@/db/schema";

export async function recordTimelineEvent(input: {
  workspaceId: string;
  type: string;
  title: string;
  body?: string | null;
  meta?: Record<string, unknown> | null;
  occurredAt?: Date;
}) {
  try {
    const [row] = await db
      .insert(growthTimelineEvents)
      .values({
        workspaceId: input.workspaceId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        meta: input.meta ?? null,
        occurredAt: input.occurredAt ?? new Date(),
      })
      .returning();
    return row;
  } catch {
    return null;
  }
}

export async function listTimelineEvents(workspaceId: string, limit = 20) {
  const rows = await db.query.growthTimelineEvents.findMany({
    where: eq(growthTimelineEvents.workspaceId, workspaceId),
    orderBy: [desc(growthTimelineEvents.occurredAt)],
    limit,
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    occurredAt: r.occurredAt.toISOString(),
  }));
}
