import Firecrawl from "@mendable/firecrawl-js";
import {
  crawlSite,
  type CrawlMode,
  type OnProgress,
  type ScrapedPage as CrawlerScrapedPage,
} from "moneygap-crawler";
import { buildCompactIntelligenceCorpus } from "@/lib/analysis/corpus";
import type { PageType } from "@/lib/analysis/stages";
import { MISSING_KEYS_ERROR, PUBLIC_CRAWL_ERROR } from "@/lib/analysis/stages";
import { log, withRetry } from "@/lib/observability/logger";

export type ScrapedPage = {
  url: string;
  pageType: PageType;
  title: string | null;
  markdown: string;
  metadata: Record<string, unknown>;
};

export type CrawlWebsiteOptions = {
  mode?: CrawlMode;
  maxPages?: number;
  budgetMs?: number;
  concurrency?: number;
  onProgress?: OnProgress;
  signal?: AbortSignal;
};

const MAP_TIMEOUT_MS = 40_000;
const SCRAPE_TIMEOUT_MS = 22_000;
const CRAWL_BUDGET_MS = 140_000;
const SCRAPE_CONCURRENCY = 3;
const PAGE_LIMIT = 15;

function envBool(name: string, fallback = false): boolean {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  return v === "1" || v.toLowerCase() === "true" || v === "yes";
}

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function toAppPages(pages: CrawlerScrapedPage[]): ScrapedPage[] {
  return pages.map((p) => ({
    url: p.url,
    pageType: p.pageType as PageType,
    title: p.title,
    markdown: p.markdown,
    metadata: p.metadata,
  }));
}

function getFirecrawl() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;
  return new Firecrawl({ apiKey });
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const PAGE_TYPE_PATTERNS: { type: PageType; patterns: RegExp[] }[] = [
  { type: "about", patterns: [/\/about(?:-us)?(?:\/|$)/i, /\/company(?:\/|$)/i] },
  { type: "services", patterns: [/\/services?(?:\/|$)/i, /\/solutions?(?:\/|$)/i] },
  { type: "products", patterns: [/\/products?(?:\/|$)/i, /\/shop(?:\/|$)/i, /\/store(?:\/|$)/i] },
  { type: "pricing", patterns: [/\/pricing(?:\/|$)/i, /\/plans?(?:\/|$)/i] },
  { type: "blog", patterns: [/\/blog(?:\/|$)/i, /\/news(?:\/|$)/i, /\/articles?(?:\/|$)/i] },
  { type: "contact", patterns: [/\/contact(?:-us)?(?:\/|$)/i, /\/support(?:\/|$)/i] },
  { type: "faq", patterns: [/\/faq(?:\/|$)/i, /\/help(?:\/|$)/i] },
  { type: "resources", patterns: [/\/resources?(?:\/|$)/i, /\/docs?(?:\/|$)/i, /\/guides?(?:\/|$)/i] },
];

function classifyPageType(url: string, homepageUrl: string): PageType {
  try {
    const parsed = new URL(url);
    const home = new URL(homepageUrl);
    const path = parsed.pathname.replace(/\/$/, "") || "/";
    if (parsed.origin === home.origin && (path === "/" || path === "")) return "homepage";
  } catch {
    // ignore
  }
  for (const { type, patterns } of PAGE_TYPE_PATTERNS) {
    if (patterns.some((re) => re.test(url))) return type;
  }
  return "other";
}

function pickPriorityUrls(homepage: string, mapped: string[], limit: number): string[] {
  const priority: Record<PageType, number> = {
    homepage: 0,
    about: 1,
    services: 2,
    products: 3,
    pricing: 4,
    blog: 5,
    contact: 6,
    faq: 7,
    resources: 8,
    nav: 9,
    other: 10,
  };
  const scored = mapped
    .map((u) => ({ url: u, type: classifyPageType(u, homepage), score: 0 }))
    .map((item) => ({ ...item, score: priority[item.type] }))
    .sort((a, b) => a.score - b.score);

  const selected: string[] = [];
  const seen = new Set<PageType>();
  for (const item of scored) {
    if (item.type !== "other" && seen.has(item.type) && item.type !== "blog") continue;
    if (item.type !== "other") seen.add(item.type);
    selected.push(item.url);
    if (selected.length >= limit) break;
  }
  if (!selected.some((u) => classifyPageType(u, homepage) === "homepage")) {
    selected.unshift(homepage);
  }
  return Array.from(new Set(selected)).slice(0, limit);
}

async function firecrawlFallback(url: string, maxPages: number): Promise<ScrapedPage[]> {
  const client = getFirecrawl();
  if (!client) return [];

  const started = Date.now();
  let mappedUrls: string[] = [url];
  try {
    const mapResult = await withTimeout(
      client.map(url, { limit: 60 }),
      MAP_TIMEOUT_MS,
      "firecrawl_map",
    );
    const urls = (mapResult.links ?? [])
      .map((link) => link.url)
      .filter((u): u is string => Boolean(u));
    if (urls.length > 0) mappedUrls = urls;
  } catch (err) {
    log("warn", "firecrawl_map_soft_fail", {
      url,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const targets = pickPriorityUrls(url, mappedUrls, maxPages);
  const pages: ScrapedPage[] = [];

  for (const target of targets) {
    if (Date.now() - started > CRAWL_BUDGET_MS) break;
    try {
      const result = await withRetry(
        () =>
          withTimeout(
            client.scrape(target, { formats: ["markdown"], onlyMainContent: true }),
            SCRAPE_TIMEOUT_MS,
            `firecrawl_scrape:${target}`,
          ),
        { attempts: 2, baseMs: 250, label: "firecrawl_scrape" },
      );
      const markdown = result.markdown ?? "";
      if (!markdown || markdown.trim().length < 40) continue;
      const metadata = (result.metadata ?? {}) as Record<string, unknown>;
      const title =
        (typeof metadata.title === "string" && metadata.title) ||
        (typeof metadata.ogTitle === "string" && metadata.ogTitle) ||
        null;
      pages.push({
        url: target,
        pageType: classifyPageType(target, url),
        title,
        markdown: markdown.slice(0, 24000),
        metadata: { ...metadata, source: "firecrawl-fallback" },
      });
    } catch (err) {
      log("warn", "firecrawl_scrape_skip", {
        url: target,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (pages.length > 0 && !pages.some((p) => p.pageType === "homepage")) {
    pages[0] = { ...pages[0], pageType: "homepage" };
  }

  log("info", "firecrawl_fallback_done", {
    url,
    pages: pages.length,
    durationMs: Date.now() - started,
  });

  return pages;
}

/**
 * Crawl Engine v2 entry — local discovery/extract first, Firecrawl optional fallback.
 */
export async function crawlWebsite(
  url: string,
  options: CrawlWebsiteOptions = {},
): Promise<ScrapedPage[]> {
  const mode =
    options.mode ??
    ((process.env.CRAWL_MODE_DEFAULT as CrawlMode | undefined) || "standard");
  const maxPages = options.maxPages ?? envInt("CRAWL_MAX_PAGES", PAGE_LIMIT);
  const budgetMs = options.budgetMs ?? envInt("CRAWL_BUDGET_MS", CRAWL_BUDGET_MS);
  const concurrency = options.concurrency ?? envInt("CRAWL_CONCURRENCY", SCRAPE_CONCURRENCY);
  const playwrightEnabled = envBool("PLAYWRIGHT_ENABLED", false);

  const started = Date.now();

  try {
    const result = await crawlSite(
      {
        url,
        mode,
        maxPages,
        maxRuntimeMs: budgetMs,
        concurrency,
        playwrightEnabled,
        crawlDelayMs: envInt("CRAWL_DELAY_MS", 0),
      },
      { onProgress: options.onProgress, signal: options.signal },
    );

    const pages = toAppPages(result.scraped);
    if (pages.length > 0) {
      log("info", "moneygap_crawler_done", {
        url,
        mode,
        pages: pages.length,
        warnings: result.warnings.length,
        durationMs: Date.now() - started,
      });
      return pages;
    }

    log("warn", "moneygap_crawler_empty", {
      url,
      warnings: result.warnings,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    log("warn", "moneygap_crawler_soft_fail", {
      url,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const fallback = await firecrawlFallback(url, maxPages);
  if (fallback.length > 0) return fallback;

  if (!process.env.FIRECRAWL_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error(MISSING_KEYS_ERROR);
  }

  throw new Error(PUBLIC_CRAWL_ERROR);
}

export function buildCrawlCorpus(pages: ScrapedPage[]): string {
  return buildCompactIntelligenceCorpus(pages).corpus;
}
