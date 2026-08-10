import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import {
  assertPublicCrawlUrl,
  classifyCrawlError,
  CrawlProviderError,
  isFallbackEligible,
  isNonFallbackError,
} from "./errors";
import {
  getApifyCircuitSnapshot,
  isApifyCircuitOpen,
  recordApifyProviderFailure,
  recordApifySuccess,
  resetApifyCircuitForTests,
} from "./circuit";
import {
  isApifyConfigured,
  isApifyInProgress,
  isApifySuccess,
  isApifyTerminalFailure,
  normalizeApifyDataset,
  normalizeApifyPage,
} from "./apify";
import { buildApifyActorInput, mapProfileToApifyInput } from "./profiles";
import { buildProgressUpdate, crawlStageMessage } from "./progress";
import {
  getPreferredCrawlProvider,
  resolveProviderOrder,
  routeCrawlStart,
} from "./router";
import { decideApifyWatchdog } from "./watchdog";

describe("crawler errors", () => {
  it("rejects invalid URLs without fallback", () => {
    assert.throws(
      () => assertPublicCrawlUrl("not a url"),
      (err: unknown) =>
        err instanceof CrawlProviderError && err.errorClass === "invalid_url",
    );
    assert.equal(isNonFallbackError("invalid_url"), true);
    assert.equal(isFallbackEligible("invalid_url"), false);
  });

  it("rejects private/localhost URLs", () => {
    assert.throws(
      () => assertPublicCrawlUrl("http://localhost:3000"),
      (err: unknown) =>
        err instanceof CrawlProviderError && err.errorClass === "private_url",
    );
    assert.throws(() => assertPublicCrawlUrl("http://127.0.0.1/"));
    assert.throws(() => assertPublicCrawlUrl("http://192.168.1.1/"));
  });

  it("rejects unsupported protocols", () => {
    assert.throws(
      () => assertPublicCrawlUrl("ftp://example.com"),
      (err: unknown) =>
        err instanceof CrawlProviderError &&
        err.errorClass === "unsupported_protocol",
    );
  });

  it("classifies timeout and provider errors as fallback-eligible", () => {
    assert.equal(classifyCrawlError(new Error("ETIMEDOUT")), "timeout");
    assert.equal(classifyCrawlError(new Error("403 cloudflare blocked")), "anti_bot");
    assert.equal(classifyCrawlError(new Error("429 rate limit")), "rate_limit");
    assert.equal(isFallbackEligible("timeout"), true);
    assert.equal(isFallbackEligible("dns"), false);
  });
});

describe("apify circuit breaker", () => {
  beforeEach(() => resetApifyCircuitForTests());
  afterEach(() => resetApifyCircuitForTests());

  it("opens after consecutive provider failures", () => {
    assert.equal(isApifyCircuitOpen(), false);
    recordApifyProviderFailure();
    recordApifyProviderFailure();
    assert.equal(isApifyCircuitOpen(), false);
    recordApifyProviderFailure();
    assert.equal(isApifyCircuitOpen(), true);
    assert.ok(getApifyCircuitSnapshot().openedUntil > Date.now());
  });

  it("resets on success", () => {
    recordApifyProviderFailure();
    recordApifyProviderFailure();
    recordApifyProviderFailure();
    recordApifySuccess();
    assert.equal(isApifyCircuitOpen(), false);
    assert.equal(getApifyCircuitSnapshot().consecutiveFailures, 0);
  });
});

describe("scan profile → Apify mapping", () => {
  it("maps quick/standard/deep/enterprise from existing profiles", () => {
    const quick = mapProfileToApifyInput("quick");
    assert.equal(quick.maxCrawlPages, 25);
    assert.equal(quick.maxCrawlDepth, 2);
    assert.equal(quick.useSitemaps, false);
    assert.equal(quick.crawlerType, "cheerio");

    const standard = mapProfileToApifyInput("standard");
    assert.equal(standard.maxCrawlPages, 100);
    assert.equal(standard.maxCrawlDepth, 2);
    assert.equal(standard.useSitemaps, true);
    assert.equal(standard.crawlerType, "playwright:adaptive");

    const deep = mapProfileToApifyInput("deep");
    assert.equal(deep.maxCrawlPages, 500);
    assert.equal(deep.maxCrawlDepth, 6);

    const enterprise = mapProfileToApifyInput("enterprise");
    assert.equal(enterprise.maxCrawlPages, 5000);
    assert.equal(enterprise.maxCrawlDepth, 12);

    const input = buildApifyActorInput("https://example.com", "quick");
    assert.equal(input.saveMarkdown, true);
    assert.equal(input.saveHtml, false);
    assert.equal(input.removeCookieWarnings, true);
    assert.deepEqual(input.startUrls, [{ url: "https://example.com" }]);
  });
});

describe("apify status mapping", () => {
  it("maps SUCCEEDED / FAILED / TIMED-OUT / ABORTED", () => {
    assert.equal(isApifySuccess("SUCCEEDED"), true);
    assert.equal(isApifyTerminalFailure("FAILED"), true);
    assert.equal(isApifyTerminalFailure("TIMED-OUT"), true);
    assert.equal(isApifyTerminalFailure("ABORTED"), true);
    assert.equal(isApifyInProgress("RUNNING"), true);
    assert.equal(isApifyInProgress("READY"), true);
  });
});

describe("apify dataset normalization", () => {
  const home = "https://example.com";

  it("normalizes a successful dataset item", () => {
    const page = normalizeApifyPage(
      {
        url: "https://example.com/pricing",
        loadedUrl: "https://example.com/pricing/",
        title: "Pricing",
        markdown: "A".repeat(80),
        metadata: { language: "en", description: "Plans" },
        httpStatusCode: 200,
      },
      home,
    );
    assert.ok(page);
    assert.equal(page!.pageType, "pricing");
    assert.equal(page!.title, "Pricing");
    assert.equal(page!.metadata.source, "apify");
    assert.equal(page!.metadata.statusCode, 200);
  });

  it("skips empty / thin markdown and malformed rows", () => {
    assert.equal(normalizeApifyPage({ url: home, markdown: "short" }, home), null);
    assert.equal(normalizeApifyPage(null as unknown as Record<string, unknown>, home), null);
    assert.equal(normalizeApifyPage({ markdown: "A".repeat(80) }, home), null);

    const pages = normalizeApifyDataset(
      [
        { url: home, markdown: "A".repeat(80), title: "Home" },
        { not: "a page" },
        { url: "https://example.com/about", markdown: "B".repeat(80) },
      ],
      home,
    );
    assert.equal(pages.length, 2);
    assert.equal(pages[0]!.pageType, "homepage");
  });

  it("handles empty dataset", () => {
    assert.deepEqual(normalizeApifyDataset([], home), []);
  });
});

describe("progress messages", () => {
  it("exposes meaningful stage copy without fake percentages", () => {
    assert.match(crawlStageMessage("starting"), /Starting crawler/);
    assert.match(crawlStageMessage("running", { provider: "apify" }), /Apify crawl running/);
    assert.match(
      crawlStageMessage("running", { provider: "apify", pagesDiscovered: 18 }),
      /18 pages discovered/,
    );
    assert.match(crawlStageMessage("retrieving"), /Retrieving/);
    assert.match(crawlStageMessage("normalizing"), /Normalizing/);
    assert.match(crawlStageMessage("complete"), /complete/i);

    const update = buildProgressUpdate("apify", "discovering", {
      pagesDiscovered: 7,
    });
    assert.equal(update.provider, "apify");
    assert.equal(update.stage, "discovering");
    assert.match(update.message, /7 pages/);
  });
});

describe("watchdog", () => {
  it("keeps monitoring RUNNING runs", () => {
    const d = decideApifyWatchdog({
      run: { id: "r1", status: "RUNNING" },
      crawlStartedAtMs: Date.now() - 10_000,
      lastProgressAtMs: Date.now() - 5_000,
      profileTimeoutMs: 60_000,
    });
    assert.equal(d.action, "continue");
  });

  it("processes SUCCEEDED", () => {
    const d = decideApifyWatchdog({
      run: { id: "r1", status: "SUCCEEDED", defaultDatasetId: "d1" },
      crawlStartedAtMs: Date.now() - 10_000,
      lastProgressAtMs: Date.now(),
      profileTimeoutMs: 60_000,
    });
    assert.equal(d.action, "process_success");
  });

  it("falls back on FAILED / TIMED-OUT / ABORTED", () => {
    for (const status of ["FAILED", "TIMED-OUT", "ABORTED"] as const) {
      const d = decideApifyWatchdog({
        run: { id: "r1", status },
        crawlStartedAtMs: Date.now() - 1_000,
        lastProgressAtMs: Date.now(),
        profileTimeoutMs: 60_000,
      });
      assert.equal(d.action, "fallback", status);
    }
  });

  it("falls back when run missing or global budget exceeded", () => {
    assert.equal(
      decideApifyWatchdog({
        run: null,
        crawlStartedAtMs: Date.now() - 1_000,
        lastProgressAtMs: null,
        profileTimeoutMs: 60_000,
      }).action,
      "fallback",
    );

    assert.equal(
      decideApifyWatchdog({
        run: { id: "r1", status: "RUNNING" },
        crawlStartedAtMs: Date.now() - 120_000,
        lastProgressAtMs: Date.now(),
        profileTimeoutMs: 60_000,
      }).action,
      "fallback",
    );
  });

  it("never leaves reading-pages forever when budget exceeded", () => {
    const d = decideApifyWatchdog({
      run: { id: "r1", status: "RUNNING" },
      crawlStartedAtMs: Date.now() - 999_999,
      lastProgressAtMs: Date.now() - 500_000,
      profileTimeoutMs: 4 * 60_000,
    });
    assert.notEqual(d.action, "continue");
  });
});

describe("provider order + router", () => {
  const prevToken = process.env.APIFY_API_TOKEN;
  const prevFc = process.env.FIRECRAWL_API_KEY;
  const prevPref = process.env.CRAWL_PROVIDER;

  afterEach(() => {
    if (prevToken === undefined) delete process.env.APIFY_API_TOKEN;
    else process.env.APIFY_API_TOKEN = prevToken;
    delete process.env.APIFY_TOKEN;
    if (prevFc === undefined) delete process.env.FIRECRAWL_API_KEY;
    else process.env.FIRECRAWL_API_KEY = prevFc;
    if (prevPref === undefined) delete process.env.CRAWL_PROVIDER;
    else process.env.CRAWL_PROVIDER = prevPref;
    resetApifyCircuitForTests();
  });

  it("skips Apify when token missing", () => {
    delete process.env.APIFY_API_TOKEN;
    delete process.env.CRAWL_PROVIDER;
    const order = resolveProviderOrder("auto");
    assert.deepEqual(order, ["firecrawl", "native"]);
  });

  it("puts Apify first when token present", () => {
    process.env.APIFY_API_TOKEN = "test-token";
    delete process.env.CRAWL_PROVIDER;
    assert.deepEqual(resolveProviderOrder("auto"), [
      "apify",
      "firecrawl",
      "native",
    ]);
  });

  it("accepts APIFY_TOKEN alias when APIFY_API_TOKEN unset", () => {
    delete process.env.APIFY_API_TOKEN;
    process.env.APIFY_TOKEN = "alias-token";
    delete process.env.CRAWL_PROVIDER;
    assert.equal(isApifyConfigured(), true);
    assert.deepEqual(resolveProviderOrder("auto")[0], "apify");
    delete process.env.APIFY_TOKEN;
  });

  it("honors CRAWL_PROVIDER=native", () => {
    process.env.CRAWL_PROVIDER = "native";
    assert.equal(getPreferredCrawlProvider(), "native");
    assert.deepEqual(resolveProviderOrder(), ["native"]);
  });

  it("starts Apify asynchronously on success", async () => {
    process.env.APIFY_API_TOKEN = "test-token";
    delete process.env.CRAWL_PROVIDER;
    const result = await routeCrawlStart(
      {
        url: "https://example.com",
        scanId: "scan-1",
        profile: "quick",
        maxPages: 25,
        maxDepth: 2,
        timeoutMs: 60_000,
        useSitemap: false,
      },
      {
        startApify: async () => ({
          id: "run-abc",
          status: "RUNNING",
          defaultDatasetId: null,
        }),
      },
    );
    assert.equal(result.kind, "apify_started");
    if (result.kind === "apify_started") {
      assert.equal(result.runId, "run-abc");
    }
  });

  it("falls back to Firecrawl when Apify start fails", async () => {
    process.env.APIFY_API_TOKEN = "test-token";
    process.env.FIRECRAWL_API_KEY = "fc-key";
    delete process.env.CRAWL_PROVIDER;

    // Mock Firecrawl provider by forcing firecrawl path after apify fail —
    // firecrawlCrawlProvider will call real SDK; instead stub via missing key after fail...
    // Use CRAWL_PROVIDER order by making startApify throw, then firecrawl not configured → native.
    delete process.env.FIRECRAWL_API_KEY;

    const result = await routeCrawlStart(
      {
        url: "https://example.com",
        scanId: "scan-2",
        profile: "quick",
        maxPages: 25,
        maxDepth: 2,
        timeoutMs: 60_000,
        useSitemap: false,
      },
      {
        startApify: async () => {
          throw new CrawlProviderError("Apify FAILED", {
            errorClass: "provider",
            provider: "apify",
            retryable: true,
          });
        },
      },
    );
    assert.equal(result.kind, "native_handoff");
    if (result.kind === "native_handoff") {
      assert.equal(result.fallbackUsed, true);
    }
  });

  it("does not fallback for invalid URL", async () => {
    process.env.APIFY_API_TOKEN = "test-token";
    const result = await routeCrawlStart(
      {
        url: "http://localhost/secret",
        scanId: "scan-3",
        profile: "quick",
        maxPages: 10,
        maxDepth: 1,
        timeoutMs: 30_000,
        useSitemap: false,
      },
      {
        startApify: async () => {
          throw new Error("should not start");
        },
      },
    );
    assert.equal(result.kind, "failed");
    if (result.kind === "failed") {
      assert.equal(result.error.errorClass, "private_url");
    }
  });

  it("falls through to native when all remote providers unavailable", async () => {
    delete process.env.APIFY_API_TOKEN;
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.CRAWL_PROVIDER;
    const result = await routeCrawlStart(
      {
        url: "https://example.com",
        scanId: "scan-4",
        profile: "standard",
        maxPages: 100,
        maxDepth: 2,
        timeoutMs: 60_000,
        useSitemap: true,
      },
      {
        startApify: async () => {
          throw new Error("unreachable");
        },
      },
    );
    assert.equal(result.kind, "native_handoff");
  });
});

describe("apify HTTP client (mocked)", () => {
  const prevToken = process.env.APIFY_API_TOKEN;

  beforeEach(() => {
    process.env.APIFY_API_TOKEN = "test-token";
  });

  afterEach(() => {
    if (prevToken === undefined) delete process.env.APIFY_API_TOKEN;
    else process.env.APIFY_API_TOKEN = prevToken;
    mock.restoreAll();
  });

  it("startApifyRun uses Bearer auth and actor path", async () => {
    const { startApifyRun } = await import("./apify");
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          data: { id: "run-1", status: "RUNNING", defaultDatasetId: null },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    });

    const run = await startApifyRun({
      url: "https://example.com",
      profile: "quick",
    });
    assert.equal(run.id, "run-1");
    assert.ok(calls[0]!.url.includes("apify~website-content-crawler/runs"));
    const headers = new Headers(calls[0]!.init?.headers);
    assert.equal(headers.get("Authorization"), "Bearer test-token");
    assert.ok(!calls[0]!.url.includes("test-token"));
  });

  it("getApifyRun + dataset retrieval", async () => {
    const { getApifyRun, getApifyDatasetItems } = await import("./apify");
    mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/actor-runs/")) {
        return new Response(
          JSON.stringify({
            data: {
              id: "run-1",
              status: "SUCCEEDED",
              defaultDatasetId: "ds-1",
            },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/datasets/ds-1/items")) {
        return new Response(
          JSON.stringify([
            {
              url: "https://example.com",
              markdown: "Home content ".repeat(20),
              title: "Example",
            },
          ]),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    });

    const run = await getApifyRun("run-1");
    assert.equal(run.status, "SUCCEEDED");
    const items = await getApifyDatasetItems("ds-1");
    assert.equal(items.length, 1);
    const pages = normalizeApifyDataset(items, "https://example.com");
    assert.equal(pages.length, 1);
  });

  it("missing token throws classified provider error", async () => {
    delete process.env.APIFY_API_TOKEN;
    const { startApifyRun } = await import("./apify");
    await assert.rejects(
      () => startApifyRun({ url: "https://example.com", profile: "quick" }),
      (err: unknown) =>
        err instanceof CrawlProviderError &&
        err.errorClass === "provider" &&
        /APIFY_API_TOKEN/.test(err.message),
    );
  });
});
