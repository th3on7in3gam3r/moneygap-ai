import type { ScrapedPage } from "./page-types";
import type { ScanProfile } from "../types";

export type CrawlProviderName = "apify" | "firecrawl" | "scrapedo" | "native";

export type CrawlProgressStage =
  | "starting"
  | "discovering"
  | "running"
  | "retrieving"
  | "normalizing"
  | "recovering"
  | "complete"
  | "fallback"
  | "failed";

export type OrchestratorCrawlStage =
  | "connecting"
  | "discovering"
  | "crawling_primary"
  | "recovering_pages"
  | "normalizing"
  | "crawl_complete";

export type CrawlProgressUpdate = {
  provider: CrawlProviderName;
  stage: CrawlProgressStage;
  message: string;
  pagesDiscovered?: number;
  pagesCompleted?: number;
  pagesFailed?: number;
  pagesRecovered?: number;
  elapsedMs?: number;
};

export type CrawlInput = {
  url: string;
  scanId: string;
  profile: ScanProfile;
  maxPages: number;
  maxDepth: number;
  timeoutMs: number;
  useSitemap: boolean;
  onProgress?: (update: CrawlProgressUpdate) => void | Promise<void>;
};

export type CrawlDiagnostics = {
  provider: CrawlProviderName | "router" | "orchestrator";
  providerRunId?: string;
  providerDatasetId?: string;
  providerStatus?: string;
  pagesRequested?: number;
  pagesReturned?: number;
  pagesRecovered?: number;
  durationMs?: number;
  fallbackUsed?: boolean;
  fallbackProvider?: CrawlProviderName;
  providerAttempts?: Record<string, number>;
  providerDistribution?: Record<string, number>;
  partial?: boolean;
  errorClass?: string;
  errorMessage?: string;
};

export type CrawlResult = {
  provider: CrawlProviderName;
  pages: ScrapedPage[];
  discovered: number;
  completed: number;
  failed: number;
  durationMs: number;
  partial: boolean;
  diagnostics?: CrawlDiagnostics;
};

export interface CrawlProvider {
  name: CrawlProviderName;
  crawl(input: CrawlInput): Promise<CrawlResult>;
}

/** Persisted on websiteAnalyses.scanMeta for async Apify runs. */
export type ApifyScanMeta = {
  crawlProvider: "apify";
  providerRunId: string;
  providerDatasetId?: string | null;
  providerStatus?: string;
  crawlStartedAt: string;
  crawlFinishedAt?: string;
  execution: "apify";
  crawlStage?: CrawlProgressStage;
  crawlDiagnostics?: CrawlDiagnostics;
  pagesRequested?: number;
  fallbackUsed?: boolean;
  fallbackProvider?: CrawlProviderName;
};

export type PreferredCrawlProvider =
  | "apify"
  | "firecrawl"
  | "scrapedo"
  | "native"
  | "auto";
