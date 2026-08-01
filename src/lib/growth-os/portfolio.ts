import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyGapOpportunities,
  reports,
  websites,
} from "@/db/schema";

export type OpportunityPortfolio = {
  estimatedAnnual: number;
  completed: number;
  inProgress: number;
  remaining: number;
  openCount: number;
  completedCount: number;
  inProgressCount: number;
};

const CLOSED = new Set(["completed", "improved", "resolved"]);
const IN_PROGRESS = new Set(["in_progress", "planned"]);

export async function getInvestmentPortfolio(
  workspaceId: string,
): Promise<OpportunityPortfolio> {
  const sites = await db.query.websites.findMany({
    where: eq(websites.workspaceId, workspaceId),
    columns: { id: true },
  });
  if (sites.length === 0) {
    return {
      estimatedAnnual: 0,
      completed: 0,
      inProgress: 0,
      remaining: 0,
      openCount: 0,
      completedCount: 0,
      inProgressCount: 0,
    };
  }

  const siteReports = await db.query.reports.findMany({
    where: and(
      eq(reports.workspaceId, workspaceId),
      eq(reports.type, "intelligence"),
    ),
    orderBy: [desc(reports.createdAt)],
  });
  const latestBySite = new Map<string, string>();
  for (const r of siteReports) {
    if (!latestBySite.has(r.websiteId)) latestBySite.set(r.websiteId, r.id);
  }
  const reportIds = [...latestBySite.values()];
  if (reportIds.length === 0) {
    return {
      estimatedAnnual: 0,
      completed: 0,
      inProgress: 0,
      remaining: 0,
      openCount: 0,
      completedCount: 0,
      inProgressCount: 0,
    };
  }

  const opps = await db.query.moneyGapOpportunities.findMany({
    where: inArray(moneyGapOpportunities.reportId, reportIds),
  });

  let completed = 0;
  let inProgress = 0;
  let remaining = 0;
  let completedCount = 0;
  let inProgressCount = 0;
  let openCount = 0;

  for (const o of opps) {
    const amt = o.estimatedAnnualRevenue ?? 0;
    const life = o.lifecycleStatus;
    const impl = o.implementationStatus;
    if (CLOSED.has(life) || impl === "completed") {
      completed += amt;
      completedCount += 1;
    } else if (IN_PROGRESS.has(life) || impl === "in_progress") {
      inProgress += amt;
      inProgressCount += 1;
    } else {
      remaining += amt;
      openCount += 1;
    }
  }

  return {
    estimatedAnnual: completed + inProgress + remaining,
    completed,
    inProgress,
    remaining,
    openCount,
    completedCount,
    inProgressCount,
  };
}
