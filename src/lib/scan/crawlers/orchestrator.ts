import {
  crawlWithFirecrawl,
  isFirecrawlConfigured,
  scrapeFirecrawlUrls,
} from "./firecrawl";
import {
  meetsMinimumViableCorpus,
  SuccessfulPageMap,
} from "./merge";
import { getOrchestratorBudget } from "./profiles";
import { isScrapeDoConfigured, scrapeDoRescueUrls } from "./scrapedo";
import { isPastDeadline } from "./timeout";
import type { CrawlDiagnostics, CrawlProviderName } from "./types";
import type { ScrapedPage } from "./page-types";
import type { ScanProfile } from "../types";

export type RecoveryProgress = {
  stage: "recovering_pages" | "normalizing" | "crawl_complete";
  message: string;
  pagesCompleted: number;
  pagesFailed: number;
  pagesRecovered: number;
  provider?: CrawlProviderName;
};

export type FinalizeCorpusResult = {
  pages: ScrapedPage[];
  partial: boolean;
  viable: boolean;
  reason: string;
  pagesRecovered: number;
  diagnostics: CrawlDiagnostics;
};

/**
 * Merge primary pages, then recover failed/important URLs via Firecrawl → Scrape.do.
 * Never discards successful pages. Native full crawl is NOT invoked here —
 * caller hands off to native only when corpus is empty/non-viable.
 */
export async function recoverAndFinalizeCorpus(input: {
  homepageUrl: string;
  profile: ScanProfile | string;
  primaryPages: ScrapedPage[];
  primaryProvider: CrawlProviderName;
  failedUrls?: string[];
  importantMissing?: string[];
  deadlineAtMs: number;
  onProgress?: (p: RecoveryProgress) => void | Promise<void>;
}): Promise<FinalizeCorpusResult> {
  const budget = getOrchestratorBudget(input.profile);
  const map = new SuccessfulPageMap(input.homepageUrl);
  const providerAttempts: Record<string, number> = {
    [input.primaryProvider]: 1,
  };
  let pagesRecovered = 0;
  let fallbackUsed = false;
  let fallbackProvider: CrawlProviderName | undefined;

  map.mergePages(input.primaryPages, input.primaryProvider);

  for (const url of input.failedUrls ?? []) {
    map.markFailed(url, "primary_failed");
  }
  for (const url of input.importantMissing ?? []) {
    if (!map.toArray().some((p) => p.url === url)) {
      map.markFailed(url, "important_missing");
    }
  }

  const started = Date.now();

  // Firecrawl targeted recovery
  if (
    !isPastDeadline(input.deadlineAtMs) &&
    map.failedCount > 0 &&
    isFirecrawlConfigured()
  ) {
    const targets = map.failedUrls({
      importantOnly: false,
      limit: budget.firecrawlRecoverMax,
    });
    if (targets.length > 0) {
      fallbackUsed = true;
      fallbackProvider = "firecrawl";
      providerAttempts.firecrawl = 1;
      await input.onProgress?.({
        stage: "recovering_pages",
        message: `Recovering ${targets.length} pages…`,
        pagesCompleted: map.size,
        pagesFailed: map.failedCount,
        pagesRecovered,
        provider: "firecrawl",
      });

      const { pages, failed } = await scrapeFirecrawlUrls(
        targets,
        input.homepageUrl,
        { budgetMs: Math.min(90_000, remainingOr(input.deadlineAtMs, 90_000)) },
      );
      const before = map.size;
      map.mergePages(pages, "firecrawl");
      pagesRecovered += Math.max(0, map.size - before);
      for (const url of failed) {
        map.markFailed(url, "firecrawl_failed");
      }
    }
  } else if (
    map.size === 0 &&
    isFirecrawlConfigured() &&
    !isPastDeadline(input.deadlineAtMs)
  ) {
    // Zero useful primary pages → broader Firecrawl crawl once
    fallbackUsed = true;
    fallbackProvider = "firecrawl";
    providerAttempts.firecrawl = 1;
    await input.onProgress?.({
      stage: "recovering_pages",
      message: "Primary crawl empty — Firecrawl fallback…",
      pagesCompleted: 0,
      pagesFailed: map.failedCount,
      pagesRecovered: 0,
      provider: "firecrawl",
    });
    try {
      const pages = await crawlWithFirecrawl(
        input.homepageUrl,
        budget.maxPages,
      );
      map.mergePages(pages, "firecrawl");
      pagesRecovered += pages.length;
    } catch {
      /* continue to scrapedo/native */
    }
  }

  // Scrape.do rescue for remaining hard URLs
  if (
    !isPastDeadline(input.deadlineAtMs) &&
    isScrapeDoConfigured() &&
    map.failedCount > 0
  ) {
    const targets = map.rescueCandidates(budget.scrapedoMax);
    if (targets.length > 0) {
      fallbackUsed = true;
      fallbackProvider = fallbackProvider ?? "scrapedo";
      providerAttempts.scrapedo = 1;
      await input.onProgress?.({
        stage: "recovering_pages",
        message: `Rescuing ${targets.length} difficult pages…`,
        pagesCompleted: map.size,
        pagesFailed: map.failedCount,
        pagesRecovered,
        provider: "scrapedo",
      });
      const { pages } = await scrapeDoRescueUrls(targets, input.homepageUrl);
      const before = map.size;
      map.mergePages(pages, "scrapedo");
      pagesRecovered += Math.max(0, map.size - before);
    }
  }

  await input.onProgress?.({
    stage: "normalizing",
    message: "Normalizing page content…",
    pagesCompleted: map.size,
    pagesFailed: map.failedCount,
    pagesRecovered,
  });

  const verdict = meetsMinimumViableCorpus(map, String(input.profile));
  const pages = map.toArray().slice(0, budget.maxPages);

  await input.onProgress?.({
    stage: "crawl_complete",
    message: verdict.partial ? "Crawl complete (partial)" : "Crawl complete",
    pagesCompleted: pages.length,
    pagesFailed: map.failedCount,
    pagesRecovered,
  });

  return {
    pages,
    partial: verdict.partial || pagesRecovered > 0,
    viable: verdict.ok,
    reason: verdict.reason,
    pagesRecovered,
    diagnostics: {
      provider: "orchestrator",
      pagesReturned: pages.length,
      pagesRecovered,
      durationMs: Date.now() - started,
      fallbackUsed,
      fallbackProvider,
      providerAttempts,
      providerDistribution: map.providerDistribution(),
      partial: verdict.partial,
      errorClass: verdict.ok ? undefined : verdict.reason,
    },
  };
}

function remainingOr(deadlineAtMs: number, cap: number): number {
  return Math.max(1_000, Math.min(cap, deadlineAtMs - Date.now()));
}

export function weightedCrawlProgress(input: {
  stage: string;
  pagesCompleted?: number;
  pagesDiscovered?: number;
  recovering?: boolean;
}): number {
  const stage = input.stage;
  if (stage === "connecting" || stage === "connect") return 8;
  if (stage === "discovering" || stage === "robots" || stage === "sitemap") {
    return 14;
  }
  if (stage === "crawling_primary" || stage === "running" || stage === "crawling") {
    const done = input.pagesCompleted ?? 0;
    const total = Math.max(1, input.pagesDiscovered ?? done);
    return Math.min(54, 20 + Math.round((done / total) * 34));
  }
  if (stage === "recovering_pages" || input.recovering) return 60;
  if (stage === "normalizing" || stage === "retrieving") return 66;
  if (stage === "crawl_complete" || stage === "extract_content") return 70;
  return 18;
}

/** Ensure progress never goes backward. */
export function monotonicProgress(prev: number, next: number): number {
  return Math.max(prev, Math.min(99, next));
}
