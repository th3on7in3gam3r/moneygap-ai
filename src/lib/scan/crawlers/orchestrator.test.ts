import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  SuccessfulPageMap,
  meetsMinimumViableCorpus,
  normalizePageUrl,
} from "./merge";
import { scorePageQuality, pickBestPage } from "./quality";
import { validatePageContent } from "./content-validate";
import { normalizeCrawlUrl } from "./url-normalize";
import {
  monotonicProgress,
  recoverAndFinalizeCorpus,
  weightedCrawlProgress,
} from "./orchestrator";
import { assertPublicCrawlUrl, CrawlProviderError } from "./errors";
import { decideApifyWatchdog } from "./watchdog";
import type { ScrapedPage } from "./page-types";

function page(url: string, markdown: string, source = "apify"): ScrapedPage {
  return {
    url,
    pageType: "other",
    title: "T",
    markdown,
    metadata: { source, sourceProvider: source, statusCode: 200 },
  };
}

describe("url normalize", () => {
  it("collapses slash, hash, and tracking params", () => {
    const a = normalizeCrawlUrl("https://example.com");
    const b = normalizeCrawlUrl("https://example.com/");
    const c = normalizeCrawlUrl("https://example.com/#hero");
    const d = normalizeCrawlUrl("https://example.com/?utm_source=x&fbclid=1");
    assert.equal(a, b);
    assert.equal(a, c);
    assert.equal(normalizePageUrl(d), a);
  });

  it("keeps meaningful query params", () => {
    const u = normalizeCrawlUrl("https://example.com/search?q=shoes");
    assert.match(u, /q=shoes/);
  });
});

describe("SuccessfulPageMap merge", () => {
  it("preserves successful pages across providers", () => {
    const map = new SuccessfulPageMap("https://example.com");
    map.mergePage(page("https://example.com/", "A".repeat(200)), "apify");
    map.mergePage(page("https://example.com/pricing", "B".repeat(200)), "apify");
    map.markFailed("https://example.com/services", "primary_failed");
    map.mergePage(
      page("https://example.com/services", "C".repeat(500), "firecrawl"),
      "firecrawl",
    );
    assert.equal(map.size, 3);
    assert.equal(map.failedCount, 0);
    const dist = map.providerDistribution();
    assert.ok(dist.apify! >= 1);
    assert.ok(dist.firecrawl! >= 1);
  });

  it("picks higher quality page on conflict", () => {
    const thin = page("https://example.com/a", "x".repeat(50), "native");
    const rich = page("https://example.com/a", "y".repeat(5000), "firecrawl");
    assert.equal(pickBestPage(thin, rich).metadata.source, "firecrawl");
    assert.ok(scorePageQuality(rich) > scorePageQuality(thin));
  });

  it("404 does not stay as useful success", () => {
    const v = validatePageContent({
      markdown: "not found page",
      statusCode: 404,
    });
    assert.equal(v.ok, false);
  });
});

describe("minimum viable + partial", () => {
  it("accepts partial when enough pages exist", () => {
    const map = new SuccessfulPageMap("https://example.com");
    map.mergePage(
      { ...page("https://example.com/", "H".repeat(900)), pageType: "homepage" },
      "apify",
    );
    map.mergePage(page("https://example.com/about", "A".repeat(400)), "apify");
    map.mergePage(page("https://example.com/pricing", "P".repeat(400)), "apify");
    map.markFailed("https://example.com/missing", "404", { statusCode: 404 });
    const v = meetsMinimumViableCorpus(map, "quick");
    assert.equal(v.ok, true);
    assert.equal(v.partial, true);
  });

  it("rejects empty corpus", () => {
    const map = new SuccessfulPageMap("https://example.com");
    const v = meetsMinimumViableCorpus(map, "standard");
    assert.equal(v.ok, false);
  });
});

describe("progress monotonicity", () => {
  it("never goes backward", () => {
    assert.equal(monotonicProgress(40, 30), 40);
    assert.equal(monotonicProgress(40, 55), 55);
  });

  it("weighted stages increase through crawl lifecycle", () => {
    const a = weightedCrawlProgress({ stage: "connecting" });
    const b = weightedCrawlProgress({
      stage: "crawling_primary",
      pagesCompleted: 5,
      pagesDiscovered: 10,
    });
    const c = weightedCrawlProgress({ stage: "recovering_pages", recovering: true });
    const d = weightedCrawlProgress({ stage: "crawl_complete" });
    assert.ok(a < b);
    assert.ok(b < c);
    assert.ok(c < d);
  });
});

describe("SSRF", () => {
  it("blocks localhost and private IPv4", () => {
    assert.throws(() => assertPublicCrawlUrl("http://127.0.0.1/"));
    assert.throws(() => assertPublicCrawlUrl("http://10.0.0.1/"));
    assert.throws(() => assertPublicCrawlUrl("http://192.168.1.1/"));
    assert.throws(() => assertPublicCrawlUrl("http://[::1]/"));
  });
});

describe("watchdog terminal guarantee", () => {
  it("does not continue forever past budget", () => {
    const d = decideApifyWatchdog({
      run: { id: "r", status: "RUNNING" },
      crawlStartedAtMs: Date.now() - 999_999,
      lastProgressAtMs: Date.now() - 500_000,
      profileTimeoutMs: 60_000,
    });
    assert.notEqual(d.action, "continue");
  });
});

describe("orchestrator recovery (mocked)", () => {
  afterEach(() => {
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.SCRAPEDO_API_TOKEN;
    mock.restoreAll();
  });

  it("preserves primary pages when remotes missing", async () => {
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.SCRAPEDO_API_TOKEN;
    const primary = [
      { ...page("https://example.com/", "H".repeat(1000)), pageType: "homepage" as const },
      page("https://example.com/about", "A".repeat(500)),
      page("https://example.com/pricing", "P".repeat(500)),
    ];
    const result = await recoverAndFinalizeCorpus({
      homepageUrl: "https://example.com",
      profile: "quick",
      primaryPages: primary,
      primaryProvider: "apify",
      failedUrls: ["https://example.com/services"],
      deadlineAtMs: Date.now() + 60_000,
    });
    assert.equal(result.viable, true);
    assert.ok(result.pages.length >= 3);
    assert.equal(result.partial, true);
  });

  it("scrape.do missing token skips gracefully", async () => {
    delete process.env.SCRAPEDO_API_TOKEN;
    const { isScrapeDoConfigured, scrapeDoRescueUrls } = await import("./scrapedo");
    assert.equal(isScrapeDoConfigured(), false);
    const r = await scrapeDoRescueUrls(
      ["https://example.com/x"],
      "https://example.com",
    );
    assert.equal(r.pages.length, 0);
    assert.equal(r.failed.length, 1);
  });

  it("scrape.do rescue success with mocked fetch", async () => {
    process.env.SCRAPEDO_API_TOKEN = "test-token";
    mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      assert.ok(!url.includes("test-token") || url.includes("token="));
      // Ensure we can redact — response body only
      return new Response(
        `<html><title>Pricing</title><body>${"Price plans ".repeat(40)}</body></html>`,
        { status: 200 },
      );
    });
    const { scrapeDoFetchPage } = await import("./scrapedo");
    const pageResult = await scrapeDoFetchPage(
      "https://example.com/pricing",
      "https://example.com",
    );
    assert.ok(pageResult);
    assert.equal(pageResult!.metadata.sourceProvider, "scrapedo");
    assert.ok(pageResult!.markdown.length > 40);
  });

  it("scrape.do 404 is non-retryable", async () => {
    process.env.SCRAPEDO_API_TOKEN = "test-token";
    let calls = 0;
    mock.method(globalThis, "fetch", async () => {
      calls += 1;
      return new Response("not found", { status: 404 });
    });
    const { scrapeDoFetchPage } = await import("./scrapedo");
    await assert.rejects(
      () => scrapeDoFetchPage("https://example.com/gone", "https://example.com"),
      (err: unknown) =>
        err instanceof CrawlProviderError && err.retryable === false,
    );
    assert.equal(calls, 1);
  });
});
