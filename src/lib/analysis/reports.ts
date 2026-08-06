import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  actionProjects,
  analysisComparisons,
  moneyGapOpportunities,
  reports,
  websiteAnalyses,
} from "@/db/schema";
import { assertWebsiteAccess } from "@/lib/monitor/access";

export async function getIntelligenceReport(reportId: string, userId: string) {
  const report = await db.query.reports.findFirst({
    where: and(eq(reports.id, reportId), eq(reports.type, "intelligence")),
    with: {
      website: true,
      businessProfile: true,
      audienceProfile: true,
      contentAnalysis: true,
      insights: true,
      analysis: true,
      moneyGapOpportunities: true,
      competitors: true,
      actionProjects: {
        with: { tasks: true },
      },
    },
  });

  if (!report) return null;

  const analysis =
    report.analysis ??
    (await db.query.websiteAnalyses.findFirst({
      where: eq(websiteAnalyses.reportId, reportId),
    }));

  if (!analysis || analysis.userId !== userId) {
    return null;
  }

  const opportunities = [...(report.moneyGapOpportunities ?? [])].sort(
    (a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return (b.opportunityIndex ?? 0) - (a.opportunityIndex ?? 0);
    },
  );

  const competitorsList = [...(report.competitors ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const projects = report.actionProjects ?? [];
  const gapsClosed = opportunities.filter(
    (o) =>
      o.implementationStatus === "completed" ||
      o.lifecycleStatus === "completed" ||
      o.lifecycleStatus === "improved" ||
      o.lifecycleStatus === "resolved",
  );
  const projectsCompleted = projects.filter((p) => p.status === "completed").length;
  const opportunityCaptured = gapsClosed.reduce(
    (sum, o) => sum + (o.estimatedAnnualRevenue ?? 0),
    0,
  );

  const impactHistory = gapsClosed.map((o) => ({
    title: o.title,
    impact: o.estimatedAnnualRevenue ?? 0,
    lifecycleStatus: o.lifecycleStatus,
    at: (o.completedAt ?? o.createdAt).toISOString().slice(0, 10),
  }));

  const comparison = await db.query.analysisComparisons.findFirst({
    where: eq(analysisComparisons.currentReportId, reportId),
    orderBy: [desc(analysisComparisons.createdAt)],
  });

  const timeline = [
    ...gapsClosed
      .filter((o) => o.completedAt)
      .map((o) => ({
        title: o.title,
        at: o.completedAt!.toISOString().slice(0, 10),
        ts: o.completedAt!.getTime(),
      })),
    ...projects
      .filter((p) => p.status === "completed")
      .map((p) => ({
        title: p.title,
        at: p.updatedAt.toISOString().slice(0, 10),
        ts: p.updatedAt.getTime(),
      })),
  ]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 12)
    .map(({ title, at }) => ({ title, at }));

  return {
    ...report,
    analysis,
    moneyGapOpportunities: opportunities,
    competitors: competitorsList,
    progressStats: {
      projectsCompleted,
      gapsClosed: gapsClosed.length,
      recommendationsImplemented: gapsClosed.length + projectsCompleted,
      opportunityCaptured,
      timeline,
      impactHistory,
      scoreDelta: comparison?.scoreDelta ?? null,
      comparisonSummary: comparison?.summary ?? null,
    },
  };
}

export async function listUserIntelligenceReports(userId: string) {
  const analyses = await db.query.websiteAnalyses.findMany({
    where: and(
      eq(websiteAnalyses.userId, userId),
      eq(websiteAnalyses.status, "completed"),
    ),
    with: {
      report: true,
      website: true,
    },
    orderBy: [desc(websiteAnalyses.completedAt)],
  });

  return analyses.filter((a) => a.report);
}

export async function listUserOpenOpportunities(userId: string) {
  const analyses = await db.query.websiteAnalyses.findMany({
    where: and(
      eq(websiteAnalyses.userId, userId),
      eq(websiteAnalyses.status, "completed"),
    ),
    columns: { id: true, reportId: true },
  });

  const reportIds = analyses
    .map((a) => a.reportId)
    .filter((id): id is string => Boolean(id));

  if (reportIds.length === 0) return [];

  const rows = await db.query.moneyGapOpportunities.findMany({
    where: and(
      inArray(moneyGapOpportunities.reportId, reportIds),
      ne(moneyGapOpportunities.implementationStatus, "completed"),
    ),
    with: {
      report: {
        with: { website: true },
      },
    },
    orderBy: [desc(moneyGapOpportunities.priorityScore)],
  });

  return rows;
}

export async function listUserWebsites(userId: string) {
  const analyses = await db.query.websiteAnalyses.findMany({
    where: eq(websiteAnalyses.userId, userId),
    with: { website: true, report: true },
    orderBy: [desc(websiteAnalyses.createdAt)],
  });

  const bySite = new Map<
    string,
    {
      website: NonNullable<(typeof analyses)[0]["website"]>;
      latestReport: (typeof analyses)[0]["report"];
      latestAnalysisId: string;
      lastScanAt: Date | null;
    }
  >();

  for (const a of analyses) {
    if (!a.website) continue;
    if (!bySite.has(a.websiteId)) {
      bySite.set(a.websiteId, {
        website: a.website,
        latestReport: a.report,
        latestAnalysisId: a.id,
        lastScanAt: a.completedAt ?? a.createdAt ?? null,
      });
    }
  }

  const reportIds = [...bySite.values()]
    .map((s) => s.latestReport?.id)
    .filter((id): id is string => Boolean(id));

  const openByReport = new Map<string, number>();
  const completedByReport = new Map<string, number>();
  if (reportIds.length > 0) {
    const oppRows = await db.query.moneyGapOpportunities.findMany({
      where: inArray(moneyGapOpportunities.reportId, reportIds),
      columns: { reportId: true, implementationStatus: true },
    });
    for (const row of oppRows) {
      if (row.implementationStatus === "completed") {
        completedByReport.set(
          row.reportId,
          (completedByReport.get(row.reportId) ?? 0) + 1,
        );
      } else {
        openByReport.set(
          row.reportId,
          (openByReport.get(row.reportId) ?? 0) + 1,
        );
      }
    }
  }

  return [...bySite.values()].map((s) => ({
    ...s,
    openGapsCount: s.latestReport
      ? (openByReport.get(s.latestReport.id) ?? 0)
      : 0,
    completedImprovementsCount: s.latestReport
      ? (completedByReport.get(s.latestReport.id) ?? 0)
      : 0,
  }));
}

/** Property hub for My Websites™ — workspace-scoped. */
export async function getWebsiteWorkspace(
  userId: string,
  websiteId: string,
) {
  const access = await assertWebsiteAccess(websiteId, userId);
  if (!access) return null;

  const { website } = access;

  const analyses = await db.query.websiteAnalyses.findMany({
    where: eq(websiteAnalyses.websiteId, websiteId),
    with: { report: true },
    orderBy: [desc(websiteAnalyses.createdAt)],
    limit: 40,
  });

  const siteReports = await db.query.reports.findMany({
    where: and(
      eq(reports.websiteId, websiteId),
      eq(reports.type, "intelligence"),
    ),
    orderBy: [desc(reports.createdAt)],
    limit: 40,
  });

  const latestReport =
    analyses.find((a) => a.report)?.report ?? siteReports[0] ?? null;

  let opportunities: (typeof moneyGapOpportunities.$inferSelect)[] = [];
  let openGapsCount = 0;
  let completedImprovementsCount = 0;

  if (latestReport) {
    opportunities = await db.query.moneyGapOpportunities.findMany({
      where: eq(moneyGapOpportunities.reportId, latestReport.id),
      orderBy: [desc(moneyGapOpportunities.priorityScore)],
    });
    for (const o of opportunities) {
      if (o.implementationStatus === "completed") {
        completedImprovementsCount += 1;
      } else {
        openGapsCount += 1;
      }
    }
  }

  return {
    website,
    latestReport,
    openGapsCount,
    completedImprovementsCount,
    scanHistory: analyses.map((a) => ({
      id: a.id,
      status: a.status,
      scanProfile: a.scanProfile ?? null,
      createdAt: a.createdAt,
      completedAt: a.completedAt,
      reportId: a.reportId,
      moneyGapScore: a.report?.moneyGapScore ?? null,
      revenueAtRisk: a.report?.revenueAtRisk ?? null,
    })),
    reports: siteReports.map((r) => ({
      id: r.id,
      title: r.title,
      moneyGapScore: r.moneyGapScore,
      revenueAtRisk: r.revenueAtRisk,
      createdAt: r.createdAt,
    })),
    opportunities,
  };
}

export async function listReportProjects(reportId: string) {
  return db.query.actionProjects.findMany({
    where: eq(actionProjects.reportId, reportId),
    with: { tasks: true },
    orderBy: [desc(actionProjects.updatedAt)],
  });
}
