import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { developerAuditLogs } from "@/db/schema";

export async function writeDeveloperAudit(input: {
  workspaceId: string;
  actorUserId?: string | null;
  action: string;
  repoId?: string | null;
  planId?: string | null;
  meta?: Record<string, unknown>;
}) {
  await db.insert(developerAuditLogs).values({
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    repoId: input.repoId ?? null,
    planId: input.planId ?? null,
    meta: input.meta ?? null,
  });
}

export async function listDeveloperAudit(workspaceId: string, limit = 40) {
  return db.query.developerAuditLogs.findMany({
    where: eq(developerAuditLogs.workspaceId, workspaceId),
    orderBy: [desc(developerAuditLogs.createdAt)],
    limit,
  });
}
