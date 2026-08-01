import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  analysisComparisons,
  clientReportSchedules,
  clientScheduledReports,
  clients,
  scoreSnapshots,
} from "@/db/schema";

function nextRun(from: Date, frequency: string): Date {
  const days =
    frequency === "weekly" ? 7 : frequency === "quarterly" ? 90 : 30;
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function upsertClientReportSchedule(input: {
  clientId: string;
  workspaceId: string;
  frequency: "weekly" | "monthly" | "quarterly";
  enabled: boolean;
}) {
  const existing = await db.query.clientReportSchedules.findFirst({
    where: eq(clientReportSchedules.clientId, input.clientId),
  });
  const now = new Date();
  if (existing) {
    const [row] = await db
      .update(clientReportSchedules)
      .set({
        frequency: input.frequency,
        enabled: input.enabled,
        nextRunAt: input.enabled
          ? nextRun(existing.lastRunAt ?? now, input.frequency)
          : null,
        updatedAt: now,
      })
      .where(eq(clientReportSchedules.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(clientReportSchedules)
    .values({
      clientId: input.clientId,
      workspaceId: input.workspaceId,
      frequency: input.frequency,
      enabled: input.enabled,
      nextRunAt: input.enabled ? nextRun(now, input.frequency) : null,
    })
    .returning();
  return row;
}

export async function buildClientScheduledReport(input: {
  clientId: string;
  workspaceId: string;
}) {
  const client = await db.query.clients.findFirst({
    where: and(
      eq(clients.id, input.clientId),
      eq(clients.workspaceId, input.workspaceId),
    ),
    with: { websites: true },
  });
  if (!client) return null;

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
  const siteIds = client.websites.map((w) => w.id);

  let comparisons: (typeof analysisComparisons.$inferSelect)[] = [];
  let snapshots: (typeof scoreSnapshots.$inferSelect)[] = [];
  if (siteIds.length > 0) {
    comparisons = await db.query.analysisComparisons.findMany({
      where: inArray(analysisComparisons.websiteId, siteIds),
      orderBy: [desc(analysisComparisons.createdAt)],
      limit: 10,
    });
    snapshots = await db.query.scoreSnapshots.findMany({
      where: inArray(scoreSnapshots.websiteId, siteIds),
      orderBy: [desc(scoreSnapshots.createdAt)],
      limit: 10,
    });
  }

  const latest = comparisons[0];
  const payload = {
    scoreChanges: comparisons.map((c) => ({
      delta: c.scoreDelta,
      summary: c.summary,
    })),
    newOpportunities: latest?.changes?.newOpportunities ?? [],
    resolved: latest?.changes?.resolved ?? [],
    competitorNotes: latest?.changes?.competitorNotes ?? [],
    recentScores: snapshots.map((s) => ({
      score: s.moneyGapScore,
      at: s.createdAt.toISOString().slice(0, 10),
    })),
  };

  const body = [
    `Client Growth Report — ${client.name}`,
    "",
    latest?.summary ?? "No re-analysis comparison in this period yet.",
    "",
    "Score history:",
    ...(payload.recentScores.length
      ? payload.recentScores.map((s) => `• ${s.at}: ${s.score}`)
      : ["• No snapshots yet"]),
    "",
    "New opportunities:",
    ...(payload.newOpportunities.length
      ? payload.newOpportunities.map((o) => `• ${o.title}`)
      : ["• None"]),
    "",
    "Priorities: review highest Opportunity Index™ gaps and Action Center™ projects.",
  ].join("\n");

  const [row] = await db
    .insert(clientScheduledReports)
    .values({
      clientId: client.id,
      workspaceId: input.workspaceId,
      title: `Client Growth Report · ${client.name}`,
      body,
      payload,
      periodStart,
      periodEnd,
    })
    .returning();

  return row;
}

export async function runDueClientReports(options?: { dryRun?: boolean }) {
  const due = await db.query.clientReportSchedules.findMany({
    where: eq(clientReportSchedules.enabled, true),
  });
  const now = new Date();
  const started: { scheduleId: string; clientId: string; reportId?: string }[] =
    [];

  for (const schedule of due) {
    if (!schedule.nextRunAt || schedule.nextRunAt > now) continue;
    if (options?.dryRun) {
      started.push({ scheduleId: schedule.id, clientId: schedule.clientId });
      continue;
    }
    const report = await buildClientScheduledReport({
      clientId: schedule.clientId,
      workspaceId: schedule.workspaceId,
    });
    await db
      .update(clientReportSchedules)
      .set({
        lastRunAt: now,
        nextRunAt: nextRun(now, schedule.frequency),
        updatedAt: now,
      })
      .where(eq(clientReportSchedules.id, schedule.id));
    started.push({
      scheduleId: schedule.id,
      clientId: schedule.clientId,
      reportId: report?.id,
    });
  }

  return { dueProcessed: started.length, started };
}

