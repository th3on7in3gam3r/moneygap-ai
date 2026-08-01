import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  growthAchievements,
  moneyGapOpportunities,
  workspaceAchievements,
} from "@/db/schema";
import { getGrowthJourney } from "@/lib/monitor/growth-journey";
import { findProjectsForWorkspace } from "@/lib/growth-os/dependencies";
import { recordTimelineEvent } from "@/lib/growth-os/timeline";

export const ACHIEVEMENT_CATALOG: {
  slug: string;
  title: string;
  description: string;
  sortOrder: number;
}[] = [
  {
    slug: "first_lead_magnet",
    title: "First Lead Magnet",
    description: "Completed a lead magnet opportunity or project.",
    sortOrder: 1,
  },
  {
    slug: "first_newsletter",
    title: "First Newsletter",
    description: "Completed a newsletter / email list initiative.",
    sortOrder: 2,
  },
  {
    slug: "authority_builder",
    title: "Authority Builder",
    description: "Completed an authority or backlink opportunity.",
    sortOrder: 3,
  },
  {
    slug: "growth_champion",
    title: "Growth Champion",
    description: "Completed 5 Action Projects™.",
    sortOrder: 4,
  },
  {
    slug: "revenue_optimizer",
    title: "Revenue Optimizer",
    description: "Captured $50k+ estimated annual opportunity.",
    sortOrder: 5,
  },
  {
    slug: "score_climber",
    title: "Score Climber",
    description: "Reached MoneyGap Score™ of 70+.",
    sortOrder: 6,
  },
];

export async function ensureAchievementCatalog() {
  for (const a of ACHIEVEMENT_CATALOG) {
    const existing = await db.query.growthAchievements.findFirst({
      where: eq(growthAchievements.slug, a.slug),
    });
    if (!existing) {
      await db.insert(growthAchievements).values(a);
    }
  }
}

async function unlock(workspaceId: string, slug: string) {
  const achievement = await db.query.growthAchievements.findFirst({
    where: eq(growthAchievements.slug, slug),
  });
  if (!achievement) return null;
  const existing = await db.query.workspaceAchievements.findFirst({
    where: and(
      eq(workspaceAchievements.workspaceId, workspaceId),
      eq(workspaceAchievements.achievementId, achievement.id),
    ),
  });
  if (existing) return existing;
  const [row] = await db
    .insert(workspaceAchievements)
    .values({ workspaceId, achievementId: achievement.id })
    .returning();
  await recordTimelineEvent({
    workspaceId,
    type: "milestone",
    title: achievement.title,
    body: achievement.description,
    meta: { slug },
  });
  return row;
}

export async function evaluateAchievements(workspaceId: string) {
  await ensureAchievementCatalog();
  const journey = await getGrowthJourney(workspaceId);
  const projects = await findProjectsForWorkspace(workspaceId);
  const completedProjects = projects.filter((p) => p.status === "completed");

  const closed = new Set(["completed", "improved", "resolved"]);
  const { inArray } = await import("drizzle-orm");
  const { reports } = await import("@/db/schema");
  const siteReports = await db.query.reports.findMany({
    where: and(eq(reports.workspaceId, workspaceId), eq(reports.type, "intelligence")),
    columns: { id: true },
  });
  const reportIds = siteReports.map((r) => r.id);
  let completedOpps: (typeof moneyGapOpportunities.$inferSelect)[] = [];
  if (reportIds.length > 0) {
    completedOpps = await db.query.moneyGapOpportunities.findMany({
      where: inArray(moneyGapOpportunities.reportId, reportIds),
    });
    completedOpps = completedOpps.filter(
      (o) => closed.has(o.lifecycleStatus) || o.implementationStatus === "completed",
    );
  }

  const hay = (o: { title: string; category: string; moduleId?: string | null }) =>
    `${o.title} ${o.category} ${o.moduleId ?? ""}`.toLowerCase();

  if (
    completedOpps.some((o) => /lead.?magnet|magnet/.test(hay(o))) ||
    completedProjects.some((p) => /lead.?magnet|magnet/.test(p.title.toLowerCase()))
  ) {
    await unlock(workspaceId, "first_lead_magnet");
  }
  if (
    completedOpps.some((o) => /newsletter|email list|subscribe/.test(hay(o))) ||
    completedProjects.some((p) => /newsletter|email/.test(p.title.toLowerCase()))
  ) {
    await unlock(workspaceId, "first_newsletter");
  }
  if (
    completedOpps.some((o) => /authority|backlink|guest/.test(hay(o)))
  ) {
    await unlock(workspaceId, "authority_builder");
  }
  if (completedProjects.length >= 5) {
    await unlock(workspaceId, "growth_champion");
  }
  if (journey.capturedOpportunity >= 50_000) {
    await unlock(workspaceId, "revenue_optimizer");
  }
  if (journey.avgMoneyGapScore >= 70) {
    await unlock(workspaceId, "score_climber");
  }
}

export async function listUnlockedAchievements(workspaceId: string) {
  await ensureAchievementCatalog();
  const unlocked = await db.query.workspaceAchievements.findMany({
    where: eq(workspaceAchievements.workspaceId, workspaceId),
  });
  const catalog = await db.query.growthAchievements.findMany();
  const byId = new Map(catalog.map((c) => [c.id, c]));
  return unlocked
    .map((u) => {
      const a = byId.get(u.achievementId);
      if (!a) return null;
      return {
        slug: a.slug,
        title: a.title,
        description: a.description,
        unlockedAt: u.unlockedAt.toISOString(),
      };
    })
    .filter(Boolean) as {
    slug: string;
    title: string;
    description: string;
    unlockedAt: string;
  }[];
}
