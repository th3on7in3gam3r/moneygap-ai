import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  actionProjects,
  audienceProfiles,
  businessProfiles,
  competitors,
  growthBriefs,
  reports,
  scoreSnapshots,
  websiteAnalyses,
} from "@/db/schema";

export async function assertReportAccess(reportId: string, userId: string) {
  const report = await db.query.reports.findFirst({
    where: and(eq(reports.id, reportId), eq(reports.type, "intelligence")),
    with: { website: true },
  });
  if (!report) return null;

  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.reportId, reportId),
  });
  if (!analysis || analysis.userId !== userId) return null;

  return { report, analysis };
}

export async function loadAdvisorContext(reportId: string) {
  const report = await db.query.reports.findFirst({
    where: eq(reports.id, reportId),
    with: {
      website: true,
      businessProfile: true,
      audienceProfile: true,
      moneyGapOpportunities: true,
      competitors: true,
      actionProjects: true,
    },
  });

  if (!report) return null;

  const business =
    report.businessProfile ??
    (await db.query.businessProfiles.findFirst({
      where: eq(businessProfiles.reportId, reportId),
    }));
  const audience =
    report.audienceProfile ??
    (await db.query.audienceProfiles.findFirst({
      where: eq(audienceProfiles.reportId, reportId),
    }));

  const gaps = [...(report.moneyGapOpportunities ?? [])].sort(
    (a, b) => (b.opportunityIndex ?? 0) - (a.opportunityIndex ?? 0),
  );
  const completed = gaps.filter(
    (g) =>
      g.implementationStatus === "completed" ||
      g.lifecycleStatus === "completed" ||
      g.lifecycleStatus === "improved" ||
      g.lifecycleStatus === "resolved",
  );
  const open = gaps.filter((g) => !completed.some((c) => c.id === g.id));

  const comps = await db.query.competitors.findMany({
    where: eq(competitors.reportId, reportId),
    limit: 7,
  });

  const projects = await db.query.actionProjects.findMany({
    where: eq(actionProjects.reportId, reportId),
  });

  const snapshots = await db.query.scoreSnapshots.findMany({
    where: eq(scoreSnapshots.websiteId, report.websiteId),
    orderBy: [desc(scoreSnapshots.createdAt)],
    limit: 8,
  });

  const latestBrief = await db.query.growthBriefs.findFirst({
    where: and(
      eq(growthBriefs.workspaceId, report.workspaceId),
      eq(growthBriefs.websiteId, report.websiteId),
    ),
    orderBy: [desc(growthBriefs.createdAt)],
  });

  return {
    report,
    website: report.website,
    business,
    audience,
    gaps,
    completedGaps: completed,
    openGaps: open,
    competitors: comps,
    projects,
    competitiveBrief: report.competitiveBrief,
    executiveBrief: report.executiveBrief ?? report.opportunitySummary,
    scoreHistory: snapshots
      .slice()
      .reverse()
      .map((s) => ({
        score: s.moneyGapScore,
        at: s.createdAt.toISOString().slice(0, 10),
        capturedOpportunity: s.capturedOpportunity,
      })),
    latestBrief: latestBrief
      ? {
          title: latestBrief.title,
          body: latestBrief.body.slice(0, 1200),
          createdAt: latestBrief.createdAt.toISOString().slice(0, 10),
        }
      : null,
  };
}

export function formatContextForPrompt(
  ctx: NonNullable<Awaited<ReturnType<typeof loadAdvisorContext>>>,
  focusedOpportunityId?: string | null,
): string {
  const focused = focusedOpportunityId
    ? ctx.gaps.find((g) => g.id === focusedOpportunityId)
    : null;

  return JSON.stringify(
    {
      website: {
        name: ctx.website?.name,
        domain: ctx.website?.domain,
        url: ctx.website?.url,
      },
      business: ctx.business,
      audience: ctx.audience,
      executiveBrief: ctx.executiveBrief,
      competitiveBrief: ctx.competitiveBrief,
      moneyGapScore: ctx.report.moneyGapScore,
      scoreHistory: ctx.scoreHistory,
      latestGrowthBrief: ctx.latestBrief,
      openGaps: ctx.openGaps.slice(0, 12).map((g) => ({
        id: g.id,
        title: g.title,
        moduleId: g.moduleId,
        severity: g.severity,
        opportunityIndex: g.opportunityIndex,
        whatsMissing: g.whatsMissing,
        businessImpact: g.businessImpact,
        estimatedAnnualRevenue: g.estimatedAnnualRevenue,
        implementationStatus: g.implementationStatus,
        lifecycleStatus: g.lifecycleStatus,
      })),
      completedGaps: ctx.completedGaps.slice(0, 10).map((g) => ({
        id: g.id,
        title: g.title,
        moduleId: g.moduleId,
        lifecycleStatus: g.lifecycleStatus,
        estimatedAnnualRevenue: g.estimatedAnnualRevenue,
      })),
      advisorMemory:
        "Do not re-recommend completed, improved, or resolved gaps. Prefer next-best open opportunities and acknowledge score/history progress.",
      competitors: ctx.competitors.slice(0, 7).map((c) => ({
        name: c.name,
        domain: c.domain,
        summary: c.businessSummary,
      })),
      projects: ctx.projects.map((p) => ({
        title: p.title,
        status: p.status,
        progress: p.progress,
        playbook: p.playbook,
      })),
      focusedGap: focused
        ? {
            id: focused.id,
            title: focused.title,
            whatsMissing: focused.whatsMissing,
            whyItMatters: focused.whyItMatters,
            businessImpact: focused.businessImpact,
            fixes: focused.fixes,
          }
        : null,
    },
    null,
    2,
  );
}
