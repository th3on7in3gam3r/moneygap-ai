import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { integrationAuditLogs } from "@/db/schema";

export async function writeIntegrationAudit(input: {
  workspaceId: string;
  actorUserId?: string | null;
  action: string;
  providerSlug?: string | null;
  connectionId?: string | null;
  meta?: Record<string, unknown>;
}) {
  await db.insert(integrationAuditLogs).values({
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    providerSlug: input.providerSlug ?? null,
    connectionId: input.connectionId ?? null,
    meta: input.meta ?? null,
  });
}

export async function listIntegrationAudit(workspaceId: string, limit = 40) {
  return db.query.integrationAuditLogs.findMany({
    where: eq(integrationAuditLogs.workspaceId, workspaceId),
    orderBy: [desc(integrationAuditLogs.createdAt)],
    limit,
  });
}
