export type {
  CrawlProvider,
  CrawlInput,
  CrawlResult,
  CrawlDiagnostics,
  CrawlProviderName,
  CrawlProgressStage,
  CrawlProgressUpdate,
  OrchestratorCrawlStage,
  ApifyScanMeta,
  PreferredCrawlProvider,
} from "./types";

export type { ScrapedPage as CrawlScrapedPage } from "./page-types";

export {
  CrawlProviderError,
  assertPublicCrawlUrl,
  classifyCrawlError,
  isFallbackEligible,
  isNonFallbackError,
} from "./errors";

export {
  isApifyCircuitOpen,
  recordApifySuccess,
  recordApifyProviderFailure,
  getApifyCircuitSnapshot,
  resetApifyCircuitForTests,
} from "./circuit";

export {
  startApifyRun,
  getApifyRun,
  getApifyDatasetItems,
  normalizeApifyPage,
  normalizeApifyDataset,
  isApifyConfigured,
  isApifyTerminalFailure,
  isApifySuccess,
  isApifyInProgress,
  apifyCrawlProvider,
} from "./apify";

export {
  firecrawlCrawlProvider,
  crawlWithFirecrawl,
  scrapeFirecrawlUrls,
  isFirecrawlConfigured,
} from "./firecrawl";

export {
  scrapeDoFetchPage,
  scrapeDoRescueUrls,
  isScrapeDoConfigured,
} from "./scrapedo";

export { nativeCrawlProvider, isNativeHandoff, NATIVE_HANDOFF } from "./native";

export {
  routeCrawlStart,
  resolveProviderOrder,
  getPreferredCrawlProvider,
  markApifyCrawlSucceeded,
} from "./router";

export {
  mapProfileToApifyInput,
  buildApifyActorInput,
  getOrchestratorBudget,
} from "./profiles";

export { buildProgressUpdate, crawlStageMessage } from "./progress";

export { decideApifyWatchdog, APIFY_STALE_PROGRESS_MS } from "./watchdog";

export {
  SuccessfulPageMap,
  meetsMinimumViableCorpus,
  normalizePageUrl,
  isImportantUrl,
} from "./merge";

export { scorePageQuality, pickBestPage, isUsefulPage } from "./quality";

export { validatePageContent } from "./content-validate";

export { normalizeCrawlUrl } from "./url-normalize";

export { withDeadline, fetchWithTimeout, isPastDeadline } from "./timeout";

export {
  recoverAndFinalizeCorpus,
  weightedCrawlProgress,
  monotonicProgress,
} from "./orchestrator";

export {
  startCrawlAcquisition,
  processApifyPoll,
  isApifyExecution,
} from "./acquisition";
