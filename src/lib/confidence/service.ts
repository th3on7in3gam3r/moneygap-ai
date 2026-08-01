import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyGapOpportunities,
  reports,
  type ConfidenceIntelJson,
} from "@/db/schema";
import {
  createConfidenceSnapshot,
  getLatestConfidenceSnapshot,
  listConfidenceSnapshots,
} from "@/lib/confidence/snapshots";
import { isConfidenceIntelEnabled } from "@/lib/confidence/enrich";
import {
  listWorkspaceWebsites,
  resolveFocusWebsite,
  type WorkspaceWebsite,
} from "@/lib/websites/workspace";

type SiteFields = {
  websiteId: string | null;
  websiteName: string | null;
  websiteDomain: string | null;
};

function reportWhere(workspaceId: string, websiteId?: string | null) {
  return websiteId
    ? and(eq(reports.workspaceId, workspaceId), eq(reports.websiteId, websiteId))
    : eq(reports.workspaceId, workspaceId);
}

async function loadScopedReports(
  workspaceId: string,
  websiteId?: string | null,
  limit = 25,
) {
  return db.query.reports.findMany({
    where: reportWhere(workspaceId, websiteId),
    columns: { id: true, websiteId: true },
    with: {
      website: { columns: { id: true, name: true, domain: true } },
    },
    orderBy: [desc(reports.createdAt)],
    limit,
  });
}

function siteFromReport(r: {
  websiteId: string;
  website?: { id: string; name: string; domain: string } | null;
}): SiteFields {
  return {
    websiteId: r.websiteId,
    websiteName: r.website?.name ?? null,
    websiteDomain: r.website?.domain ?? null,
  };
}

function averageEngines(payloads: ConfidenceIntelJson[]) {
  const n = payloads.length;
  if (n === 0) return null;
  const engines = {
    business: 0,
    developer: 0,
    data: 0,
    benchmark: 0,
    ai: 0,
  };
  let overallSum = 0;
  let low = 0;
  const riskDistribution = { low: 0, medium: 0, high: 0 };
  for (const p of payloads) {
    overallSum += p.overall;
    engines.business += p.engines.business;
    engines.developer += p.engines.developer;
    engines.data += p.engines.data;
    engines.benchmark += p.engines.benchmark;
    engines.ai += p.engines.ai;
    if (p.overall < 55) low += 1;
    riskDistribution[p.risk.level] += 1;
  }
  return {
    overall: Math.round(overallSum / n),
    engines: {
      business: Math.round(engines.business / n),
      developer: Math.round(engines.developer / n),
      data: Math.round(engines.data / n),
      benchmark: Math.round(engines.benchmark / n),
      ai: Math.round(engines.ai / n),
    },
    lowConfidenceCount: low,
    riskDistribution,
    recommendationCount: n,
  };
}

const emptyOverview = (message: string, sites: WorkspaceWebsite[] = []) => ({
  enabled: false as const,
  overall: null,
  engines: null,
  lowConfidence: [] as {
    id: string;
    title: string;
    overall: number;
    riskLevel: string;
    reportId: string;
    websiteId: string | null;
    websiteName: string | null;
    websiteDomain: string | null;
  }[],
  history: [] as {
    id: string;
    overallScore: number;
    lowConfidenceCount: number;
    createdAt: string;
    reportId: string | null;
  }[],
  websites: sites,
  focusWebsite: null as { id: string; name: string; domain: string } | null,
  message,
});

export async function getConfidenceOverview(
  workspaceId: string,
  preferredWebsiteId?: string | null,
) {
  const sites = await listWorkspaceWebsites(workspaceId);
  const focus = resolveFocusWebsite(sites, preferredWebsiteId);

  if (!isConfidenceIntelEnabled()) {
    return {
      ...emptyOverview(
        "Confidence Intelligence is disabled (FEATURE_CONFIDENCE_INTEL=0).",
        sites,
      ),
      focusWebsite: focus
        ? { id: focus.id, name: focus.name, domain: focus.domain }
        : null,
    };
  }

  const focusId = focus?.id ?? null;
  const scopedReports = await loadScopedReports(workspaceId, focusId, 20);
  const reportIds = scopedReports.map((r) => r.id);
  const reportSite = new Map(
    scopedReports.map((r) => [r.id, siteFromReport(r)]),
  );

  let lowConfidence: {
    id: string;
    title: string;
    overall: number;
    riskLevel: string;
    reportId: string;
    websiteId: string | null;
    websiteName: string | null;
    websiteDomain: string | null;
  }[] = [];

  let sitePayloads: ConfidenceIntelJson[] = [];

  if (reportIds.length > 0) {
    const opps = await db.query.moneyGapOpportunities.findMany({
      where: and(
        inArray(moneyGapOpportunities.reportId, reportIds),
        isNotNull(moneyGapOpportunities.confidenceIntel),
      ),
      orderBy: [desc(moneyGapOpportunities.createdAt)],
      limit: 80,
    });
    sitePayloads = opps
      .map((o) => o.confidenceIntel)
      .filter((p): p is ConfidenceIntelJson => p != null);

    lowConfidence = opps
      .filter((o) => (o.confidenceIntel?.overall ?? 100) < 55)
      .slice(0, 15)
      .map((o) => {
        const site = reportSite.get(o.reportId);
        return {
          id: o.id,
          title: o.title,
          overall: o.confidenceIntel!.overall,
          riskLevel: o.confidenceIntel!.risk.level,
          reportId: o.reportId,
          websiteId: site?.websiteId ?? null,
          websiteName: site?.websiteName ?? null,
          websiteDomain: site?.websiteDomain ?? null,
        };
      });
  }

  const siteStats = averageEngines(sitePayloads);
  const latest = focusId
    ? null
    : await getLatestConfidenceSnapshot(workspaceId);
  const allHistory = await listConfidenceSnapshots(workspaceId, 30);
  const focusReportIdSet = new Set(reportIds);
  const history = focusId
    ? allHistory.filter(
        (h) => h.reportId && focusReportIdSet.has(h.reportId),
      )
    : allHistory.slice(0, 12);

  const overall = focusId
    ? (siteStats?.overall ?? null)
    : (latest?.overallScore ?? siteStats?.overall ?? null);
  const engines = focusId
    ? (siteStats?.engines ?? null)
    : (latest?.breakdown.engines ?? siteStats?.engines ?? null);

  return {
    enabled: true as const,
    overall,
    engines,
    lowConfidenceCount:
      siteStats?.lowConfidenceCount ??
      latest?.lowConfidenceCount ??
      lowConfidence.length,
    riskDistribution:
      siteStats?.riskDistribution ?? latest?.breakdown.riskDistribution ?? null,
    recommendationCount:
      siteStats?.recommendationCount ??
      latest?.breakdown.recommendationCount ??
      null,
    lowConfidence,
    history: history.slice(0, 12).map((h) => ({
      id: h.id,
      overallScore: h.overallScore,
      lowConfidenceCount: h.lowConfidenceCount,
      createdAt: h.createdAt.toISOString(),
      reportId: h.reportId,
      engines: h.breakdown.engines,
    })),
    websites: sites,
    focusWebsite: focus
      ? { id: focus.id, name: focus.name, domain: focus.domain }
      : null,
    message:
      overall != null
        ? null
        : "No confidence snapshots yet. Run a MoneyGap analysis to populate Confidence Center™.",
  };
}

/**
 * Rebuild confidence snapshot from the latest report's confidenceIntel
 * payloads for the focused website (or workspace).
 */
export async function refreshConfidenceSnapshot(
  workspaceId: string,
  preferredWebsiteId?: string | null,
) {
  const sites = await listWorkspaceWebsites(workspaceId);
  const focus = resolveFocusWebsite(sites, preferredWebsiteId);

  if (!isConfidenceIntelEnabled()) {
    return {
      ok: false as const,
      message: "Confidence Intelligence is disabled (FEATURE_CONFIDENCE_INTEL=0).",
      overview: await getConfidenceOverview(workspaceId, preferredWebsiteId),
    };
  }

  const workspaceReports = await loadScopedReports(
    workspaceId,
    focus?.id ?? null,
    25,
  );

  let reportId: string | null = null;
  let payloads: ConfidenceIntelJson[] = [];

  for (const report of workspaceReports) {
    const opps = await db.query.moneyGapOpportunities.findMany({
      where: and(
        eq(moneyGapOpportunities.reportId, report.id),
        isNotNull(moneyGapOpportunities.confidenceIntel),
      ),
      orderBy: [desc(moneyGapOpportunities.priorityScore)],
      limit: 100,
    });
    const found = opps
      .map((o) => o.confidenceIntel)
      .filter((p): p is ConfidenceIntelJson => p != null);
    if (found.length > 0) {
      reportId = report.id;
      payloads = found;
      break;
    }
  }

  if (payloads.length === 0) {
    return {
      ok: false as const,
      message:
        "No Confidence Intelligence payloads yet. Run a MoneyGap analysis first.",
      overview: await getConfidenceOverview(workspaceId, preferredWebsiteId),
    };
  }

  await createConfidenceSnapshot({
    workspaceId,
    reportId,
    payloads,
  });

  return {
    ok: true as const,
    message: null as string | null,
    overview: await getConfidenceOverview(workspaceId, preferredWebsiteId),
  };
}

export async function listConfidenceRecommendations(
  workspaceId: string,
  opts?: { lowOnly?: boolean; websiteId?: string | null },
) {
  const sites = await listWorkspaceWebsites(workspaceId);
  const focus = resolveFocusWebsite(sites, opts?.websiteId);
  const scopedReports = await loadScopedReports(
    workspaceId,
    focus?.id ?? opts?.websiteId ?? null,
    25,
  );
  const reportIds = scopedReports.map((r) => r.id);
  const reportSite = new Map(
    scopedReports.map((r) => [r.id, siteFromReport(r)]),
  );
  if (reportIds.length === 0) return [];

  const opps = await db.query.moneyGapOpportunities.findMany({
    where: and(
      inArray(moneyGapOpportunities.reportId, reportIds),
      isNotNull(moneyGapOpportunities.confidenceIntel),
    ),
    orderBy: [desc(moneyGapOpportunities.createdAt)],
    limit: 100,
  });

  return opps
    .filter((o) => {
      if (!o.confidenceIntel) return false;
      if (opts?.lowOnly) return o.confidenceIntel.overall < 55;
      return true;
    })
    .map((o) => {
      const site = reportSite.get(o.reportId);
      return {
        id: o.id,
        reportId: o.reportId,
        title: o.title,
        category: o.category,
        overall: o.confidenceIntel!.overall,
        engines: o.confidenceIntel!.engines,
        risk: o.confidenceIntel!.risk,
        impact: o.confidenceIntel!.impact,
        validationChecklist: o.confidenceIntel!.validationChecklist,
        websiteId: site?.websiteId ?? null,
        websiteName: site?.websiteName ?? null,
        websiteDomain: site?.websiteDomain ?? null,
      };
    });
}
