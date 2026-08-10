import { getScanProfile } from "../profiles";
import type { ScanProfile } from "../types";

/** Verified Website Content Crawler crawlerType values. */
export type ApifyCrawlerType =
  | "playwright:adaptive"
  | "playwright:chrome"
  | "cheerio"
  | "jsdom";

export type ApifyProfileMapping = {
  maxCrawlPages: number;
  maxCrawlDepth: number;
  useSitemaps: boolean;
  crawlerType: ApifyCrawlerType;
  /** Soft wall-clock budget for MoneyGap watchdog (not sent to Apify). */
  timeoutMs: number;
};

/**
 * Map existing MoneyGap Scan Profiles → Apify Website Content Crawler input.
 * Caps come from SCAN_PROFILES — do not invent a second profile system.
 */
export function mapProfileToApifyInput(profile: ScanProfile | string): ApifyProfileMapping {
  const cfg = getScanProfile(profile);

  switch (cfg.id) {
    case "quick":
      return {
        maxCrawlPages: cfg.maxPages,
        maxCrawlDepth: cfg.maxDepth,
        useSitemaps: false,
        crawlerType: "cheerio",
        timeoutMs: 4 * 60_000,
      };
    case "standard":
      return {
        maxCrawlPages: cfg.maxPages,
        maxCrawlDepth: cfg.maxDepth,
        useSitemaps: true,
        crawlerType: "playwright:adaptive",
        timeoutMs: 10 * 60_000,
      };
    case "deep":
      return {
        maxCrawlPages: cfg.maxPages,
        maxCrawlDepth: cfg.maxDepth,
        useSitemaps: true,
        crawlerType: "playwright:adaptive",
        timeoutMs: 20 * 60_000,
      };
    case "enterprise":
      return {
        maxCrawlPages: cfg.maxPages,
        maxCrawlDepth: cfg.maxDepth,
        useSitemaps: true,
        crawlerType: "playwright:adaptive",
        timeoutMs: 45 * 60_000,
      };
    default:
      return {
        maxCrawlPages: cfg.maxPages,
        maxCrawlDepth: cfg.maxDepth,
        useSitemaps: true,
        crawlerType: "playwright:adaptive",
        timeoutMs: 10 * 60_000,
      };
  }
}

export function buildApifyActorInput(url: string, profile: ScanProfile | string) {
  const mapped = mapProfileToApifyInput(profile);
  return {
    startUrls: [{ url }],
    crawlerType: mapped.crawlerType,
    maxCrawlPages: mapped.maxCrawlPages,
    maxCrawlDepth: mapped.maxCrawlDepth,
    useSitemaps: mapped.useSitemaps,
    saveHtml: false,
    saveMarkdown: true,
    removeCookieWarnings: true,
  };
}

/** Global crawl deadline + recovery caps from existing profiles. */
export function getOrchestratorBudget(profile: ScanProfile | string) {
  const mapped = mapProfileToApifyInput(profile);
  const cfg = getScanProfile(profile);
  const scrapedoMax =
    cfg.id === "quick" ? 5 : cfg.id === "standard" ? 10 : cfg.id === "deep" ? 15 : 20;
  const firecrawlRecoverMax =
    cfg.id === "quick" ? 8 : cfg.id === "standard" ? 15 : 25;

  return {
    globalDeadlineMs: mapped.timeoutMs,
    maxPages: mapped.maxCrawlPages,
    scrapedoMax,
    firecrawlRecoverMax,
  };
}
