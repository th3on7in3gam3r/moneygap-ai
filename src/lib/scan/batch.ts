import { classifyPageType } from "moneygap-crawler";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { crawlJobs, websiteAnalyses, websitePages } from "@/db/schema";
import { PUBLIC_CRAWL_ERROR } from "@/lib/analysis/stages";
import { scheduleScanTick } from "./continue";
import { isQueueDrained, remainingQueueCount } from "./claim";
import { getScanProfile } from "./profiles";
import {
  defaultCrawlerProvider,
  defaultProgressProvider,
  defaultQueueProvider,
  defaultStorageProvider,
} from "./providers/defaults";
import type { ScanProfile } from "./types";

export async function runIncrementalDiscover(analysisId: string): Promise<void> {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
  });
  if (!analysis) return;

  const profile = (analysis.scanProfile as ScanProfile) || "standard";
  const cfg = getScanProfile(profile);

  await defaultProgressProvider.update(analysisId, {
    scanPhase: "discovering",
    stage: "Discovering pages",
    progress: 10,
  });

  let jobId = analysis.crawlJobId;
  if (!jobId) {
    const [job] = await db
      .insert(crawlJobs)
      .values({
        analysisId,
        url: analysis.url,
        mode: cfg.crawlerMode,
        maxPages: cfg.maxPages,
        status: "processing",
        startedAt: new Date(),
      })
      .returning({ id: crawlJobs.id });
    jobId = job.id;
    await db
      .update(websiteAnalyses)
      .set({ crawlJobId: jobId })
      .where(eq(websiteAnalyses.id, analysisId));
  }

  const discovery = await defaultCrawlerProvider.discover({
    url: analysis.url,
    profile,
  });

  await db.delete(websitePages).where(eq(websitePages.analysisId, analysisId));

  await defaultQueueProvider.enqueueUrls(jobId, discovery.urls);

  await defaultProgressProvider.update(analysisId, {
    scanPhase: "processing",
    stage: `Reading pages (0/${discovery.urls.length})`,
    progress: 15,
    pagesDiscovered: discovery.urls.length,
    pagesCompleted: 0,
    pagesFailed: 0,
    scanMeta: {
      framework: discovery.framework,
      jsRequired: discovery.jsRequired,
      sitemapFound: discovery.sitemapFound,
      warnings: discovery.warnings,
    },
  });

  await db
    .update(crawlJobs)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(crawlJobs.id, jobId));

  // First batches run in this invocation; further work self-schedules via /api/scan/tick.
  const deadline = Date.now() + 50_000;
  while (Date.now() < deadline) {
    const { done } = await processScanTick(analysisId);
    if (done) return;
    const row = await db.query.websiteAnalyses.findFirst({
      where: eq(websiteAnalyses.id, analysisId),
      columns: { scanPhase: true },
    });
    if (row?.scanPhase === "paused" || row?.scanPhase === "cancelled") return;
  }
  await scheduleScanTick(analysisId);
}

export async function processScanTick(analysisId: string): Promise<{
  done: boolean;
  processed: number;
}> {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
  });
  if (!analysis?.crawlJobId) return { done: true, processed: 0 };

  if (
    analysis.scanPhase === "paused" ||
    analysis.scanPhase === "cancelled" ||
    analysis.status === "failed" ||
    analysis.status === "completed"
  ) {
    return { done: true, processed: 0 };
  }

  const profile = (analysis.scanProfile as ScanProfile) || "standard";
  const cfg = getScanProfile(profile);
  const jobId = analysis.crawlJobId;

  const batch = await defaultQueueProvider.claimBatch(jobId, cfg.batchSize);
  if (batch.length === 0) {
    const counts = await defaultQueueProvider.countByState(jobId);
    if (!isQueueDrained(counts)) {
      // stale processing — leave for next tick
      await scheduleScanTick(analysisId);
      return { done: false, processed: 0 };
    }

    const completed = counts.completed ?? 0;
    if (completed === 0) {
      await db
        .update(websiteAnalyses)
        .set({
          status: "failed",
          scanPhase: "failed",
          stage: "Failed",
          error: PUBLIC_CRAWL_ERROR,
          completedAt: new Date(),
        })
        .where(eq(websiteAnalyses.id, analysisId));
      return { done: true, processed: 0 };
    }

    await defaultProgressProvider.update(analysisId, {
      scanPhase: "analyzing",
      stage: "Understanding business",
      progress: 32,
      estimatedRemainingMs: null,
    });
    await db
      .update(crawlJobs)
      .set({
        status: "completed",
        pageCount: completed,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(crawlJobs.id, jobId));

    const { runPostCrawlAnalysis } = await import("@/lib/analysis/pipeline");
    await runPostCrawlAnalysis(analysisId);
    return { done: true, processed: 0 };
  }

  let processed = 0;
  for (const item of batch) {
    try {
      const page = await defaultCrawlerProvider.extractPage(item.url);
      if (!page) {
        await defaultQueueProvider.markFailed(item.id, "thin or empty content", false);
        continue;
      }
      const pageType = classifyPageType(page.url, analysis.url);
      await defaultQueueProvider.markCompleted(item.id, {
        title: page.title,
        markdown: page.markdown,
        pageType,
        metadata: page.metadata,
      });
      await defaultStorageProvider.mirrorWebsitePage({
        analysisId,
        url: page.url,
        pageType,
        title: page.title,
        markdown: page.markdown,
        metadata: page.metadata,
      });
      processed += 1;
    } catch (err) {
      await defaultQueueProvider.markFailed(
        item.id,
        err instanceof Error ? err.message : String(err),
        true,
      );
    }
  }

  const counts = await defaultQueueProvider.countByState(jobId);
  const completed = counts.completed ?? 0;
  const failed = counts.failed ?? 0;
  const discovered =
    analysis.pagesDiscovered ??
    completed + failed + remainingQueueCount(counts);
  const remaining = (counts.queued ?? 0) + (counts.retry ?? 0);
  const progress = Math.min(
    30,
    15 + Math.round((completed / Math.max(1, discovered)) * 15),
  );
  const etaMs =
    remaining > 0
      ? Math.round(remaining * getScanProfile(profile).secondsPerPage * 1000)
      : 0;

  await defaultProgressProvider.update(analysisId, {
    scanPhase: "processing",
    stage: `Reading pages (${completed}/${discovered})`,
    progress,
    pagesDiscovered: discovered,
    pagesCompleted: completed,
    pagesFailed: failed,
    estimatedRemainingMs: etaMs,
    currentUrl: batch[batch.length - 1]?.url ?? null,
  });

  await scheduleScanTick(analysisId);
  return { done: false, processed };
}
