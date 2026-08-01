import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { actionProjects, coachNudges, reports } from "@/db/schema";
import { getGrowthJourney } from "@/lib/monitor/growth-journey";
import { getTodayPriorities } from "@/lib/growth-os/priority";

export type CoachNudgeView = {
  id: string;
  severity: string;
  message: string;
  ctaLabel: string | null;
  ctaHref: string | null;
};

/** Regenerate soft coach nudges for the workspace (idempotent-ish daily). */
export async function refreshCoachNudges(workspaceId: string): Promise<CoachNudgeView[]> {
  const journey = await getGrowthJourney(workspaceId);
  const priorities = await getTodayPriorities(workspaceId, 1);
  const messages: {
    severity: string;
    message: string;
    ctaLabel?: string;
    ctaHref?: string;
  }[] = [];

  // Delayed projects
  const siteReports = await db.query.reports.findMany({
    where: and(eq(reports.workspaceId, workspaceId), eq(reports.type, "intelligence")),
    columns: { id: true },
  });
  const reportIds = siteReports.map((r) => r.id);
  if (reportIds.length > 0) {
    const projects = await db.query.actionProjects.findMany({
      where: inArray(actionProjects.reportId, reportIds),
    });
    const now = Date.now();
    for (const p of projects) {
      if (p.status !== "active" && p.status !== "paused") continue;
      const ageDays = Math.floor((now - p.updatedAt.getTime()) / (86400 * 1000));
      if (ageDays >= 14) {
        messages.push({
          severity: "warn",
          message: `You've delayed “${p.title}” for ${ageDays} days.`,
          ctaLabel: "Open project",
          ctaHref: `/reports/${p.reportId}?tab=action`,
        });
      }
    }
  }

  if (journey.latestBrief?.body) {
    const body = journey.latestBrief.body.toLowerCase();
    if (body.includes("competitor") || body.includes("compet")) {
      messages.push({
        severity: "info",
        message: "Your Weekly Growth Brief mentions competitor movement — review priorities.",
        ctaLabel: "View brief",
        ctaHref: "/dashboard",
      });
    }
  }

  if (priorities[0] && journey.avgMoneyGapScore > 0 && journey.avgMoneyGapScore < 90) {
    messages.push({
      severity: "celebrate",
      message: `You're one focused task away from lifting your MoneyGap Score™ — start with “${priorities[0].title}”.`,
      ctaLabel: "Work on this",
      ctaHref: `/reports/${priorities[0].reportId}?focus=${priorities[0].id}`,
    });
  }

  if (journey.projectsCompleted > 0 && journey.openGaps > 0) {
    const pct = Math.round(
      (journey.gapsClosed / Math.max(1, journey.totalGaps)) * 100,
    );
    if (pct >= 50) {
      messages.push({
        severity: "celebrate",
        message: `You've completed about ${pct}% of tracked opportunities — keep the momentum.`,
      });
    }
  }

  // Clear old non-dismissed nudges older than 1 day and insert fresh set (cap 5)
  const dayAgo = new Date(Date.now() - 86400 * 1000);
  await db
    .delete(coachNudges)
    .where(
      and(eq(coachNudges.workspaceId, workspaceId), eq(coachNudges.dismissed, false)),
    );

  const toInsert = messages.slice(0, 5);
  if (toInsert.length > 0) {
    await db.insert(coachNudges).values(
      toInsert.map((m) => ({
        workspaceId,
        severity: m.severity,
        message: m.message,
        ctaLabel: m.ctaLabel ?? null,
        ctaHref: m.ctaHref ?? null,
        expiresAt: new Date(Date.now() + 2 * 86400 * 1000),
      })),
    );
  }

  void dayAgo;
  return listActiveNudges(workspaceId);
}

export async function listActiveNudges(workspaceId: string): Promise<CoachNudgeView[]> {
  const rows = await db.query.coachNudges.findMany({
    where: and(
      eq(coachNudges.workspaceId, workspaceId),
      eq(coachNudges.dismissed, false),
    ),
    orderBy: [desc(coachNudges.createdAt)],
    limit: 8,
  });
  const now = Date.now();
  return rows
    .filter((r) => !r.expiresAt || r.expiresAt.getTime() > now)
    .map((r) => ({
      id: r.id,
      severity: r.severity,
      message: r.message,
      ctaLabel: r.ctaLabel,
      ctaHref: r.ctaHref,
    }));
}

export async function dismissNudge(id: string, workspaceId: string) {
  await db
    .update(coachNudges)
    .set({ dismissed: true })
    .where(and(eq(coachNudges.id, id), eq(coachNudges.workspaceId, workspaceId)));
}
