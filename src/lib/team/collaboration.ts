import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  actionProjects,
  opportunityApprovals,
  opportunityComments,
} from "@/db/schema";
import { writeAuditLog } from "@/lib/agency/audit";
import { hasCapability } from "@/lib/agency/permissions";
import {
  assertReportInClientScope,
  type TeamContext,
} from "@/lib/team/scope";

export async function listOpportunityComments(input: {
  ctx: TeamContext;
  reportId: string;
  opportunityId: string;
}) {
  const scope = await assertReportInClientScope(input.ctx, input.reportId);
  if (!scope.ok) return scope;

  const rows = await db.query.opportunityComments.findMany({
    where: and(
      eq(opportunityComments.workspaceId, input.ctx.workspace.id),
      eq(opportunityComments.reportId, input.reportId),
      eq(opportunityComments.opportunityId, input.opportunityId),
    ),
    orderBy: [desc(opportunityComments.createdAt)],
    with: { author: true },
    limit: 100,
  });
  return { ok: true as const, comments: rows };
}

export async function addOpportunityComment(input: {
  ctx: TeamContext;
  reportId: string;
  opportunityId: string;
  body: string;
  projectId?: string | null;
}) {
  const body = input.body.trim();
  if (!body) {
    return { ok: false as const, status: 400 as const, error: "Empty comment" };
  }
  if (input.ctx.isClient && !hasCapability(input.ctx.role, "commentOwnClient")) {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }
  if (
    !input.ctx.isClient &&
    !hasCapability(input.ctx.role, "viewClients") &&
    !hasCapability(input.ctx.role, "manageProjects")
  ) {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }

  const scope = await assertReportInClientScope(input.ctx, input.reportId);
  if (!scope.ok) return scope;

  const [row] = await db
    .insert(opportunityComments)
    .values({
      workspaceId: input.ctx.workspace.id,
      reportId: input.reportId,
      opportunityId: input.opportunityId,
      projectId: input.projectId ?? null,
      authorUserId: input.ctx.userId,
      body,
    })
    .returning();

  await writeAuditLog({
    workspaceId: input.ctx.workspace.id,
    actorUserId: input.ctx.userId,
    action: "opportunity.comment",
    entityType: "opportunity",
    entityId: input.opportunityId,
    meta: {
      reportId: input.reportId,
      clientId: input.ctx.clientId,
      commentId: row.id,
    },
  });

  return { ok: true as const, comment: row };
}

export async function listOpportunityApprovals(input: {
  ctx: TeamContext;
  reportId: string;
  opportunityId: string;
}) {
  const scope = await assertReportInClientScope(input.ctx, input.reportId);
  if (!scope.ok) return scope;

  const rows = await db.query.opportunityApprovals.findMany({
    where: and(
      eq(opportunityApprovals.workspaceId, input.ctx.workspace.id),
      eq(opportunityApprovals.reportId, input.reportId),
      eq(opportunityApprovals.opportunityId, input.opportunityId),
    ),
    orderBy: [desc(opportunityApprovals.createdAt)],
    limit: 50,
  });
  return { ok: true as const, approvals: rows };
}

export async function submitOpportunityApproval(input: {
  ctx: TeamContext;
  reportId: string;
  opportunityId: string;
  status: "approved" | "rejected";
  note?: string | null;
  projectId?: string | null;
}) {
  if (input.ctx.isClient && !hasCapability(input.ctx.role, "approveOwnClient")) {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }
  if (
    !input.ctx.isClient &&
    !hasCapability(input.ctx.role, "manageProjects") &&
    !hasCapability(input.ctx.role, "viewClients")
  ) {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }

  const scope = await assertReportInClientScope(input.ctx, input.reportId);
  if (!scope.ok) return scope;

  const [row] = await db
    .insert(opportunityApprovals)
    .values({
      workspaceId: input.ctx.workspace.id,
      reportId: input.reportId,
      opportunityId: input.opportunityId,
      projectId: input.projectId ?? null,
      clientId: input.ctx.clientId,
      actorUserId: input.ctx.userId,
      status: input.status,
      note: input.note?.trim() || null,
      updatedAt: new Date(),
    })
    .returning();

  await writeAuditLog({
    workspaceId: input.ctx.workspace.id,
    actorUserId: input.ctx.userId,
    action: `opportunity.${input.status}`,
    entityType: "opportunity",
    entityId: input.opportunityId,
    meta: {
      reportId: input.reportId,
      clientId: input.ctx.clientId,
      approvalId: row.id,
    },
  });

  return { ok: true as const, approval: row };
}

export async function linkProjectSprint(input: {
  ctx: TeamContext;
  projectId: string;
  sprintId: string | null;
}) {
  if (!hasCapability(input.ctx.role, "manageProjects")) {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }
  const project = await db.query.actionProjects.findFirst({
    where: eq(actionProjects.id, input.projectId),
    with: { report: true },
  });
  if (!project || project.report?.workspaceId !== input.ctx.workspace.id) {
    return { ok: false as const, status: 404 as const, error: "Not found" };
  }
  const [row] = await db
    .update(actionProjects)
    .set({ sprintId: input.sprintId, updatedAt: new Date() })
    .where(eq(actionProjects.id, input.projectId))
    .returning();

  await writeAuditLog({
    workspaceId: input.ctx.workspace.id,
    actorUserId: input.ctx.userId,
    action: "project.sprint_link",
    entityType: "action_project",
    entityId: input.projectId,
    meta: { sprintId: input.sprintId },
  });

  return { ok: true as const, project: row };
}

export async function assignProject(input: {
  ctx: TeamContext;
  projectId: string;
  assigneeUserId: string | null;
}) {
  if (!hasCapability(input.ctx.role, "manageProjects")) {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }
  const project = await db.query.actionProjects.findFirst({
    where: eq(actionProjects.id, input.projectId),
    with: { report: true },
  });
  if (!project || project.report?.workspaceId !== input.ctx.workspace.id) {
    return { ok: false as const, status: 404 as const, error: "Not found" };
  }
  const [row] = await db
    .update(actionProjects)
    .set({
      assigneeUserId: input.assigneeUserId,
      updatedAt: new Date(),
    })
    .where(eq(actionProjects.id, input.projectId))
    .returning();

  await writeAuditLog({
    workspaceId: input.ctx.workspace.id,
    actorUserId: input.ctx.userId,
    action: "project.assign",
    entityType: "action_project",
    entityId: input.projectId,
    meta: { assigneeUserId: input.assigneeUserId },
  });

  return { ok: true as const, project: row };
}
