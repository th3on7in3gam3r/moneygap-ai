export { crawlSite, extractSinglePage, loadPageHtml } from "./crawl.js";
export { discoverOnly } from "./discovery-only.js";
export { toScrapedPage, toScrapedPages } from "./adapters/scraped-page.js";
export { detectFramework } from "./framework-detectors/index.js";
export { parseSitemapXml, discoverSitemapUrls } from "./sitemaps/index.js";
export { loadRobots } from "./robots/index.js";
export { classifyPageType, prioritizeUrls } from "./discovery/prioritize.js";
export { normalizeCrawlUrl, sameOrigin, resolveUrl } from "./discovery/normalize.js";
export { backoffMs, InMemoryCrawlQueue, isTransientError } from "./queue/memory.js";
/** Lazy Playwright cleanup — avoid static export of the playwright renderer. */
export async function closeBrowser(): Promise<void> {
  const { closeBrowser: close } = await import("./renderers/playwright.js");
  await close();
}
export {
  CrawlConfigSchema,
  CrawlModeSchema,
  PageTypeSchema,
  QueueStateSchema,
} from "./types/index.js";
export type {
  CrawlConfig,
  CrawlConfigInput,
  CrawlMode,
  CrawlResult,
  DiscoveryResult,
  FrameworkId,
  OnProgress,
  PageRecord,
  PageType,
  ProgressEvent,
  ProgressPhase,
  QueueState,
  ScrapedPage,
} from "./types/index.js";
