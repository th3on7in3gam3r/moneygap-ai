import { eq } from "drizzle-orm";
import { db } from "@/db";
import { crawlJobs, websiteAnalyses, websitePages } from "@/db/schema";
import { PUBLIC_CRAWL_ERROR } from "@/lib/analysis/stages";
import {
  getApifyDatasetItems,
  getApifyRun,
  isApifyConfigured,
  normalizeApifyDataset,
  startApifyRun,
} from "./apify";
import { classifyCrawlError, isNonFallbackError } from "./errors";
import {
  getOrchestratorBudget,
  mapProfileToApifyInput,
} from "./profiles";
import { crawlStageMessage } from "./progress";
import { getPreferredCrawlProvider, routeCrawlStart } from "./router";
import { decideApifyWatchdog } from "./watchdog";
import {
  monotonicProgress,
  recoverAndFinalizeCorpus,
  weightedCrawlProgress,
} from "./orchestrator";
import { scheduleScanTickAsync } from "../continue";
import { isWorkerScanExecution } from "../execution";
import { getScanProfile } from "../profiles";
import {
  defaultProgressProvider,
  defaultStorageProvider,
} from "../providers/defaults";
import { scanLog, scanWarn } from "../scan-log";
import type { ScanProfile } from "../types";
import type { CrawlDiagnostics, CrawlProviderName } from "./types";
import type { ScrapedPage } from "./page-types";
import { recordApifyProviderFailure, recordApifySuccess } from "./circuit";

async function mergeScanMeta(
  analysisId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const existing = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: { scanMeta: true, progress: true },
  });
  const prevProgress =
    typeof existing?.progress === "number" ? existing.progress : 0;
  const nextProgress =
    typeof patch.progress === "number"
      ? monotonicProgress(prevProgress, patch.progress)
      : undefined;

  await db
    .update(websiteAnalyses)
    .set({
      ...(nextProgress != null ? { progress: nextProgress } : {}),
      scanMeta: {
        ...((existing?.scanMeta as Record<string, unknown>) ?? {}),
        ...patch,
        lastProgressAt: Date.now(),
        lastHeartbeatAt: Date.now(),
      },
    })
    .where(eq(websiteAnalyses.id, analysisId));
}

async function ensureCrawlJob(
  analysisId: string,
  url: string,
  profile: ScanProfile,
): Promise<string> {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: { crawlJobId: true },
  });
  if (analysis?.crawlJobId) return analysis.crawlJobId;

  const cfg = getScanProfile(profile);
  const [job] = await db
    .insert(crawlJobs)
    .values({
      analysisId,
      url,
      mode: cfg.crawlerMode,
      maxPages: cfg.maxPages,
      status: "processing",
      startedAt: new Date(),
    })
    .returning({ id: crawlJobs.id });

  await db
    .update(websiteAnalyses)
    .set({ crawlJobId: job.id })
    .where(eq(websiteAnalyses.id, analysisId));

  return job.id;
}

async function persistPages(
  analysisId: string,
  pages: ScrapedPage[],
): Promise<void> {
  await db.delete(websitePages).where(eq(websitePages.analysisId, analysisId));
  for (const page of pages) {
    await defaultStorageProvider.mirrorWebsitePage({
      analysisId,
      url: page.url,
      pageType: page.pageType,
      title: page.title,
      markdown: page.markdown,
      metadata: page.metadata,
    });
  }
}

async function finishWithPages(
  analysisId: string,
  jobId: string,
  pages: ScrapedPage[],
  diagnostics: CrawlDiagnostics,
  opts: { partial?: boolean } = {},
): Promise<void> {
  const partial = Boolean(opts.partial ?? diagnostics.partial);
  await defaultProgressProvider.update(analysisId, {
    scanPhase: "analyzing",
    stage: partial
      ? "Understanding business (partial crawl)"
      : "Understanding business",
    progress: 70,
    pagesDiscovered: Math.max(pages.length, diagnostics.pagesReturned ?? pages.length),
    pagesCompleted: pages.length,
    pagesFailed: 0,
    estimatedRemainingMs: null,
    scanMeta: {
      scanStage: "extract_content",
      crawlStage: "crawl_complete",
      crawlFinishedAt: new Date().toISOString(),
      partial,
      pagesRecovered: diagnostics.pagesRecovered ?? 0,
      crawlDiagnostics: diagnostics,
      stageDiagnostics: [
        {
          stage: "read_pages",
          status: partial ? "partial" : "ok",
          completed: pages.length,
          provider: diagnostics.provider,
          recovered: diagnostics.pagesRecovered ?? 0,
        },
      ],
    },
  });

  await db
    .update(crawlJobs)
    .set({
      status: "completed",
      pageCount: pages.length,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(crawlJobs.id, jobId));

  const { runPostCrawlAnalysis } = await import("@/lib/analysis/pipeline");
  await runPostCrawlAnalysis(analysisId);
}

async function failCrawl(
  analysisId: string,
  message: string,
  diagnostics?: CrawlDiagnostics,
): Promise<void> {
  const existing = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: { scanMeta: true, websiteId: true },
  });
  await db
    .update(websiteAnalyses)
    .set({
      status: "failed",
      scanPhase: "failed",
      stage: "Failed",
      error: message,
      completedAt: new Date(),
      scanMeta: {
        ...((existing?.scanMeta as Record<string, unknown>) ?? {}),
        crawlFinishedAt: new Date().toISOString(),
        ...(diagnostics ? { crawlDiagnostics: diagnostics } : {}),
        stageDiagnostics: [
          {
            stage: "read_pages",
            status: "failed",
            detail: diagnostics?.errorClass ?? message,
          },
        ],
      },
    })
    .where(eq(websiteAnalyses.id, analysisId));
}

async function finalizeFromPrimaryPages(
  analysisId: string,
  jobId: string,
  homepageUrl: string,
  profile: ScanProfile,
  primaryPages: ScrapedPage[],
  primaryProvider: CrawlProviderName,
  deadlineAtMs: number,
  extraFailed: string[] = [],
): Promise<{ done: boolean; processed: number }> {
  const result = await recoverAndFinalizeCorpus({
    homepageUrl,
    profile,
    primaryPages,
    primaryProvider,
    failedUrls: extraFailed,
    deadlineAtMs,
    onProgress: async (p) => {
      const progress = weightedCrawlProgress({
        stage: p.stage,
        pagesCompleted: p.pagesCompleted,
        pagesDiscovered: p.pagesCompleted + p.pagesFailed,
        recovering: p.stage === "recovering_pages",
      });
      await defaultProgressProvider.update(analysisId, {
        scanPhase: "processing",
        stage: p.message,
        progress,
        pagesDiscovered: p.pagesCompleted + p.pagesFailed,
        pagesCompleted: p.pagesCompleted,
        pagesFailed: p.pagesFailed,
        scanMeta: {
          crawlStage: p.stage,
          crawlProvider: p.provider ?? primaryProvider,
          pagesRecovered: p.pagesRecovered,
          currentProvider: p.provider ?? primaryProvider,
        },
      });
    },
  });

  if (!result.viable) {
    // Native emergency only when corpus still empty / non-viable
    console.info("[CRAWL]", {
      scanId: analysisId,
      event: "native_emergency",
      reason: result.reason,
      pages: result.pages.length,
    });
    await mergeScanMeta(analysisId, {
      crawlProvider: "native",
      execution: null,
      fallbackUsed: true,
      fallbackProvider: "native",
      crawlDiagnostics: {
        ...result.diagnostics,
        fallbackUsed: true,
        fallbackProvider: "native",
        errorClass: result.reason,
      },
    });
    await defaultProgressProvider.update(analysisId, {
      scanPhase: "discovering",
      stage: "Native crawler fallback — discovering pages…",
      progress: 12,
    });
    const { runIncrementalDiscover } = await import("../batch");
    await runIncrementalDiscover(analysisId);
    return { done: true, processed: 0 };
  }

  await persistPages(analysisId, result.pages);
  await finishWithPages(analysisId, jobId, result.pages, result.diagnostics, {
    partial: result.partial,
  });
  return { done: true, processed: result.pages.length };
}

/**
 * Apify terminal failure / timeout with optional partial dataset pages preserved.
 */
async function fallbackAfterApify(
  analysisId: string,
  reason: string,
  partialPages: ScrapedPage[] = [],
): Promise<{ done: boolean; processed: number }> {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
  });
  if (!analysis) return { done: true, processed: 0 };

  const profile = (analysis.scanProfile as ScanProfile) || "standard";
  const jobId = await ensureCrawlJob(analysisId, analysis.url, profile);
  const meta = (analysis.scanMeta as Record<string, unknown>) ?? {};
  const budget = getOrchestratorBudget(profile);
  const crawlStartedAt =
    typeof meta.crawlStartedAt === "string"
      ? Date.parse(meta.crawlStartedAt)
      : analysis.startedAt?.getTime() ?? Date.now();
  const deadlineAtMs =
    typeof meta.crawlDeadlineAt === "number"
      ? meta.crawlDeadlineAt
      : crawlStartedAt + budget.globalDeadlineMs;

  console.info("[CRAWL_PROVIDER]", {
    scanId: analysisId,
    provider: "apify",
    event: "fallback",
    reason,
    preservedPages: partialPages.length,
  });
  recordApifyProviderFailure();

  return finalizeFromPrimaryPages(
    analysisId,
    jobId,
    analysis.url,
    profile,
    partialPages,
    partialPages.length > 0 ? "apify" : "firecrawl",
    deadlineAtMs,
  );
}

/**
 * Entry after connect: start Apify (async) or Firecrawl/native fallback.
 * Must not wait for Apify to finish.
 */
export async function startCrawlAcquisition(analysisId: string): Promise<void> {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
  });
  if (!analysis) return;

  const profile = (analysis.scanProfile as ScanProfile) || "standard";
  const cfg = getScanProfile(profile);
  const apifyMapped = mapProfileToApifyInput(profile);
  const budget = getOrchestratorBudget(profile);
  const preferred = getPreferredCrawlProvider();
  const crawlStartedAt = new Date();
  const crawlDeadlineAt = crawlStartedAt.getTime() + budget.globalDeadlineMs;

  scanLog("SCAN", "Starting crawl acquisition", {
    analysisId,
    profile,
    preferred,
    apifyConfigured: isApifyConfigured(),
    crawlDeadlineAt,
  });

  const jobId = await ensureCrawlJob(analysisId, analysis.url, profile);

  try {
    const routed = await routeCrawlStart(
      {
        url: analysis.url,
        scanId: analysisId,
        profile,
        maxPages: cfg.maxPages,
        maxDepth: cfg.maxDepth,
        timeoutMs: apifyMapped.timeoutMs,
        useSitemap: apifyMapped.useSitemaps,
        onProgress: async (update) => {
          const progress = weightedCrawlProgress({
            stage: update.stage === "starting" ? "connecting" : "crawling_primary",
            pagesCompleted: update.pagesCompleted,
            pagesDiscovered: update.pagesDiscovered,
          });
          await defaultProgressProvider.update(analysisId, {
            scanPhase: "processing",
            stage: update.message,
            progress,
            pagesDiscovered: update.pagesDiscovered,
            pagesCompleted: update.pagesCompleted,
            pagesFailed: update.pagesFailed,
            scanMeta: {
              crawlProvider: update.provider,
              crawlStage: update.stage,
              elapsedMs: update.elapsedMs,
              crawlDeadlineAt,
            },
          });
        },
      },
      {
        startApify: async (input) =>
          startApifyRun({ url: input.url, profile: input.profile }),
      },
    );

    if (routed.kind === "failed") {
      await failCrawl(analysisId, PUBLIC_CRAWL_ERROR, {
        provider: "router",
        errorClass: routed.error.errorClass,
        errorMessage: routed.error.message,
      });
      return;
    }

    if (routed.kind === "apify_started") {
      await defaultProgressProvider.update(analysisId, {
        scanPhase: "processing",
        stage: crawlStageMessage("running", { provider: "apify" }),
        progress: 20,
        pagesDiscovered: 0,
        pagesCompleted: 0,
        scanMeta: {
          crawlProvider: "apify",
          providerRunId: routed.runId,
          providerDatasetId: routed.datasetId ?? null,
          providerStatus: routed.status,
          crawlStartedAt: crawlStartedAt.toISOString(),
          crawlDeadlineAt,
          execution: "apify",
          crawlStage: "crawling_primary",
          pagesRequested: apifyMapped.maxCrawlPages,
          currentProvider: "apify",
          crawlDiagnostics: {
            provider: "apify",
            providerRunId: routed.runId,
            providerStatus: routed.status,
            pagesRequested: apifyMapped.maxCrawlPages,
          },
          scanStage: "crawling",
        },
      });

      await db
        .update(crawlJobs)
        .set({
          status: isWorkerScanExecution() ? "queued" : "processing",
          updatedAt: new Date(),
        })
        .where(eq(crawlJobs.id, jobId));

      scheduleScanTickAsync(analysisId);
      return;
    }

    if (routed.kind === "sync_pages") {
      await finalizeFromPrimaryPages(
        analysisId,
        jobId,
        analysis.url,
        profile,
        routed.result.pages,
        routed.result.provider,
        crawlDeadlineAt,
      );
      return;
    }

    // native_handoff
    await mergeScanMeta(analysisId, {
      crawlProvider: "native",
      crawlDeadlineAt,
      fallbackUsed: routed.fallbackUsed,
      fallbackProvider: routed.fallbackFrom
        ? ("native" as CrawlProviderName)
        : undefined,
      crawlDiagnostics: {
        provider: "native",
        fallbackUsed: routed.fallbackUsed,
        errorClass: routed.reason,
      },
    });
    const { runIncrementalDiscover } = await import("../batch");
    await runIncrementalDiscover(analysisId);
  } catch (err) {
    scanWarn("CRAWLER", "startCrawlAcquisition failed", {
      analysisId,
      error: err instanceof Error ? err.message : String(err),
    });
    await failCrawl(analysisId, PUBLIC_CRAWL_ERROR, {
      provider: "orchestrator",
      errorClass: classifyCrawlError(err),
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Poll Apify run from /api/scan/tick when scanMeta.execution === "apify".
 */
export async function processApifyPoll(analysisId: string): Promise<{
  done: boolean;
  processed: number;
}> {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
  });
  if (!analysis) return { done: true, processed: 0 };

  if (
    analysis.scanPhase === "paused" ||
    analysis.scanPhase === "cancelled" ||
    analysis.status === "failed" ||
    analysis.status === "completed"
  ) {
    return { done: true, processed: 0 };
  }

  const meta = (analysis.scanMeta as Record<string, unknown>) ?? {};
  const runId = typeof meta.providerRunId === "string" ? meta.providerRunId : null;
  if (!runId) {
    scanWarn("CRAWLER", "Missing providerRunId — falling back", { analysisId });
    return fallbackAfterApify(analysisId, "missing_run_id");
  }

  const profile = (analysis.scanProfile as ScanProfile) || "standard";
  const mapped = mapProfileToApifyInput(profile);
  const budget = getOrchestratorBudget(profile);
  const crawlStartedAt =
    typeof meta.crawlStartedAt === "string"
      ? Date.parse(meta.crawlStartedAt)
      : analysis.startedAt?.getTime() ?? Date.now();
  const deadlineAtMs =
    typeof meta.crawlDeadlineAt === "number"
      ? meta.crawlDeadlineAt
      : crawlStartedAt + budget.globalDeadlineMs;
  const lastProgressAt =
    typeof meta.lastProgressAt === "number"
      ? meta.lastProgressAt
      : typeof meta.lastProgressAt === "string"
        ? Date.parse(meta.lastProgressAt)
        : null;

  // Global deadline — try to preserve any dataset if run already succeeded-ish
  if (Date.now() > deadlineAtMs) {
    scanWarn("CRAWLER", "Global crawl deadline exceeded", { analysisId, runId });
    try {
      const run = await getApifyRun(runId);
      if (run.defaultDatasetId) {
        const items = await getApifyDatasetItems(run.defaultDatasetId, {
          limit: mapped.maxCrawlPages,
        });
        const pages = normalizeApifyDataset(items, analysis.url);
        return fallbackAfterApify(analysisId, "global_scan_budget_exceeded", pages);
      }
    } catch {
      /* fall through */
    }
    return fallbackAfterApify(analysisId, "global_scan_budget_exceeded");
  }

  let run;
  try {
    run = await getApifyRun(runId);
  } catch (err) {
    const errorClass = classifyCrawlError(err, "apify");
    scanWarn("CRAWLER", "getApifyRun failed", {
      analysisId,
      runId,
      error: err instanceof Error ? err.message : String(err),
      errorClass,
    });
    if (isNonFallbackError(errorClass)) {
      await failCrawl(analysisId, PUBLIC_CRAWL_ERROR, {
        provider: "apify",
        providerRunId: runId,
        errorClass,
      });
      return { done: true, processed: 0 };
    }
    const decision = decideApifyWatchdog({
      run: null,
      crawlStartedAtMs: crawlStartedAt,
      lastProgressAtMs: lastProgressAt,
      profileTimeoutMs: Math.max(0, deadlineAtMs - crawlStartedAt),
    });
    if (decision.action === "fallback" || decision.action === "fail") {
      return fallbackAfterApify(analysisId, decision.reason);
    }
    await defaultProgressProvider.update(analysisId, {
      stage: "Apify crawl running…",
      scanPhase: "processing",
      progress: weightedCrawlProgress({ stage: "crawling_primary" }),
      scanMeta: {
        providerStatus: "UNKNOWN",
        crawlStage: "crawling_primary",
        elapsedMs: Date.now() - crawlStartedAt,
        lastHeartbeatAt: Date.now(),
      },
    });
    scheduleScanTickAsync(analysisId);
    return { done: false, processed: 0 };
  }

  const decision = decideApifyWatchdog({
    run,
    crawlStartedAtMs: crawlStartedAt,
    lastProgressAtMs: lastProgressAt,
    profileTimeoutMs: Math.max(0, deadlineAtMs - crawlStartedAt),
  });

  await mergeScanMeta(analysisId, {
    providerStatus: run.status,
    providerDatasetId: run.defaultDatasetId ?? meta.providerDatasetId ?? null,
    crawlStage:
      decision.action === "continue" ? "crawling_primary" : decision.action,
    elapsedMs: Date.now() - crawlStartedAt,
    lastHeartbeatAt: Date.now(),
  });

  if (decision.action === "continue") {
    const stats =
      run && typeof (run as { stats?: unknown }).stats === "object"
        ? ((run as { stats?: Record<string, unknown> }).stats ?? {})
        : {};
    const requestsFinished = Number(stats.requestsFinished ?? 0) || undefined;
    const progress = weightedCrawlProgress({
      stage: "crawling_primary",
      pagesCompleted: requestsFinished,
      pagesDiscovered: requestsFinished,
    });

    await defaultProgressProvider.update(analysisId, {
      scanPhase: "processing",
      stage: crawlStageMessage("running", {
        provider: "apify",
        pagesDiscovered: requestsFinished,
        pagesCompleted: requestsFinished,
      }),
      progress,
      pagesDiscovered: requestsFinished,
      pagesCompleted: requestsFinished,
      scanMeta: {
        providerStatus: run.status,
        crawlStage: "crawling_primary",
        elapsedMs: Date.now() - crawlStartedAt,
        scanStage: "crawling",
        currentProvider: "apify",
        lastHeartbeatAt: Date.now(),
      },
    });
    scheduleScanTickAsync(analysisId);
    return { done: false, processed: 0 };
  }

  if (decision.action === "fallback" || decision.action === "fail") {
    let partial: ScrapedPage[] = [];
    if (run.defaultDatasetId) {
      try {
        const items = await getApifyDatasetItems(run.defaultDatasetId, {
          limit: mapped.maxCrawlPages,
        });
        partial = normalizeApifyDataset(items, analysis.url);
      } catch {
        /* ignore */
      }
    }
    return fallbackAfterApify(analysisId, decision.reason, partial);
  }

  // process_success
  const datasetId = run.defaultDatasetId;
  if (!datasetId) {
    return fallbackAfterApify(analysisId, "missing_dataset_id");
  }

  const jobId = await ensureCrawlJob(analysisId, analysis.url, profile);

  try {
    await defaultProgressProvider.update(analysisId, {
      stage: crawlStageMessage("retrieving"),
      scanPhase: "processing",
      progress: 55,
      scanMeta: { crawlStage: "normalizing", providerDatasetId: datasetId },
    });

    const items = await getApifyDatasetItems(datasetId, {
      limit: mapped.maxCrawlPages,
    });
    const pages = normalizeApifyDataset(items, analysis.url);

    if (pages.length === 0) {
      return fallbackAfterApify(analysisId, "empty_dataset");
    }

    recordApifySuccess();
    console.info("[CRAWL_PROVIDER]", {
      scanId: analysisId,
      provider: "apify",
      durationMs: Date.now() - crawlStartedAt,
      pages: pages.length,
    });

    return finalizeFromPrimaryPages(
      analysisId,
      jobId,
      analysis.url,
      profile,
      pages,
      "apify",
      deadlineAtMs,
    );
  } catch (err) {
    scanWarn("CRAWLER", "Dataset retrieve/normalize failed", {
      analysisId,
      error: err instanceof Error ? err.message : String(err),
    });
    return fallbackAfterApify(analysisId, classifyCrawlError(err, "apify"));
  }
}

export function isApifyExecution(meta: unknown): boolean {
  if (!meta || typeof meta !== "object") return false;
  const m = meta as Record<string, unknown>;
  return m.execution === "apify" || m.crawlProvider === "apify";
}
