import { classifyPageType } from "moneygap-crawler";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { crawlJobs, websiteAnalyses, websitePages } from "@/db/schema";
import { PUBLIC_CRAWL_ERROR } from "@/lib/analysis/stages";
import { isWorkerScanExecution } from "./execution";
import { scheduleScanTickAsync } from "./continue";
import { isQueueDrained, remainingQueueCount } from "./claim";
import { getScanProfile } from "./profiles";
import {
  defaultCrawlerProvider,
  defaultProgressProvider,
  defaultQueueProvider,
  defaultStorageProvider,
} from "./providers/defaults";
import { STALE_PROCESSING_MS } from "./reclaim";
import { scanLog, scanWarn } from "./scan-log";
import type { ScanProfile } from "./types";
import { startWatchdog, withTimeout } from "./watchdog";

const EXTRACT_TIMEOUT_MS = 15_000;
const TICK_WALL_MS = 45_000;
const READ_CONCURRENCY = 5;

export async function runIncrementalDiscover(analysisId: string): Promise<void> {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
  });
  if (!analysis) return;

  const profile = (analysis.scanProfile as ScanProfile) || "standard";
  const cfg = getScanProfile(profile);

  scanLog("SCAN", "Starting scan discover", { analysisId, profile });

  await defaultProgressProvider.update(analysisId, {
    scanPhase: "discovering",
    stage: "Connecting…",
    progress: 8,
    scanMeta: { scanStage: "connecting" },
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

  await defaultProgressProvider.update(analysisId, {
    scanPhase: "discovering",
    stage: "Checking robots.txt…",
    progress: 10,
    scanMeta: { scanStage: "robots" },
  });

  let discoverProgressFloor = 10;
  const discovery = await defaultCrawlerProvider.discover({
    url: analysis.url,
    profile,
    onProgress: async (event) => {
      const phase = event.phase;
      const raw = (event.message ?? "").replace(/^\[Scanner\]\s*/i, "").trim();
      let stage = raw || "Discovering pages…";
      let scanStage = "discovery";
      // Every heartbeat nudges progress so the UI never sits static on sitemap.
      discoverProgressFloor = Math.min(18, discoverProgressFloor + 0.4);
      let progress = Math.round(discoverProgressFloor);
      if (phase === "robots") {
        stage = raw || "Checking robots.txt…";
        progress = Math.max(progress, 10);
        scanStage = "robots";
      } else if (phase === "sitemap") {
        stage =
          raw ||
          (event.pagesDiscovered > 1
            ? `Found ${event.pagesDiscovered} URLs…`
            : "Looking for sitemap…");
        progress = Math.max(progress, 12);
        scanStage = "sitemap";
      } else if (phase === "discover" || phase === "queue") {
        stage = raw || `Found ${event.pagesDiscovered} pages…`;
        progress = Math.max(progress, 16);
        scanStage = "discovery";
      }
      await defaultProgressProvider.update(analysisId, {
        scanPhase: "discovering",
        stage,
        progress,
        pagesDiscovered: event.pagesDiscovered,
        currentUrl: event.currentUrl ?? null,
        scanMeta: { scanStage },
      });
    },
  });

  await defaultProgressProvider.update(analysisId, {
    scanPhase: "discovering",
    stage:
      discovery.urls.length > 0
        ? `Found ${discovery.urls.length} pages — building queue…`
        : "Building crawl queue from homepage…",
    progress: 14,
    pagesDiscovered: discovery.urls.length,
    scanMeta: {
      scanStage: "queue",
      framework: discovery.framework,
      jsRequired: discovery.jsRequired,
      sitemapFound: discovery.sitemapFound,
      warnings: discovery.warnings,
    },
  });

  await db.delete(websitePages).where(eq(websitePages.analysisId, analysisId));

  const inserted = await defaultQueueProvider.enqueueUrls(jobId, discovery.urls);
  scanLog("QUEUE", "Discovery enqueue complete", {
    analysisId,
    discovered: discovery.urls.length,
    inserted,
  });

  await defaultProgressProvider.update(analysisId, {
    scanPhase: "processing",
    stage: `Reading page 0 of ${discovery.urls.length}…`,
    progress: 16,
    pagesDiscovered: discovery.urls.length,
    pagesCompleted: 0,
    pagesFailed: 0,
    scanMeta: {
      scanStage: "crawling",
      framework: discovery.framework,
      jsRequired: discovery.jsRequired,
      sitemapFound: discovery.sitemapFound,
      warnings: discovery.warnings,
      tickScheduleError: null,
      execution: isWorkerScanExecution() ? "worker" : "ticks",
    },
  });

  // Worker path: re-queue the crawl job for the long-lived Render worker and return.
  // Ticks remain available as local/dev fallback (SCAN_EXECUTION=ticks).
  if (isWorkerScanExecution()) {
    await db
      .update(crawlJobs)
      .set({ status: "queued", updatedAt: new Date() })
      .where(eq(crawlJobs.id, jobId));
    await defaultProgressProvider.update(analysisId, {
      scanPhase: "waiting",
      stage: `Queued ${discovery.urls.length} pages for crawl worker…`,
      progress: 16,
      pagesDiscovered: discovery.urls.length,
      scanMeta: {
        scanStage: "crawling",
        execution: "worker",
        framework: discovery.framework,
        jsRequired: discovery.jsRequired,
        sitemapFound: discovery.sitemapFound,
        warnings: discovery.warnings,
      },
    });
    scanLog("SCAN", "Handed crawl queue to Render worker", {
      analysisId,
      jobId,
      pages: discovery.urls.length,
    });
    return;
  }

  await db
    .update(crawlJobs)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(crawlJobs.id, jobId));

  let finished = false;
  try {
    const deadline = Date.now() + 50_000;
    while (Date.now() < deadline) {
      const { done } = await processScanTick(analysisId);
      if (done) {
        finished = true;
        return;
      }
      const row = await db.query.websiteAnalyses.findFirst({
        where: eq(websiteAnalyses.id, analysisId),
        columns: { scanPhase: true },
      });
      if (row?.scanPhase === "paused" || row?.scanPhase === "cancelled") {
        finished = true;
        return;
      }
    }
  } finally {
    // Always hand off to ticks so a thrown/timed-out discover loop cannot orphan the queue.
    if (!finished) scheduleScanTickAsync(analysisId);
  }
}

async function updateReadProgress(input: {
  analysisId: string;
  jobId: string;
  profile: ScanProfile;
  pagesDiscovered: number;
  currentUrl: string | null;
  startedAt: number;
}) {
  const counts = await defaultQueueProvider.countByState(input.jobId);
  const completed = counts.completed ?? 0;
  const failed = counts.failed ?? 0;
  const discovered =
    input.pagesDiscovered ||
    completed + failed + remainingQueueCount(counts);
  const remaining =
    (counts.queued ?? 0) + (counts.retry ?? 0) + (counts.processing ?? 0);
  const progress = Math.min(
    30,
    15 + Math.round((completed / Math.max(1, discovered)) * 15),
  );
  const etaMs =
    remaining > 0
      ? Math.round(remaining * getScanProfile(input.profile).secondsPerPage * 1000)
      : 0;

  scanLog("PROGRESS", `${progress}%`, {
    analysisId: input.analysisId,
    completed,
    discovered,
    remaining,
    currentUrl: input.currentUrl,
    elapsedMs: Date.now() - input.startedAt,
  });

  await defaultProgressProvider.update(input.analysisId, {
    scanPhase: "processing",
    stage: `Reading page ${completed} of ${discovered}…`,
    progress,
    pagesDiscovered: discovered,
    pagesCompleted: completed,
    pagesFailed: failed,
    estimatedRemainingMs: etaMs,
    currentUrl: input.currentUrl,
    scanMeta: {
      scanStage: "crawling",
      elapsedMs: Date.now() - input.startedAt,
      queue: {
        queued: counts.queued ?? 0,
        retry: counts.retry ?? 0,
        processing: counts.processing ?? 0,
        completed,
        failed,
      },
    },
  });
}

export async function processScanTick(analysisId: string): Promise<{
  done: boolean;
  processed: number;
}> {
  const tickStarted = Date.now();
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

  // Async Apify whole-site run — poll provider instead of page queue extract.
  const { isApifyExecution, processApifyPoll } = await import("./crawlers");
  if (isApifyExecution(analysis.scanMeta)) {
    return processApifyPoll(analysisId);
  }

  const profile = (analysis.scanProfile as ScanProfile) || "standard";
  const cfg = getScanProfile(profile);
  const jobId = analysis.crawlJobId;
  const siteUrl = analysis.url;
  const concurrency = Math.min(READ_CONCURRENCY, cfg.concurrency || READ_CONCURRENCY);

  await defaultQueueProvider.reclaimStaleProcessing(jobId, STALE_PROCESSING_MS);

  const claimLimit = Math.min(cfg.batchSize, concurrency * 2);
  const batch = await defaultQueueProvider.claimBatch(jobId, claimLimit);

  if (batch.length === 0) {
    const counts = await defaultQueueProvider.countByState(jobId);
    if (!isQueueDrained(counts)) {
      const reclaimed = await defaultQueueProvider.reclaimStaleProcessing(
        jobId,
        STALE_PROCESSING_MS,
      );
      scanWarn("CRAWLER", "Empty claim with undrained queue — reclaimed + reschedule", {
        analysisId,
        counts,
        reclaimed,
      });
      scheduleScanTickAsync(analysisId);
      return { done: false, processed: 0 };
    }

    const completed = counts.completed ?? 0;
    if (completed === 0) {
      const meta = (analysis.scanMeta as Record<string, unknown>) ?? {};
      const scanStage =
        typeof meta.scanStage === "string" ? meta.scanStage : "";
      const stillDiscovering =
        analysis.scanPhase === "discovering" ||
        analysis.scanPhase === "queued" ||
        scanStage === "connecting" ||
        scanStage === "robots" ||
        scanStage === "sitemap" ||
        scanStage === "discovery" ||
        scanStage === "queue";

      // Race: status-poll ticks can run before discover finishes enqueueing.
      // Never treat an empty pre-crawl queue as a permanent crawl failure.
      if (stillDiscovering) {
        const metaAge =
          typeof meta.lastProgressAt === "number"
            ? Date.now() - meta.lastProgressAt
            : analysis.startedAt
              ? Date.now() - analysis.startedAt.getTime()
              : 0;
        // After 5 minutes stuck in discover with empty queue, fail cleanly.
        if (metaAge > 5 * 60_000) {
          await db
            .update(websiteAnalyses)
            .set({
              status: "failed",
              scanPhase: "failed",
              stage: "Failed",
              error: PUBLIC_CRAWL_ERROR,
              completedAt: new Date(),
              scanMeta: {
                ...meta,
                stageDiagnostics: [
                  {
                    stage: "read_pages",
                    status: "failed",
                    detail: "Discover stalled with empty queue",
                  },
                ],
              },
            })
            .where(eq(websiteAnalyses.id, analysisId));
          return { done: true, processed: 0 };
        }
        scanWarn("CRAWLER", "Empty queue during discover — waiting for enqueue", {
          analysisId,
          scanPhase: analysis.scanPhase,
          scanStage,
          pagesDiscovered: analysis.pagesDiscovered,
        });
        scheduleScanTickAsync(analysisId);
        return { done: false, processed: 0 };
      }

      await db
        .update(websiteAnalyses)
        .set({
          status: "failed",
          scanPhase: "failed",
          stage: "Failed",
          error: PUBLIC_CRAWL_ERROR,
          completedAt: new Date(),
          scanMeta: {
            ...meta,
            stageDiagnostics: [
              {
                stage: "read_pages",
                status: "failed",
                detail: "Queue drained with zero completed pages",
              },
            ],
          },
        })
        .where(eq(websiteAnalyses.id, analysisId));
      return { done: true, processed: 0 };
    }

    scanLog("SCAN", "Read pages complete — starting extract/BI stages", {
      analysisId,
      completed,
    });

    await defaultProgressProvider.update(analysisId, {
      scanPhase: "analyzing",
      stage: "Understanding business",
      progress: 32,
      estimatedRemainingMs: null,
      scanMeta: {
        scanStage: "extract_content",
        stageDiagnostics: [
          {
            stage: "read_pages",
            status: "ok",
            completed,
            failed: counts.failed ?? 0,
          },
        ],
      },
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

  scanLog("CRAWLER", `Queue batch size ${batch.length}`, {
    analysisId,
    concurrency,
  });

  let activeUrl: string | null = batch[0]?.url ?? null;
  let abortAll = false;
  const abortControllers = new Map<string, AbortController>();

  const watchdog = startWatchdog({
    analysisId,
    timeoutMs: 20_000,
    getDiagnostics: () => ({
      queueSize: batch.length,
      activeUrl,
      activeTasks: [...abortControllers.keys()],
      elapsedMs: Date.now() - tickStarted,
    }),
    onStall: async () => {
      abortAll = true;
      for (const [pageId, c] of abortControllers) {
        c.abort();
        try {
          await defaultQueueProvider.markFailed(
            pageId,
            "Watchdog abort — no progress for 20s",
            true,
          );
        } catch {
          /* ignore */
        }
      }
      abortControllers.clear();
    },
  });

  let processed = 0;
  const pagesDiscovered = analysis.pagesDiscovered ?? batch.length;

  async function processOne(item: { id: string; url: string }) {
    if (abortAll || Date.now() - tickStarted > TICK_WALL_MS) {
      await defaultQueueProvider.markFailed(item.id, "Tick wall budget exceeded", true);
      return;
    }

    activeUrl = item.url;
    const controller = new AbortController();
    abortControllers.set(item.id, controller);
    scanLog("FETCH", item.url, { analysisId, pageId: item.id });

    const extractStarted = Date.now();
    try {
      const page = await withTimeout(
        defaultCrawlerProvider.extractPage(item.url),
        EXTRACT_TIMEOUT_MS,
        `extract ${item.url}`,
      );
      if (controller.signal.aborted) {
        await defaultQueueProvider.markFailed(item.id, "Aborted by watchdog", true);
        return;
      }
      if (!page) {
        await defaultQueueProvider.markFailed(item.id, "thin or empty content", false);
        scanWarn("FETCH", "Empty/thin page", { url: item.url });
      } else {
        const pageType = classifyPageType(page.url, siteUrl);
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
        scanLog("FETCH", `Completed in ${Date.now() - extractStarted} ms`, {
          url: item.url,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      scanWarn("FETCH", "Page extract failed — continuing", {
        url: item.url,
        error: msg,
      });
      await defaultQueueProvider.markFailed(item.id, msg, true);
    } finally {
      abortControllers.delete(item.id);
      watchdog.beat();
      try {
        await updateReadProgress({
          analysisId,
          jobId,
          profile,
          pagesDiscovered,
          currentUrl: item.url,
          startedAt: tickStarted,
        });
      } catch {
        /* progress update must not stop the tick */
      }
    }
  }

  // Concurrent pool (chunks of READ_CONCURRENCY)
  for (let i = 0; i < batch.length; i += concurrency) {
    if (abortAll || Date.now() - tickStarted > TICK_WALL_MS) {
      const rest = batch.slice(i);
      for (const item of rest) {
        await defaultQueueProvider.markFailed(
          item.id,
          "Tick wall budget — deferred",
          true,
        );
      }
      break;
    }
    const chunk = batch.slice(i, i + concurrency);
    scanLog("CRAWLER", `Reading pages ${i + 1}-${i + chunk.length}/${batch.length}`, {
      analysisId,
    });
    await Promise.allSettled(chunk.map((item) => processOne(item)));
    watchdog.beat();
  }

  watchdog.stop();

  await updateReadProgress({
    analysisId,
    jobId,
    profile,
    pagesDiscovered,
    currentUrl: activeUrl,
    startedAt: tickStarted,
  });

  const counts = await defaultQueueProvider.countByState(jobId);
  if (isQueueDrained(counts)) {
    // Let next path finish post-crawl via empty claim branch (or recurse once)
    const again = await processScanTick(analysisId);
    return again;
  }

  scheduleScanTickAsync(analysisId);
  return { done: false, processed };
}
