import { after } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses, websites } from "@/db/schema";
import { runAnalysisPipeline } from "@/lib/analysis/pipeline";
import {
  listDueSchedules,
  markScheduleRan,
  type MonitorFrequency,
} from "@/lib/monitor/schedule";
import { runDueBriefs } from "@/lib/monitor/run-due-briefs";

/**
 * Find due monitor schedules and enqueue analysis pipelines.
 */
export async function runDueMonitors(options?: { dryRun?: boolean }) {
  const due = await listDueSchedules();
  const started: { scheduleId: string; websiteId: string; analysisId?: string }[] =
    [];

  for (const schedule of due) {
    if (options?.dryRun) {
      started.push({ scheduleId: schedule.id, websiteId: schedule.websiteId });
      continue;
    }

    const site = schedule.website;
    if (!site) continue;

    await db
      .update(websites)
      .set({ status: "queued", updatedAt: new Date() })
      .where(eq(websites.id, site.id));

    const prior = await db.query.websiteAnalyses.findFirst({
      where: eq(websiteAnalyses.websiteId, site.id),
      orderBy: [desc(websiteAnalyses.createdAt)],
    });

    const userId = prior?.userId;
    if (!userId) {
      console.error(`Monitor: no prior analysis user for website ${site.id}`);
      continue;
    }

    const [analysis] = await db
      .insert(websiteAnalyses)
      .values({
        userId,
        workspaceId: schedule.workspaceId,
        websiteId: site.id,
        url: site.url,
        status: "queued",
        stage: "queued",
        progress: 0,
      })
      .returning();

    await markScheduleRan({
      scheduleId: schedule.id,
      analysisId: analysis.id,
      frequency: schedule.frequency as MonitorFrequency,
      intervalDays: schedule.intervalDays,
    });

    after(async () => {
      try {
        await runAnalysisPipeline(analysis.id);
      } catch (err) {
        console.error(`Monitor pipeline ${analysis.id}:`, err);
      }
    });

    started.push({
      scheduleId: schedule.id,
      websiteId: site.id,
      analysisId: analysis.id,
    });
  }

  let briefs: string[] = [];
  if (!options?.dryRun) {
    try {
      briefs = await runDueBriefs();
    } catch (err) {
      console.error("runDueBriefs soft-fail:", err);
    }
  }

  return { dueCount: due.length, started, briefs };
}
