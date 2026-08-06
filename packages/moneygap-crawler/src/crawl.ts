import PQueue from "p-queue";
import { toScrapedPages } from "./adapters/scraped-page.js";
import { globalCrawlCache } from "./cache/memory.js";
import { normalizeCrawlUrl, originOf, sameOrigin } from "./discovery/normalize.js";
import { classifyPageType, prioritizeUrls } from "./discovery/prioritize.js";
import { extractPageRecord, harvestLinksFromHtml } from "./extractors/html.js";
import { ProgressTracker } from "./progress/tracker.js";
import {
  backoffMs,
  InMemoryCrawlQueue,
  isTransientError,
  sleep,
} from "./queue/memory.js";
import { fetchText } from "./renderers/fetch-static.js";
import {
  closeBrowser,
  renderWithPlaywright,
  shouldUsePlaywright,
} from "./renderers/playwright.js";
import { loadRobots } from "./robots/index.js";
import { discoverSitemapUrls, clampCrawlDelayMs } from "./sitemaps/index.js";
import {
  CrawlConfigSchema,
  type CrawlConfigInput,
  type CrawlResult,
  type OnProgress,
  type PageRecord,
} from "./types/index.js";

export async function crawlSite(
  input: CrawlConfigInput,
  opts?: { onProgress?: OnProgress; signal?: AbortSignal },
): Promise<CrawlResult> {
  const config = CrawlConfigSchema.parse(input);
  const homepage = normalizeCrawlUrl(config.url);
  const origin = originOf(homepage);
  const tracker = new ProgressTracker(opts?.onProgress);
  const queue = new InMemoryCrawlQueue();
  const pages: PageRecord[] = [];
  const deadline = Date.now() + config.maxRuntimeMs;

  const budgetExceeded = () => Date.now() >= deadline || opts?.signal?.aborted === true;

  await tracker.emit({
    phase: "normalize",
    pagesDiscovered: 1,
    pagesProcessed: 0,
    pagesRemaining: 1,
    currentUrl: homepage,
    message: `Normalized ${homepage}`,
  });

  await tracker.emit({
    phase: "robots",
    pagesDiscovered: 1,
    pagesProcessed: 0,
    pagesRemaining: 1,
    message: "Reading robots.txt",
  });

  const robots = await loadRobots(origin, {
    userAgent: config.userAgent,
    timeoutMs: 12_000,
    cache: globalCrawlCache,
    cacheTtlMs: config.cacheTtlMs,
  });

  const delayMs = clampCrawlDelayMs(
    Math.max(config.crawlDelayMs, robots.crawlDelayMs),
  );

  await tracker.emit({
    phase: "sitemap",
    pagesDiscovered: 1,
    pagesProcessed: 0,
    pagesRemaining: 1,
    message: "Looking for sitemap…",
  });

  let sitemapUrls: string[] = [];
  try {
    sitemapUrls = await discoverSitemapUrls(origin, {
      userAgent: config.userAgent,
      timeoutMs: 10_000,
      cache: globalCrawlCache,
      cacheTtlMs: config.cacheTtlMs,
      extraSitemapUrls: robots.sitemaps,
      maxSitemaps: config.mode === "deep" ? 25 : 8,
      maxUrls: config.mode === "deep" ? 5000 : 800,
      budgetMs: 25_000,
      onProgress: async (p) => {
        await tracker.emit({
          phase: "sitemap",
          pagesDiscovered: Math.max(1, p.urlsFound),
          pagesProcessed: 0,
          pagesRemaining: Math.max(1, p.urlsFound),
          currentUrl: p.currentUrl ?? undefined,
          message: p.message,
        });
      },
    });
  } catch (err) {
    tracker.warn(
      `Sitemap discovery soft-failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const discovered = new Set<string>([homepage, ...sitemapUrls.filter((u) => sameOrigin(u, homepage))]);

  await tracker.emit({
    phase: "discover",
    pagesDiscovered: discovered.size,
    pagesProcessed: 0,
    pagesRemaining: Math.min(discovered.size, config.maxPages),
    message: `Discovered ${discovered.size} URLs`,
  });

  // Seed from homepage HTML for nav links (quick/standard)
  try {
    const homeFetch = await fetchText(homepage, {
      timeoutMs: 18_000,
      maxBytes: config.maxResponseBytes,
      userAgent: config.userAgent,
      maxRedirects: config.maxRedirects,
    });
    if (homeFetch.ok) {
      for (const link of harvestLinksFromHtml(homeFetch.text, homeFetch.finalUrl, homepage)) {
        discovered.add(link);
      }
    }
  } catch (err) {
    tracker.warn(`Homepage link harvest soft-failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const prioritized = prioritizeUrls(
    homepage,
    Array.from(discovered).filter((u) => robots.isAllowed(u)),
    config.maxPages,
    config.mode,
  );

  for (const url of prioritized) {
    queue.enqueue(url, url === homepage ? 0 : 1);
  }

  await tracker.emit({
    phase: "queue",
    pagesDiscovered: discovered.size,
    pagesProcessed: 0,
    pagesRemaining: queue.countByState("queued"),
    message: `Queued ${queue.countByState("queued")} pages (${config.mode})`,
  });

  const pQueue = new PQueue({ concurrency: config.concurrency });

  async function processUrl(url: string, depth: number): Promise<void> {
    if (budgetExceeded()) {
      queue.mark(url, "cancelled");
      return;
    }
    if (!robots.isAllowed(url)) {
      queue.mark(url, "cancelled", "robots.txt disallowed");
      return;
    }

    await tracker.emit({
      phase: "extract",
      pagesDiscovered: discovered.size,
      pagesProcessed: pages.length,
      pagesRemaining: queue.countByState("queued") + queue.countByState("retry"),
      currentUrl: url,
      message: `Extracting ${url}`,
    });

    if (delayMs > 0) await sleep(delayMs);

    const maxAttempts = config.maxRetries + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const staticRes = await fetchText(url, {
        timeoutMs: 20_000,
        maxBytes: config.maxResponseBytes,
        userAgent: config.userAgent,
        maxRedirects: config.maxRedirects,
      });

      if (!staticRes.ok) {
        if (isTransientError(staticRes.statusCode, staticRes.error) && attempt < maxAttempts) {
          queue.mark(url, "retry", staticRes.error);
          await sleep(backoffMs(attempt));
          queue.mark(url, "processing");
          continue;
        }
        tracker.error(`${url}: ${staticRes.error}`);
        queue.mark(url, "failed", staticRes.error);
        return;
      }

      if (staticRes.statusCode === 403 || staticRes.statusCode === 404) {
        tracker.error(`${url}: HTTP ${staticRes.statusCode}`);
        queue.mark(url, "failed", `HTTP ${staticRes.statusCode}`);
        return;
      }

      let html = staticRes.text;
      let finalUrl = staticRes.finalUrl;
      let statusCode = staticRes.statusCode;
      let fetchMs = staticRes.fetchMs;
      let renderedWith: "cheerio" | "playwright" = "cheerio";

      if (shouldUsePlaywright(html, config.playwrightEnabled)) {
        const pw = await renderWithPlaywright(url, {
          timeoutMs: 25_000,
          userAgent: config.userAgent,
        });
        if (pw) {
          html = pw.html;
          finalUrl = pw.finalUrl;
          statusCode = pw.statusCode;
          fetchMs = pw.fetchMs;
          renderedWith = "playwright";
        } else {
          tracker.warn(`Playwright unavailable for ${url}; using static HTML`);
        }
      }

      const pageType = classifyPageType(finalUrl || url, homepage);
      const record = extractPageRecord({
        url,
        finalUrl,
        html,
        statusCode,
        pageType,
        fetchMs,
        renderedWith,
        homepageUrl: homepage,
      });

      if (record.markdown.trim().length < 40) {
        tracker.warn(`Thin content skipped: ${url}`);
        queue.mark(url, "failed", "thin content");
        return;
      }

      pages.push(record);
      tracker.markProcessed(fetchMs);
      queue.mark(url, "completed");

      if (
        (config.mode === "standard" || config.mode === "deep") &&
        depth < config.maxDepth &&
        pages.length < config.maxPages
      ) {
        for (const link of record.internalLinks) {
          if (!robots.isAllowed(link)) continue;
          if (!config.allowExternal && !sameOrigin(link, homepage)) continue;
          if (queue.has(link)) continue;
          if (queue.size() >= config.maxPages * 3) break;
          discovered.add(link);
          if (pages.length + queue.countByState("queued") < config.maxPages) {
            queue.enqueue(link, depth + 1);
          }
        }
      }
      return;
    }
  }

  try {
    while (!budgetExceeded() && pages.length < config.maxPages) {
      const next = queue.nextQueued();
      if (!next) {
        await pQueue.onIdle();
        if (!queue.nextQueued()) break;
        continue;
      }
      queue.mark(next.url, "processing");
      void pQueue.add(() => processUrl(next.url, next.depth));
      if (pQueue.size + pQueue.pending >= config.concurrency) {
        await pQueue.onSizeLessThan(config.concurrency);
      }
    }
    await pQueue.onIdle();
  } finally {
    await closeBrowser();
  }

  let scraped = toScrapedPages(pages);
  if (scraped.length > 0 && !scraped.some((p) => p.pageType === "homepage")) {
    scraped = [{ ...scraped[0], pageType: "homepage" }, ...scraped.slice(1)];
  }

  const finalProgress = await tracker.emit({
    phase: scraped.length > 0 ? "complete" : "failed",
    pagesDiscovered: discovered.size,
    pagesProcessed: scraped.length,
    pagesRemaining: 0,
    pagesFailed: queue.countByState("failed"),
    message:
      scraped.length > 0
        ? `Crawl complete: ${scraped.length} pages`
        : "Crawl produced no usable pages",
  });

  return {
    pages,
    scraped,
    progress: finalProgress,
    durationMs: tracker.durationMs(),
    mode: config.mode,
    warnings: tracker.getWarnings(),
  };
}

/** Single-page extract for diagnostics / sandbox / CLI scan-url. */
export async function loadPageHtml(
  url: string,
  opts?: {
    playwrightEnabled?: boolean;
    userAgent?: string;
    timeoutMs?: number;
    maxBytes?: number;
  },
): Promise<{
  html: string;
  finalUrl: string;
  statusCode: number;
  fetchMs: number;
  renderedWith: "cheerio" | "playwright";
  framework: import("./types/index.js").FrameworkId;
} | null> {
  const homepage = normalizeCrawlUrl(url);
  const res = await fetchText(homepage, {
    timeoutMs: opts?.timeoutMs ?? 15_000,
    maxBytes: opts?.maxBytes ?? 1_500_000,
    userAgent: opts?.userAgent ?? "MoneyGapCrawler/0.1 (+https://moneygap-ai.com)",
    maxRedirects: 8,
  });
  if (!res.ok) return null;

  let html = res.text;
  let finalUrl = res.finalUrl;
  let statusCode = res.statusCode;
  let fetchMs = res.fetchMs;
  let renderedWith: "cheerio" | "playwright" = "cheerio";

  if (shouldUsePlaywright(html, opts?.playwrightEnabled === true)) {
    const pw = await renderWithPlaywright(homepage, {
      timeoutMs: opts?.timeoutMs ?? 20_000,
      userAgent: opts?.userAgent ?? "MoneyGapCrawler/0.1 (+https://moneygap-ai.com)",
    });
    if (pw) {
      html = pw.html;
      finalUrl = pw.finalUrl;
      statusCode = pw.statusCode;
      fetchMs = pw.fetchMs;
      renderedWith = "playwright";
    }
    await closeBrowser();
  }

  const { detectFramework } = await import("./framework-detectors/index.js");
  return {
    html,
    finalUrl,
    statusCode,
    fetchMs,
    renderedWith,
    framework: detectFramework(html).framework,
  };
}

export async function extractSinglePage(
  url: string,
  opts?: {
    playwrightEnabled?: boolean;
    userAgent?: string;
    timeoutMs?: number;
    maxBytes?: number;
  },
): Promise<PageRecord | null> {
  const loaded = await loadPageHtml(url, opts);
  if (!loaded) return null;
  const homepage = normalizeCrawlUrl(url);
  return extractPageRecord({
    url: homepage,
    finalUrl: loaded.finalUrl,
    html: loaded.html,
    statusCode: loaded.statusCode,
    pageType: "homepage",
    fetchMs: loaded.fetchMs,
    renderedWith: loaded.renderedWith,
    homepageUrl: homepage,
  });
}
