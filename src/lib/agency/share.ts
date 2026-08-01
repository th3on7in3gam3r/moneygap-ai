import { createHash, randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  clientShareLinks,
  clients,
  moneyGapOpportunities,
  reports,
  shareApprovals,
  shareComments,
  type SharePermissions,
} from "@/db/schema";
import { getBrandSettings } from "@/lib/agency/brand";
import { writeAuditLog } from "@/lib/agency/audit";

function newToken() {
  return createHash("sha256")
    .update(randomBytes(32))
    .digest("hex")
    .slice(0, 48);
}

export async function createShareLink(input: {
  workspaceId: string;
  clientId: string;
  reportId: string;
  createdBy: string;
  permissions?: Partial<SharePermissions>;
  expiresAt?: Date | null;
}) {
  const client = await db.query.clients.findFirst({
    where: and(
      eq(clients.id, input.clientId),
      eq(clients.workspaceId, input.workspaceId),
    ),
  });
  if (!client) return { ok: false as const, error: "Client not found" };

  const report = await db.query.reports.findFirst({
    where: and(eq(reports.id, input.reportId), eq(reports.workspaceId, input.workspaceId)),
  });
  if (!report) return { ok: false as const, error: "Report not found" };

  const permissions: SharePermissions = {
    view: true,
    download: input.permissions?.download ?? true,
    comment: input.permissions?.comment ?? false,
    approve: input.permissions?.approve ?? false,
  };

  const token = newToken();
  const [row] = await db
    .insert(clientShareLinks)
    .values({
      clientId: input.clientId,
      reportId: input.reportId,
      token,
      permissions,
      expiresAt: input.expiresAt ?? null,
      createdBy: input.createdBy,
    })
    .returning();

  await writeAuditLog({
    workspaceId: input.workspaceId,
    actorUserId: input.createdBy,
    action: "share.create",
    entityType: "share_link",
    entityId: row.id,
  });

  return { ok: true as const, share: row };
}

export async function resolveShareToken(token: string) {
  const link = await db.query.clientShareLinks.findFirst({
    where: and(eq(clientShareLinks.token, token), isNull(clientShareLinks.revokedAt)),
  });
  if (!link) return null;
  if (link.expiresAt && link.expiresAt < new Date()) return null;

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, link.clientId),
  });
  if (!client) return null;

  const report = await db.query.reports.findFirst({
    where: eq(reports.id, link.reportId),
    with: {
      website: true,
      moneyGapOpportunities: true,
    },
  });
  if (!report) return null;

  const brand = await getBrandSettings(client.workspaceId);
  const comments = await db.query.shareComments.findMany({
    where: eq(shareComments.shareLinkId, link.id),
  });
  const approvals = await db.query.shareApprovals.findMany({
    where: eq(shareApprovals.shareLinkId, link.id),
  });

  const opportunities = [...(report.moneyGapOpportunities ?? [])]
    .sort((a, b) => (b.opportunityIndex ?? 0) - (a.opportunityIndex ?? 0))
    .slice(0, 20);

  return {
    link,
    client,
    brand,
    report: {
      id: report.id,
      title: report.title,
      moneyGapScore: report.moneyGapScore,
      revenueAtRisk: report.revenueAtRisk,
      capturePotential: report.capturePotential,
      executiveBrief: report.executiveBrief ?? report.opportunitySummary,
      website: report.website,
    },
    opportunities: opportunities.map((o) => ({
      id: o.id,
      title: o.title,
      summary: o.summary ?? o.whatsMissing,
      severity: o.severity,
      opportunityIndex: o.opportunityIndex,
      estimatedAnnualRevenue: o.estimatedAnnualRevenue,
    })),
    comments,
    approvals,
  };
}

export async function addShareComment(input: {
  token: string;
  authorName: string;
  authorEmail?: string | null;
  body: string;
}) {
  const resolved = await resolveShareToken(input.token);
  if (!resolved?.link.permissions.comment) {
    return { ok: false as const, error: "Comments not allowed" };
  }
  const [row] = await db
    .insert(shareComments)
    .values({
      shareLinkId: resolved.link.id,
      authorName: input.authorName,
      authorEmail: input.authorEmail ?? null,
      body: input.body,
    })
    .returning();
  return { ok: true as const, comment: row };
}

export async function addShareApproval(input: {
  token: string;
  opportunityId?: string | null;
  decision: "approved" | "rejected";
  note?: string | null;
  authorName: string;
}) {
  const resolved = await resolveShareToken(input.token);
  if (!resolved?.link.permissions.approve) {
    return { ok: false as const, error: "Approvals not allowed" };
  }
  if (input.opportunityId) {
    const op = await db.query.moneyGapOpportunities.findFirst({
      where: eq(moneyGapOpportunities.id, input.opportunityId),
    });
    if (!op || op.reportId !== resolved.report.id) {
      return { ok: false as const, error: "Opportunity not found" };
    }
  }
  const [row] = await db
    .insert(shareApprovals)
    .values({
      shareLinkId: resolved.link.id,
      opportunityId: input.opportunityId ?? null,
      decision: input.decision,
      note: input.note ?? null,
      authorName: input.authorName,
    })
    .returning();
  return { ok: true as const, approval: row };
}
