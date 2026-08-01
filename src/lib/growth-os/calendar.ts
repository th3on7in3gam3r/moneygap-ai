import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { growthCalendarItems } from "@/db/schema";
import { getTodayPriorities } from "@/lib/growth-os/priority";
import { findProjectsForWorkspace } from "@/lib/growth-os/dependencies";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export function currentWeekStartIso(d = new Date()): string {
  const day = d.getUTCDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
  return monday.toISOString().slice(0, 10);
}

export async function ensureWeeklyCalendar(workspaceId: string) {
  const weekStart = currentWeekStartIso();
  const existing = await db.query.growthCalendarItems.findMany({
    where: and(
      eq(growthCalendarItems.workspaceId, workspaceId),
      eq(growthCalendarItems.weekStart, weekStart),
    ),
  });
  if (existing.length > 0) {
    return existing.map(mapItem);
  }

  const priorities = await getTodayPriorities(workspaceId, 5);
  const projects = (await findProjectsForWorkspace(workspaceId))
    .filter((p) => p.status === "active")
    .slice(0, 4);

  const items: {
    title: string;
    day: string;
    opportunityId?: string | null;
    projectId?: string | null;
    reportId?: string | null;
    sortOrder: number;
  }[] = [];

  priorities.forEach((p, i) => {
    items.push({
      title: p.title,
      day: DAYS[Math.min(i, 4)],
      opportunityId: p.id,
      reportId: p.reportId,
      sortOrder: i,
    });
  });

  projects.forEach((p, i) => {
    if (items.some((x) => x.projectId === p.id)) return;
    items.push({
      title: p.title,
      day: DAYS[Math.min(priorities.length + i, 5)],
      projectId: p.id,
      reportId: p.reportId,
      sortOrder: priorities.length + i,
    });
  });

  // Cap to a realistic week: max 1–2 items Mon–Fri
  const capped = items.slice(0, 7);
  if (capped.length > 0) {
    await db.insert(growthCalendarItems).values(
      capped.map((c) => ({
        workspaceId,
        weekStart,
        title: c.title,
        day: c.day,
        opportunityId: c.opportunityId ?? null,
        projectId: c.projectId ?? null,
        reportId: c.reportId ?? null,
        sortOrder: c.sortOrder,
        status: "planned",
      })),
    );
  }

  const rows = await db.query.growthCalendarItems.findMany({
    where: and(
      eq(growthCalendarItems.workspaceId, workspaceId),
      eq(growthCalendarItems.weekStart, weekStart),
    ),
  });
  return rows.map(mapItem);
}

function mapItem(r: typeof growthCalendarItems.$inferSelect) {
  return {
    id: r.id,
    title: r.title,
    day: r.day,
    weekStart: r.weekStart,
    status: r.status,
    opportunityId: r.opportunityId,
    projectId: r.projectId,
    reportId: r.reportId,
  };
}

export async function listWeekCalendar(workspaceId: string) {
  return ensureWeeklyCalendar(workspaceId);
}
