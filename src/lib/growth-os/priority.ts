import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyGapOpportunities,
  reports,
  websites,
  type BusinessGoalType,
} from "@/db/schema";
import { getWorkspaceBlockedOpportunityIds } from "@/lib/growth-os/dependencies";
import { activeGoalTypes, listActiveGoals } from "@/lib/growth-os/goals";
import { goalAlignmentScore } from "@/lib/growth-os/goal-types";

export type TodayPriority = {
  id: string;
  title: string;
  reportId: string;
  websiteId: string | null;
  websiteName: string | null;
  websiteDomain: string | null;
  opportunityIndex: number;
  estimatedAnnualRevenue: number | null;
  difficulty: string;
  severity: string;
  category: string;
  score: number;
  reason: string;
};

const CLOSED = new Set(["completed", "improved", "resolved"]);

function difficultyBoost(difficulty: string): number {
  const d = difficulty.toLowerCase();
  if (d === "easy") return 12;
  if (d === "medium") return 6;
  return 0;
}

export async function getTodayPriorities(
  workspaceId: string,
  limit = 3,
): Promise<TodayPriority[]> {
  const sites = await db.query.websites.findMany({
    where: eq(websites.workspaceId, workspaceId),
    columns: { id: true, name: true, domain: true },
  });
  if (sites.length === 0) return [];

  const siteById = new Map(sites.map((s) => [s.id, s]));

  const siteReports = await db.query.reports.findMany({
    where: and(
      eq(reports.workspaceId, workspaceId),
      eq(reports.type, "intelligence"),
    ),
    orderBy: [desc(reports.createdAt)],
  });
  const latestBySite = new Map<string, string>();
  const websiteIdByReport = new Map<string, string>();
  for (const r of siteReports) {
    if (!latestBySite.has(r.websiteId)) {
      latestBySite.set(r.websiteId, r.id);
      websiteIdByReport.set(r.id, r.websiteId);
    }
  }
  const reportIds = [...latestBySite.values()];
  if (reportIds.length === 0) return [];

  const opps = await db.query.moneyGapOpportunities.findMany({
    where: inArray(moneyGapOpportunities.reportId, reportIds),
  });

  const goals = await listActiveGoals(workspaceId);
  const goalTypes = activeGoalTypes(goals);
  const blocked = await getWorkspaceBlockedOpportunityIds(reportIds);

  const open = opps.filter(
    (o) =>
      !CLOSED.has(o.lifecycleStatus) &&
      o.implementationStatus !== "completed" &&
      !blocked.has(o.id),
  );

  const ranked = open.map((o) => {
    const align = goalAlignmentScore(goalTypes as BusinessGoalType[], o);
    const index = o.opportunityIndex ?? o.priorityScore ?? 50;
    const diff = difficultyBoost(o.difficulty);
    const progressBoost =
      o.implementationStatus === "in_progress" || o.lifecycleStatus === "in_progress"
        ? 15
        : o.implementationStatus === "saved"
          ? 5
          : 0;
    const severityBoost =
      o.severity === "critical" ? 10 : o.severity === "high" ? 5 : 0;
    const score = index * 0.5 + align + diff + progressBoost + severityBoost;
    const reasons: string[] = [];
    if (align > 0) reasons.push("Supports your goals");
    if (progressBoost > 0) reasons.push("Already in progress");
    if (diff >= 12) reasons.push("Quick win");
    if (severityBoost > 0) reasons.push(`${o.severity} severity`);
    if (reasons.length === 0) reasons.push("High Opportunity Index™");
    const websiteId = websiteIdByReport.get(o.reportId) ?? null;
    const site = websiteId ? siteById.get(websiteId) : null;
    return {
      id: o.id,
      title: o.title,
      reportId: o.reportId,
      websiteId,
      websiteName: site?.name ?? null,
      websiteDomain: site?.domain ?? null,
      opportunityIndex: index,
      estimatedAnnualRevenue: o.estimatedAnnualRevenue,
      difficulty: o.difficulty,
      severity: o.severity,
      category: o.category,
      score,
      reason: reasons.slice(0, 2).join(" · "),
    } satisfies TodayPriority;
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit);
}
