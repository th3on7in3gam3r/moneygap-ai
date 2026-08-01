import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { clients, reports, websites } from "@/db/schema";
import {
  hasCapability,
  isClientRole,
  type Capability,
} from "@/lib/agency/permissions";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { isTeamWorkspaceEnabled } from "@/lib/team/flag";

export type TeamContext = Awaited<ReturnType<typeof loadAgencyContext>> & {
  clientId: string | null;
  isClient: boolean;
};

export async function loadTeamContext(): Promise<TeamContext> {
  const ctx = await loadAgencyContext();
  const clientId = ctx.membership?.clientId ?? null;
  const isClient = isClientRole(ctx.role);
  return { ...ctx, clientId, isClient };
}

export async function requireTeamFeature() {
  if (!isTeamWorkspaceEnabled()) {
    return {
      ok: false as const,
      status: 503 as const,
      error: "Team Workspace™ is disabled (FEATURE_TEAM_WORKSPACE).",
    };
  }
  return { ok: true as const };
}

/** Staff capability gate that also soft-checks Team Workspace for invite/collab-only caps. */
export async function requireTeamCapability(cap: Capability) {
  const feature = await requireTeamFeature();
  if (!feature.ok) return { ...feature, ctx: null as TeamContext | null };

  const ctx = await loadTeamContext();
  if (ctx.isClient) {
    const clientCaps: Capability[] = [
      "viewOwnClient",
      "commentOwnClient",
      "approveOwnClient",
    ];
    if (!clientCaps.includes(cap) || !hasCapability(ctx.role, cap)) {
      return {
        ok: false as const,
        status: 403 as const,
        error: "Forbidden",
        ctx,
      };
    }
    return { ok: true as const, ctx };
  }
  if (!hasCapability(ctx.role, cap)) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "Forbidden",
      ctx,
    };
  }
  return { ok: true as const, ctx };
}

/**
 * Ensures a client-scoped member may only touch their assigned clientId.
 * Staff with viewClients may pass any client in the workspace (validated separately).
 */
export async function requireClientScope(targetClientId: string) {
  const ctx = await loadTeamContext();
  if (ctx.isClient) {
    if (!ctx.clientId || ctx.clientId !== targetClientId) {
      return {
        ok: false as const,
        status: 403 as const,
        error: "Forbidden",
        ctx,
      };
    }
    if (!hasCapability(ctx.role, "viewOwnClient")) {
      return {
        ok: false as const,
        status: 403 as const,
        error: "Forbidden",
        ctx,
      };
    }
    return { ok: true as const, ctx };
  }
  if (!hasCapability(ctx.role, "viewClients")) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "Forbidden",
      ctx,
    };
  }
  const row = await db.query.clients.findFirst({
    where: and(
      eq(clients.id, targetClientId),
      eq(clients.workspaceId, ctx.workspace.id),
    ),
  });
  if (!row) {
    return {
      ok: false as const,
      status: 404 as const,
      error: "Client not found",
      ctx,
    };
  }
  return { ok: true as const, ctx };
}

/** Website IDs visible to the current member (client-scoped or all). */
export async function listScopedWebsiteIds(
  ctx: TeamContext,
): Promise<string[] | "all"> {
  if (!ctx.isClient) return "all";
  if (!ctx.clientId) return [];
  const rows = await db.query.websites.findMany({
    where: and(
      eq(websites.workspaceId, ctx.workspace.id),
      eq(websites.clientId, ctx.clientId),
    ),
    columns: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function assertReportInClientScope(
  ctx: TeamContext,
  reportId: string,
): Promise<{ ok: true } | { ok: false; status: 403 | 404; error: string }> {
  if (!ctx.isClient) {
    const report = await db.query.reports.findFirst({
      where: and(
        eq(reports.id, reportId),
        eq(reports.workspaceId, ctx.workspace.id),
      ),
      columns: { id: true },
    });
    if (!report) return { ok: false, status: 404, error: "Report not found" };
    return { ok: true };
  }
  const websiteIds = await listScopedWebsiteIds(ctx);
  if (websiteIds === "all" || websiteIds.length === 0) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  const report = await db.query.reports.findFirst({
    where: and(
      eq(reports.id, reportId),
      eq(reports.workspaceId, ctx.workspace.id),
      inArray(reports.websiteId, websiteIds),
    ),
    columns: { id: true },
  });
  if (!report) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true };
}
