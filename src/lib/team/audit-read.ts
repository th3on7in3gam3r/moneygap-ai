import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { TeamContext } from "@/lib/team/scope";

export async function listAuditTimeline(input: {
  ctx: TeamContext;
  limit?: number;
  clientId?: string | null;
}) {
  const limit = Math.min(input.limit ?? 50, 200);
  const workspaceId = input.ctx.workspace.id;

  if (input.ctx.isClient) {
    const cid = input.ctx.clientId;
    if (!cid) return { ok: true as const, entries: [] };
    const entries = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.workspaceId, workspaceId),
          sql`(${auditLogs.meta}->>'clientId') = ${cid}`,
        ),
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    return { ok: true as const, entries };
  }

  const filterClient = input.clientId;
  if (filterClient) {
    const entries = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.workspaceId, workspaceId),
          sql`(${auditLogs.meta}->>'clientId') = ${filterClient}`,
        ),
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    return { ok: true as const, entries };
  }

  const entries = await db.query.auditLogs.findMany({
    where: eq(auditLogs.workspaceId, workspaceId),
    orderBy: [desc(auditLogs.createdAt)],
    limit,
  });
  return { ok: true as const, entries };
}
