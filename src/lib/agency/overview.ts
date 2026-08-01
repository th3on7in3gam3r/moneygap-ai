import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  actionProjects,
  clients,
  moneyGapOpportunities,
  reports,
  websites,
} from "@/db/schema";

export async function getAgencyOverview(workspaceId: string) {
  const clientRows = await db.query.clients.findMany({
    where: and(eq(clients.workspaceId, workspaceId), eq(clients.status, "active")),
  });

  const siteRows = await db.query.websites.findMany({
    where: eq(websites.workspaceId, workspaceId),
  });

  const reportRows = await db.query.reports.findMany({
    where: and(
      eq(reports.workspaceId, workspaceId),
      eq(reports.type, "intelligence"),
    ),
    orderBy: [desc(reports.createdAt)],
  });

  const latestBySite = new Map<string, (typeof reportRows)[0]>();
  for (const r of reportRows) {
    if (!latestBySite.has(r.websiteId)) latestBySite.set(r.websiteId, r);
  }
  const latest = [...latestBySite.values()];
  const avgMoneyGapScore =
    latest.length === 0
      ? 0
      : Math.round(
          latest.reduce((s, r) => s + r.moneyGapScore, 0) / latest.length,
        );

  const reportIds = latest.map((r) => r.id);
  let completedRecs = 0;
  let estimatedOpportunities = 0;

  if (reportIds.length > 0) {
    const ops = await db.query.moneyGapOpportunities.findMany({
      where: inArray(moneyGapOpportunities.reportId, reportIds),
    });
    completedRecs = ops.filter(
      (o) =>
        o.implementationStatus === "completed" ||
        o.lifecycleStatus === "completed" ||
        o.lifecycleStatus === "resolved" ||
        o.lifecycleStatus === "improved",
    ).length;
    estimatedOpportunities = ops.reduce(
      (s, o) => s + (o.estimatedAnnualRevenue ?? 0),
      0,
    );

    const projects = await db.query.actionProjects.findMany({
      where: inArray(actionProjects.reportId, reportIds),
    });
    completedRecs += projects.filter((p) => p.status === "completed").length;
  }

  return {
    totalClients: clientRows.length,
    reportsGenerated: reportRows.length,
    avgMoneyGapScore,
    completedRecommendations: completedRecs,
    estimatedOpportunitiesFound: estimatedOpportunities,
    websitesManaged: siteRows.length,
    clientsNeedingAttention: latest
      .filter((r) => r.moneyGapScore >= 60)
      .slice(0, 8)
      .map((r) => ({
        reportId: r.id,
        websiteId: r.websiteId,
        moneyGapScore: r.moneyGapScore,
        title: r.title,
      })),
  };
}
