import { createHash, randomBytes } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { clients, workspaceInvites, workspaceMembers } from "@/db/schema";
import { writeAuditLog } from "@/lib/agency/audit";
import { getPlanLimits } from "@/lib/agency/plans";
import {
  INVITE_STAFF_ROLES,
  normalizeRole,
  type InviteStaffRole,
} from "@/lib/agency/permissions";
import type { TeamContext } from "@/lib/team/scope";

const DEFAULT_TTL_DAYS = 14;

export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export function inviteUrlPath(token: string): string {
  return `/invite/${token}`;
}

export async function listInvites(workspaceId: string) {
  return db.query.workspaceInvites.findMany({
    where: eq(workspaceInvites.workspaceId, workspaceId),
    orderBy: [desc(workspaceInvites.createdAt)],
    with: { client: true },
    limit: 100,
  });
}

export async function createInvite(input: {
  ctx: TeamContext;
  email: string;
  role: string;
  clientId?: string | null;
  ttlDays?: number;
}) {
  const email = input.email.trim().toLowerCase();
  const role = normalizeRole(input.role);

  if (role === "owner") {
    return { ok: false as const, error: "Cannot invite as owner", status: 400 as const };
  }

  if (role === "client") {
    if (!input.clientId) {
      return {
        ok: false as const,
        error: "clientId required for Client role",
        status: 400 as const,
      };
    }
    const client = await db.query.clients.findFirst({
      where: and(
        eq(clients.id, input.clientId),
        eq(clients.workspaceId, input.ctx.workspace.id),
      ),
    });
    if (!client) {
      return { ok: false as const, error: "Client not found", status: 404 as const };
    }
  } else {
    if (!(INVITE_STAFF_ROLES as readonly string[]).includes(role)) {
      return { ok: false as const, error: "Invalid role", status: 400 as const };
    }
  }

  const limits = getPlanLimits(input.ctx.workspace.plan);
  const members = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspaceId, input.ctx.workspace.id),
  });
  const pending = await db.query.workspaceInvites.findMany({
    where: and(
      eq(workspaceInvites.workspaceId, input.ctx.workspace.id),
      isNull(workspaceInvites.acceptedAt),
      isNull(workspaceInvites.revokedAt),
    ),
  });
  if (members.length + pending.length >= limits.maxSeats) {
    return {
      ok: false as const,
      error: `Plan seat limit: ${limits.maxSeats}`,
      status: 403 as const,
      code: "usage_limit" as const,
    };
  }

  const token = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (input.ttlDays ?? DEFAULT_TTL_DAYS));

  const [row] = await db
    .insert(workspaceInvites)
    .values({
      workspaceId: input.ctx.workspace.id,
      email,
      role,
      clientId: role === "client" ? input.clientId! : null,
      token,
      invitedByUserId: input.ctx.userId,
      expiresAt,
    })
    .returning();

  await writeAuditLog({
    workspaceId: input.ctx.workspace.id,
    actorUserId: input.ctx.userId,
    action: "invite.create",
    entityType: "workspace_invite",
    entityId: row.id,
    meta: { email, role, clientId: row.clientId },
  });

  return {
    ok: true as const,
    invite: row,
    invitePath: inviteUrlPath(token),
  };
}

export async function revokeInvite(input: {
  ctx: TeamContext;
  inviteId: string;
}) {
  const invite = await db.query.workspaceInvites.findFirst({
    where: and(
      eq(workspaceInvites.id, input.inviteId),
      eq(workspaceInvites.workspaceId, input.ctx.workspace.id),
    ),
  });
  if (!invite) {
    return { ok: false as const, error: "Not found", status: 404 as const };
  }
  if (invite.acceptedAt || invite.revokedAt) {
    return { ok: false as const, error: "Invite already closed", status: 400 as const };
  }
  const [row] = await db
    .update(workspaceInvites)
    .set({ revokedAt: new Date() })
    .where(eq(workspaceInvites.id, invite.id))
    .returning();

  await writeAuditLog({
    workspaceId: input.ctx.workspace.id,
    actorUserId: input.ctx.userId,
    action: "invite.revoke",
    entityType: "workspace_invite",
    entityId: row.id,
  });

  return { ok: true as const, invite: row };
}

export async function getInviteByToken(token: string) {
  return db.query.workspaceInvites.findFirst({
    where: eq(workspaceInvites.token, token),
    with: {
      workspace: true,
      client: true,
    },
  });
}

export async function acceptInvite(input: {
  token: string;
  userId: string;
  userEmail: string;
}) {
  const invite = await getInviteByToken(input.token);
  if (!invite) {
    return { ok: false as const, error: "Invalid invite", status: 404 as const };
  }
  if (invite.revokedAt) {
    return { ok: false as const, error: "Invite revoked", status: 400 as const };
  }
  if (invite.acceptedAt) {
    return { ok: false as const, error: "Invite already accepted", status: 400 as const };
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, error: "Invite expired", status: 400 as const };
  }

  const email = input.userEmail.trim().toLowerCase();
  if (email !== invite.email.toLowerCase()) {
    return {
      ok: false as const,
      error: "Signed-in email must match the invite",
      status: 403 as const,
    };
  }

  const already = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, invite.workspaceId),
      eq(workspaceMembers.userId, input.userId),
    ),
  });
  if (already) {
    await db
      .update(workspaceInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvites.id, invite.id));
    return {
      ok: true as const,
      alreadyMember: true as const,
      member: already,
      workspaceId: invite.workspaceId,
    };
  }

  const limits = getPlanLimits(invite.workspace?.plan ?? "starter");
  const members = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspaceId, invite.workspaceId),
  });
  if (members.length >= limits.maxSeats) {
    return {
      ok: false as const,
      error: `Plan seat limit: ${limits.maxSeats}`,
      status: 403 as const,
    };
  }

  const role = normalizeRole(invite.role);
  const [member] = await db
    .insert(workspaceMembers)
    .values({
      workspaceId: invite.workspaceId,
      userId: input.userId,
      role,
      clientId: role === "client" ? invite.clientId : null,
    })
    .returning();

  await db
    .update(workspaceInvites)
    .set({ acceptedAt: new Date() })
    .where(eq(workspaceInvites.id, invite.id));

  await writeAuditLog({
    workspaceId: invite.workspaceId,
    actorUserId: input.userId,
    action: "invite.accept",
    entityType: "workspace_invite",
    entityId: invite.id,
    meta: { role, clientId: invite.clientId },
  });

  return {
    ok: true as const,
    alreadyMember: false as const,
    member,
    workspaceId: invite.workspaceId,
  };
}

/** Fingerprint for logs — never log raw tokens. */
export function tokenFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
}

export type { InviteStaffRole };
