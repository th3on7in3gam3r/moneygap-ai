import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  apiRequestLogs,
  clients,
  reports,
  scoreSnapshots,
  websiteAnalyses,
  websites,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import { getCurrentPeriodUsage, getPlanDefinition, getWorkspacePlanId } from "@/lib/billing";
import { listApiKeys } from "@/lib/platform/keys";
import {
  getOrCreateEnterpriseSettings,
} from "@/lib/platform/enterprise";

export async function getDeveloperUsageSummary(workspaceId: string) {
  const planId = await getWorkspacePlanId(workspaceId);
  const plan = getPlanDefinition(planId);
  const usage = await getCurrentPeriodUsage(workspaceId);
  const periodStart = usage.periodStart;

  const [reqCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(apiRequestLogs)
    .where(
      and(
        eq(apiRequestLogs.workspaceId, workspaceId),
        gte(apiRequestLogs.createdAt, periodStart),
      ),
    );

  const [errCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(apiRequestLogs)
    .where(
      and(
        eq(apiRequestLogs.workspaceId, workspaceId),
        gte(apiRequestLogs.createdAt, periodStart),
        gte(apiRequestLogs.statusCode, 400),
      ),
    );

  const recent = await db.query.apiRequestLogs.findMany({
    where: eq(apiRequestLogs.workspaceId, workspaceId),
    orderBy: [desc(apiRequestLogs.createdAt)],
    limit: 40,
  });

  const keys = await listApiKeys(workspaceId);

  return {
    planId,
    planName: plan.name,
    hasApiAccess: plan.features.includes("api_access"),
    limits: {
      apiCallsPerMonth: plan.limits.apiCallsPerMonth,
      analysesPerMonth: plan.limits.analysesPerMonth,
    },
    usage: {
      api_call: usage.counters.api_call ?? 0,
      website_analysis: usage.counters.website_analysis ?? 0,
      requestsThisMonth: reqCount?.count ?? 0,
      errorsThisMonth: errCount?.count ?? 0,
      periodStart: usage.periodStart.toISOString(),
      periodEnd: usage.periodEnd.toISOString(),
    },
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      environment: k.environment,
      scopes: k.scopes,
      rateLimitPerMinute: k.rateLimitPerMinute,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    })),
    recentRequests: recent.map((r) => ({
      id: r.id,
      method: r.method,
      path: r.path,
      statusCode: r.statusCode,
      errorCode: r.errorCode,
      durationMs: r.durationMs,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function getEnterpriseOverview(workspaceId: string) {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });
  if (!workspace) return null;

  const settings = await getOrCreateEnterpriseSettings(workspaceId);
  const planId = await getWorkspacePlanId(workspaceId);
  const usage = await getCurrentPeriodUsage(workspaceId);

  const [memberCount] = await db
    .select({ count: count() })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  const [siteCount] = await db
    .select({ count: count() })
    .from(websites)
    .where(eq(websites.workspaceId, workspaceId));
  const [reportCount] = await db
    .select({ count: count() })
    .from(reports)
    .where(eq(reports.workspaceId, workspaceId));
  const [clientCount] = await db
    .select({ count: count() })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId));
  const [analysisCount] = await db
    .select({ count: count() })
    .from(websiteAnalyses)
    .where(eq(websiteAnalyses.workspaceId, workspaceId));

  const workspaceSites = await db.query.websites.findMany({
    where: eq(websites.workspaceId, workspaceId),
    columns: { id: true },
  });
  const siteIds = workspaceSites.map((s) => s.id);

  let latestScores: {
    websiteId: string;
    moneyGapScore: number;
    createdAt: Date;
  }[] = [];
  if (siteIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    latestScores = await db.query.scoreSnapshots.findMany({
      where: inArray(scoreSnapshots.websiteId, siteIds),
      orderBy: [desc(scoreSnapshots.createdAt)],
      limit: 20,
      columns: {
        websiteId: true,
        moneyGapScore: true,
        createdAt: true,
      },
    });
  }

  const avgScore =
    latestScores.length === 0
      ? null
      : Math.round(
          latestScores.reduce((s, row) => s + (row.moneyGapScore ?? 0), 0) /
            latestScores.length,
        );

  return {
    organization: {
      id: workspace.id,
      name: workspace.name,
      type: workspace.type,
      plan: planId,
      agencyName: workspace.agencyName,
    },
    counts: {
      users: memberCount?.count ?? 0,
      websites: siteCount?.count ?? 0,
      reports: reportCount?.count ?? 0,
      clients: clientCount?.count ?? 0,
      analyses: analysisCount?.count ?? 0,
    },
    growth: {
      averageMoneyGapScore: avgScore,
      recentScores: latestScores.slice(0, 8).map((s) => ({
        websiteId: s.websiteId,
        score: s.moneyGapScore,
        createdAt: s.createdAt.toISOString(),
      })),
    },
    usage: usage.counters,
    enterprise: {
      ssoEnabled: settings.ssoEnabled,
      ssoProvider: settings.ssoProvider,
      dataRetentionDays: settings.dataRetentionDays,
      dedicatedEnvironment: settings.dedicatedEnvironment,
      auditExportEnabled: settings.auditExportEnabled,
      note: "SSO IdP wiring and dedicated environments ship with enterprise onboarding.",
    },
  };
}
