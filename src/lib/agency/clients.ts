import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  actionProjects,
  clients,
  reports,
  scoreSnapshots,
  websites,
} from "@/db/schema";
import { getPlanLimits } from "@/lib/agency/plans";
import { writeAuditLog } from "@/lib/agency/audit";

export async function listClients(workspaceId: string, includeArchived = false) {
  return db.query.clients.findMany({
    where: includeArchived
      ? eq(clients.workspaceId, workspaceId)
      : and(eq(clients.workspaceId, workspaceId), eq(clients.status, "active")),
    orderBy: [desc(clients.updatedAt)],
    with: {
      websites: true,
      assignee: true,
    },
  });
}

export async function getClient(workspaceId: string, clientId: string) {
  return db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)),
    with: {
      websites: true,
      assignee: true,
    },
  });
}

export async function createClient(input: {
  workspaceId: string;
  actorUserId: string;
  name: string;
  websiteUrl?: string | null;
  industry?: string | null;
  audience?: string | null;
  notes?: string | null;
  templateId?: string | null;
  assignedUserId?: string | null;
  plan: string;
}) {
  const limits = getPlanLimits(input.plan);
  const existing = await db.query.clients.findMany({
    where: and(
      eq(clients.workspaceId, input.workspaceId),
      eq(clients.status, "active"),
    ),
  });
  if (existing.length >= limits.maxClients) {
    return {
      ok: false as const,
      error: `Plan limit: max ${limits.maxClients} active clients.`,
    };
  }

  const [row] = await db
    .insert(clients)
    .values({
      workspaceId: input.workspaceId,
      name: input.name,
      websiteUrl: input.websiteUrl ?? null,
      industry: input.industry ?? null,
      audience: input.audience ?? null,
      notes: input.notes ?? null,
      templateId: input.templateId ?? null,
      assignedUserId: input.assignedUserId ?? null,
    })
    .returning();

  await writeAuditLog({
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    action: "client.create",
    entityType: "client",
    entityId: row.id,
  });

  return { ok: true as const, client: row };
}

export async function updateClient(input: {
  workspaceId: string;
  clientId: string;
  actorUserId: string;
  name?: string;
  websiteUrl?: string | null;
  industry?: string | null;
  audience?: string | null;
  notes?: string | null;
  status?: string;
  templateId?: string | null;
  assignedUserId?: string | null;
}) {
  const [row] = await db
    .update(clients)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.websiteUrl !== undefined ? { websiteUrl: input.websiteUrl } : {}),
      ...(input.industry !== undefined ? { industry: input.industry } : {}),
      ...(input.audience !== undefined ? { audience: input.audience } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.templateId !== undefined ? { templateId: input.templateId } : {}),
      ...(input.assignedUserId !== undefined
        ? { assignedUserId: input.assignedUserId }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(eq(clients.id, input.clientId), eq(clients.workspaceId, input.workspaceId)),
    )
    .returning();

  if (row) {
    await writeAuditLog({
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      action: input.status === "archived" ? "client.archive" : "client.update",
      entityType: "client",
      entityId: row.id,
    });
  }
  return row ?? null;
}

export async function getClientHistory(workspaceId: string, clientId: string) {
  const client = await getClient(workspaceId, clientId);
  if (!client) return null;

  const siteIds = client.websites.map((w) => w.id);
  let clientReports: (typeof reports.$inferSelect)[] = [];
  let snapshots: (typeof scoreSnapshots.$inferSelect)[] = [];
  let projects: (typeof actionProjects.$inferSelect)[] = [];

  if (siteIds.length > 0) {
    clientReports = await db.query.reports.findMany({
      where: and(
        eq(reports.workspaceId, workspaceId),
        inArray(reports.websiteId, siteIds),
        eq(reports.type, "intelligence"),
      ),
      orderBy: [desc(reports.createdAt)],
      limit: 40,
    });
    snapshots = await db.query.scoreSnapshots.findMany({
      where: inArray(scoreSnapshots.websiteId, siteIds),
      orderBy: [desc(scoreSnapshots.createdAt)],
      limit: 60,
    });
    const reportIds = clientReports.map((r) => r.id);
    if (reportIds.length > 0) {
      projects = await db.query.actionProjects.findMany({
        where: inArray(actionProjects.reportId, reportIds),
        orderBy: [desc(actionProjects.updatedAt)],
        limit: 40,
      });
    }
  }

  return {
    client,
    reports: clientReports,
    scoreHistory: snapshots
      .slice()
      .reverse()
      .map((s) => ({
        score: s.moneyGapScore,
        date: s.createdAt.toISOString().slice(0, 10),
        capturedOpportunity: s.capturedOpportunity,
      })),
    projects,
    completedProjects: projects.filter((p) => p.status === "completed"),
  };
}

export async function linkWebsiteToClient(input: {
  workspaceId: string;
  websiteId: string;
  clientId: string | null;
}) {
  const [row] = await db
    .update(websites)
    .set({ clientId: input.clientId, updatedAt: new Date() })
    .where(
      and(
        eq(websites.id, input.websiteId),
        eq(websites.workspaceId, input.workspaceId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function countActiveClients(workspaceId: string) {
  const rows = await db.query.clients.findMany({
    where: and(eq(clients.workspaceId, workspaceId), ne(clients.status, "archived")),
  });
  return rows.length;
}
