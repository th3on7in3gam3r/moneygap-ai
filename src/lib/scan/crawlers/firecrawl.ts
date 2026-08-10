import Firecrawl from "@mendable/firecrawl-js";
import { log, withRetry } from "@/lib/observability/logger";
import { classifyCrawlPageType } from "./classify-page";
import type { ScrapedPage } from "./page-types";
import { CrawlProviderError } from "./errors";
import { buildProgressUpdate } from "./progress";
import type { CrawlInput, CrawlProvider, CrawlResult } from "./types";

const MAP_TIMEOUT_MS = 40_000;
const SCRAPE_TIMEOUT_MS = 22_000;
const CRAWL_BUDGET_MS = 140_000;

function pickPriorityUrls(homepage: string, mapped: string[], limit: number): string[] {
  const priority: Record<ScrapedPage["pageType"], number> = {
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
    .map((u) => ({ url: u, type: classifyCrawlPageType(u, homepage), score: 0 }))
    .map((item) => ({ ...item, score: priority[item.type] }))
    .sort((a, b) => a.score - b.score);

  const selected: string[] = [];
  const seen = new Set<ScrapedPage["pageType"]>();
  for (const item of scored) {
    if (item.type !== "other" && seen.has(item.type) && item.type !== "blog") continue;
    if (item.type !== "other") seen.add(item.type);
    selected.push(item.url);
    if (selected.length >= limit) break;
  }
  if (!selected.some((u) => classifyCrawlPageType(u, homepage) === "homepage")) {
    selected.unshift(homepage);
  }
  return Array.from(new Set(selected)).slice(0, limit);
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

export function isFirecrawlConfigured(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY?.trim());
}

export async function crawlWithFirecrawl(
  url: string,
  maxPages: number,
): Promise<ScrapedPage[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    throw new CrawlProviderError("Firecrawl unavailable: FIRECRAWL_API_KEY not configured", {
      errorClass: "provider",
      provider: "firecrawl",
      retryable: true,
    });
  }

  const client = new Firecrawl({ apiKey });
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
        pageType: classifyCrawlPageType(target, url),
        title,
        markdown: markdown.slice(0, 24_000),
        metadata: { ...metadata, source: "firecrawl" },
      });
    } catch (err) {
      log("warn", "firecrawl_scrape_skip", {
        url: target,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (pages.length > 0 && !pages.some((p) => p.pageType === "homepage")) {
    pages[0] = { ...pages[0]!, pageType: "homepage" };
  }

  return pages;
}

/**
 * Targeted Firecrawl recovery — scrape only specific failed URLs.
 * Do NOT remap/recrawl the whole site when Apify already returned usable pages.
 */
export async function scrapeFirecrawlUrls(
  urls: string[],
  homepageUrl: string,
  opts: { budgetMs?: number; concurrency?: number } = {},
): Promise<{ pages: ScrapedPage[]; failed: string[] }> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    return { pages: [], failed: [...urls] };
  }

  const client = new Firecrawl({ apiKey });
  const budgetMs = opts.budgetMs ?? 90_000;
  const started = Date.now();
  const pages: ScrapedPage[] = [];
  const failed: string[] = [];

  for (const target of urls) {
    if (Date.now() - started > budgetMs) {
      failed.push(target);
      continue;
    }
    try {
      const result = await withRetry(
        () =>
          withTimeout(
            client.scrape(target, { formats: ["markdown"], onlyMainContent: true }),
            SCRAPE_TIMEOUT_MS,
            `firecrawl_recover:${target}`,
          ),
        { attempts: 2, baseMs: 250, label: "firecrawl_recover" },
      );
      const markdown = result.markdown ?? "";
      if (!markdown || markdown.trim().length < 40) {
        failed.push(target);
        continue;
      }
      const metadata = (result.metadata ?? {}) as Record<string, unknown>;
      const title =
        (typeof metadata.title === "string" && metadata.title) ||
        (typeof metadata.ogTitle === "string" && metadata.ogTitle) ||
        null;
      pages.push({
        url: target,
        pageType: classifyCrawlPageType(target, homepageUrl),
        title,
        markdown: markdown.slice(0, 24_000),
        metadata: { ...metadata, source: "firecrawl", sourceProvider: "firecrawl" },
      });
    } catch {
      failed.push(target);
    }
  }

  console.info("[RECOVERY]", {
    provider: "firecrawl",
    requested: urls.length,
    recovered: pages.length,
  });

  return { pages, failed };
}

export const firecrawlCrawlProvider: CrawlProvider = {
  name: "firecrawl",

  async crawl(input: CrawlInput): Promise<CrawlResult> {
    const started = Date.now();
    await input.onProgress?.(buildProgressUpdate("firecrawl", "starting"));
    await input.onProgress?.(buildProgressUpdate("firecrawl", "running"));

    const pages = await crawlWithFirecrawl(input.url, input.maxPages);
    const durationMs = Date.now() - started;

    if (pages.length === 0) {
      throw new CrawlProviderError("Firecrawl returned no usable pages", {
        errorClass: "empty",
        provider: "firecrawl",
        retryable: true,
      });
    }

    await input.onProgress?.(
      buildProgressUpdate("firecrawl", "complete", {
        pagesDiscovered: pages.length,
        pagesCompleted: pages.length,
        elapsedMs: durationMs,
      }),
    );

    return {
      provider: "firecrawl",
      pages,
      discovered: pages.length,
      completed: pages.length,
      failed: 0,
      durationMs,
      partial: false,
      diagnostics: {
        provider: "firecrawl",
        pagesRequested: input.maxPages,
        pagesReturned: pages.length,
        durationMs,
      },
    };
  },
};
