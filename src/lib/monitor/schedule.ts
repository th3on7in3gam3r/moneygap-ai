import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { monitorSchedules } from "@/db/schema";

export type MonitorFrequency = "weekly" | "biweekly" | "monthly" | "custom";

export function intervalDaysForFrequency(
  frequency: MonitorFrequency,
  customDays?: number | null,
): number {
  switch (frequency) {
    case "weekly":
      return 7;
    case "biweekly":
      return 14;
    case "monthly":
      return 30;
    case "custom":
      return Math.max(1, customDays ?? 7);
    default:
      return 7;
  }
}

export function computeNextRunAt(
  from: Date,
  frequency: MonitorFrequency,
  customDays?: number | null,
): Date {
  const days = intervalDaysForFrequency(frequency, customDays);
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function getScheduleForWebsite(websiteId: string) {
  return db.query.monitorSchedules.findFirst({
    where: eq(monitorSchedules.websiteId, websiteId),
  });
}

export async function upsertMonitorSchedule(input: {
  websiteId: string;
  workspaceId: string;
  frequency: MonitorFrequency;
  intervalDays?: number | null;
  enabled?: boolean;
}) {
  const frequency = input.frequency;
  const intervalDays =
    frequency === "custom"
      ? Math.max(1, input.intervalDays ?? 7)
      : intervalDaysForFrequency(frequency);
  const enabled = input.enabled ?? true;
  const existing = await getScheduleForWebsite(input.websiteId);
  const now = new Date();
  const nextRunAt = enabled
    ? computeNextRunAt(existing?.lastRunAt ?? now, frequency, intervalDays)
    : null;

  if (existing) {
    const [row] = await db
      .update(monitorSchedules)
      .set({
        frequency,
        intervalDays: frequency === "custom" ? intervalDays : null,
        enabled,
        nextRunAt,
        updatedAt: now,
      })
      .where(eq(monitorSchedules.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(monitorSchedules)
    .values({
      websiteId: input.websiteId,
      workspaceId: input.workspaceId,
      frequency,
      intervalDays: frequency === "custom" ? intervalDays : null,
      enabled,
      nextRunAt,
    })
    .returning();
  return row;
}

export async function markScheduleRan(input: {
  scheduleId: string;
  analysisId: string;
  frequency: MonitorFrequency;
  intervalDays?: number | null;
}) {
  const now = new Date();
  const [row] = await db
    .update(monitorSchedules)
    .set({
      lastRunAt: now,
      lastAnalysisId: input.analysisId,
      nextRunAt: computeNextRunAt(now, input.frequency, input.intervalDays),
      updatedAt: now,
    })
    .where(eq(monitorSchedules.id, input.scheduleId))
    .returning();
  return row;
}

export async function listDueSchedules(now = new Date()) {
  const rows = await db.query.monitorSchedules.findMany({
    where: and(eq(monitorSchedules.enabled, true)),
    with: { website: true },
  });
  return rows.filter((s) => s.nextRunAt && s.nextRunAt <= now);
}
