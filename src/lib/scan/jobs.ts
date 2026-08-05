import { eq } from "drizzle-orm";
import { db } from "@/db";
import { crawlJobs, crawlPages, websiteAnalyses } from "@/db/schema";
import { getScanProfile } from "./profiles";
import { defaultProgressProvider } from "./providers/defaults";
import type { ScanProfile } from "./types";

export async function createCrawlJobForAnalysis(input: {
  analysisId: string;
  url: string;
  profile: ScanProfile;
}): Promise<string> {
  const cfg = getScanProfile(input.profile);
  const [job] = await db
    .insert(crawlJobs)
    .values({
      analysisId: input.analysisId,
      url: input.url,
      mode: cfg.crawlerMode,
      maxPages: cfg.maxPages,
      status: "queued",
    })
    .returning({ id: crawlJobs.id });

  await db
    .update(websiteAnalyses)
    .set({
      crawlJobId: job.id,
      scanProfile: input.profile,
      scanPhase: "queued",
    })
    .where(eq(websiteAnalyses.id, input.analysisId));

  return job.id;
}

export async function pauseScan(analysisId: string): Promise<boolean> {
  const row = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: { status: true, scanPhase: true },
  });
  if (!row || row.status === "completed" || row.status === "failed") return false;
  if (row.scanPhase === "completed" || row.scanPhase === "analyzing") return false;

  await defaultProgressProvider.update(analysisId, {
    scanPhase: "paused",
    stage: "Paused — resume anytime",
  });
  return true;
}

export async function resumeScan(analysisId: string): Promise<boolean> {
  const row = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: { scanPhase: true, status: true },
  });
  if (!row || row.scanPhase !== "paused") return false;

  await defaultProgressProvider.update(analysisId, {
    scanPhase: "processing",
    stage: "Reading pages (resumed)",
  });
  return true;
}

export async function cancelScanCrawl(analysisId: string): Promise<void> {
  const row = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: { crawlJobId: true },
  });

  await defaultProgressProvider.update(analysisId, {
    scanPhase: "cancelled",
    stage: "Cancelled",
  });

  if (row?.crawlJobId) {
    await db
      .update(crawlJobs)
      .set({ status: "cancelled", updatedAt: new Date(), completedAt: new Date() })
      .where(eq(crawlJobs.id, row.crawlJobId));
    await db
      .update(crawlPages)
      .set({ state: "cancelled", updatedAt: new Date() })
      .where(eq(crawlPages.jobId, row.crawlJobId));
  }
}
