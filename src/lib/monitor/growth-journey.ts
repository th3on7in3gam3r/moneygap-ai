import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  actionProjects,
  growthBriefs,
  moneyGapOpportunities,
  reports,
  scoreSnapshots,
  websites,
} from "@/db/schema";

export async function getGrowthJourney(workspaceId: string) {
  const sites = await db.query.websites.findMany({
    where: eq(websites.workspaceId, workspaceId),
  });
  const siteIds = sites.map((s) => s.id);

  const empty = {
    avgMoneyGapScore: 0,
    gapsClosed: 0,
    projectsCompleted: 0,
    capturedOpportunity: 0,
    remainingOpportunity: 0,
    openGaps: 0,
    totalGaps: 0,
    nextBestAction: null as null | {
      id: string;
      title: string;
      reportId: string;
      opportunityIndex: number;
      estimatedAnnualRevenue: number | null;
      websiteName: string | null;
      websiteDomain: string | null;
    },
    scoreHistory: [] as { date: string; score: number }[],
    latestBrief: null as null | {
      id: string;
      title: string;
      body: string;
      createdAt: string;
    },
  };

  if (siteIds.length === 0) return empty;

  const siteReports = await db.query.reports.findMany({
    where: and(
      eq(reports.workspaceId, workspaceId),
      eq(reports.type, "intelligence"),
    ),
    orderBy: [desc(reports.createdAt)],
  });

  const latestBySite = new Map<string, (typeof siteReports)[0]>();
  for (const r of siteReports) {
    if (!latestBySite.has(r.websiteId)) latestBySite.set(r.websiteId, r);
  }
  const latestReports = [...latestBySite.values()];
  const latestReportIds = latestReports.map((r) => r.id);

  const avgMoneyGapScore =
    latestReports.length === 0
      ? 0
      : Math.round(
          latestReports.reduce((s, r) => s + r.moneyGapScore, 0) /
            latestReports.length,
        );

  let opportunities: (typeof moneyGapOpportunities.$inferSelect)[] = [];
  if (latestReportIds.length > 0) {
    opportunities = await db.query.moneyGapOpportunities.findMany({
      where: inArray(moneyGapOpportunities.reportId, latestReportIds),
    });
  }

  const closedStatuses = new Set(["completed", "improved", "resolved"]);
  const gapsClosed = opportunities.filter((o) =>
    closedStatuses.has(o.lifecycleStatus),
  ).length;
  const openGaps = opportunities.filter(
    (o) => !closedStatuses.has(o.lifecycleStatus),
  ).length;
  const totalGaps = opportunities.length;

  const capturedOpportunity = opportunities
    .filter((o) => closedStatuses.has(o.lifecycleStatus))
    .reduce((s, o) => s + (o.estimatedAnnualRevenue ?? 0), 0);
  const remainingOpportunity = opportunities
    .filter((o) => !closedStatuses.has(o.lifecycleStatus))
    .reduce((s, o) => s + (o.estimatedAnnualRevenue ?? 0), 0);

  let projectsCompleted = 0;
  if (latestReportIds.length > 0) {
    const projects = await db.query.actionProjects.findMany({
      where: inArray(actionProjects.reportId, latestReportIds),
    });
    projectsCompleted = projects.filter((p) => p.status === "completed").length;
  }

  const openSorted = opportunities
    .filter((o) => !closedStatuses.has(o.lifecycleStatus))
    .sort((a, b) => (b.opportunityIndex ?? 0) - (a.opportunityIndex ?? 0));
  const top = openSorted[0];
  const topReport = top
    ? latestReports.find((r) => r.id === top.reportId)
    : null;
  const topSite = topReport
    ? sites.find((s) => s.id === topReport.websiteId)
    : null;
  const nextBestAction = top
    ? {
        id: top.id,
        title: top.title,
        reportId: top.reportId,
        opportunityIndex: top.opportunityIndex,
        estimatedAnnualRevenue: top.estimatedAnnualRevenue,
        websiteName: topSite?.name ?? null,
        websiteDomain: topSite?.domain ?? null,
      }
    : null;

  const snapshots = await db.query.scoreSnapshots.findMany({
    where: inArray(scoreSnapshots.websiteId, siteIds),
    orderBy: [desc(scoreSnapshots.createdAt)],
    limit: 60,
  });

  const byDay = new Map<string, { sum: number; n: number }>();
  for (const s of snapshots.slice().reverse()) {
    const date = s.createdAt.toISOString().slice(0, 10);
    const cur = byDay.get(date) ?? { sum: 0, n: 0 };
    cur.sum += s.moneyGapScore;
    cur.n += 1;
    byDay.set(date, cur);
  }
  const scoreHistory = [...byDay.entries()].map(([date, v]) => ({
    date,
    score: Math.round(v.sum / v.n),
  }));

  const latestBrief = await db.query.growthBriefs.findFirst({
    where: eq(growthBriefs.workspaceId, workspaceId),
    orderBy: [desc(growthBriefs.createdAt)],
  });

  return {
    avgMoneyGapScore,
    gapsClosed,
    projectsCompleted,
    capturedOpportunity,
    remainingOpportunity,
    openGaps,
    totalGaps,
    nextBestAction,
    scoreHistory,
    latestBrief: latestBrief
      ? {
          id: latestBrief.id,
          title: latestBrief.title,
          body: latestBrief.body,
          createdAt: latestBrief.createdAt.toISOString(),
        }
      : null,
  };
}

export async function getOpportunityPortfolio(workspaceId: string) {
  const journey = await getGrowthJourney(workspaceId);
  return {
    open: journey.openGaps,
    completed: journey.gapsClosed,
    total: journey.totalGaps,
    captured: journey.capturedOpportunity,
    remaining: journey.remainingOpportunity,
  };
}
