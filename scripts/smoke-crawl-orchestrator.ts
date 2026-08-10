/**
 * Non-credit smoke for Crawl Orchestrator routing / env / deadline behavior.
 * Mocks provider HTTP — never calls Apify / Firecrawl / Scrape.do for real.
 *
 * Run: npx tsx --test scripts/smoke-crawl-orchestrator.ts
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { isApifyConfigured } from "../src/lib/scan/crawlers/apify";
import { routeCrawlStart } from "../src/lib/scan/crawlers/router";
import { recoverAndFinalizeCorpus } from "../src/lib/scan/crawlers/orchestrator";
import { diagnoseTickEnv, resolveCrawlTickOrigin } from "../src/lib/scan/tick-env";
import {
  isActiveCrawlDeadlinePassed,
  resolveActiveCrawlDeadlineAt,
} from "../src/lib/scan/deadline";
import { withTimeout } from "../src/lib/scan/watchdog";

const prev: Record<string, string | undefined> = {};

function stash(keys: string[]) {
  for (const k of keys) prev[k] = process.env[k];
}

function restore(keys: string[]) {
  for (const k of keys) {
    if (prev[k] === undefined) delete process.env[k];
    else process.env[k] = prev[k];
  }
}

describe("smoke-crawl-orchestrator", () => {
  afterEach(() => {
    restore([
      "APIFY_API_TOKEN",
      "APIFY_TOKEN",
      "FIRECRAWL_API_KEY",
      "SCRAPEDO_API_TOKEN",
      "SCRAPE_DO_API_TOKEN",
      "CRAWL_PROVIDER",
      "APP_URL",
      "NEXT_PUBLIC_APP_URL",
      "CRON_SECRET",
      "VERCEL_ENV",
    ]);
  });

  it("accepts APIFY_TOKEN alias and degrades when missing", () => {
    stash(["APIFY_API_TOKEN", "APIFY_TOKEN"]);
    delete process.env.APIFY_API_TOKEN;
    delete process.env.APIFY_TOKEN;
    assert.equal(isApifyConfigured(), false);

    process.env.APIFY_TOKEN = "alias-only";
    assert.equal(isApifyConfigured(), true);
  });

  it("SSRF / private URL fails early in router", async () => {
    stash(["APIFY_API_TOKEN", "APIFY_TOKEN", "CRAWL_PROVIDER"]);
    process.env.APIFY_API_TOKEN = "tok";
    delete process.env.CRAWL_PROVIDER;
    const result = await routeCrawlStart(
      {
        url: "http://127.0.0.1/",
        scanId: "smoke",
        profile: "quick",
        maxPages: 5,
        maxDepth: 1,
        timeoutMs: 60_000,
        useSitemap: false,
      },
      {
        startApify: async () => {
          throw new Error("should not start Apify for private URL");
        },
      },
    );
    assert.equal(result.kind, "failed");
  });

  it("Apify start failure routes toward fallbacks (mocked)", async () => {
    stash([
      "APIFY_API_TOKEN",
      "APIFY_TOKEN",
      "FIRECRAWL_API_KEY",
      "SCRAPEDO_API_TOKEN",
      "CRAWL_PROVIDER",
    ]);
    process.env.APIFY_API_TOKEN = "tok";
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.SCRAPEDO_API_TOKEN;
    delete process.env.CRAWL_PROVIDER;

    const result = await routeCrawlStart(
      {
        url: "https://example.com/",
        scanId: "smoke",
        profile: "quick",
        maxPages: 5,
        maxDepth: 1,
        timeoutMs: 60_000,
        useSitemap: false,
      },
      {
        startApify: async () => {
          throw new Error("mocked Apify start failure");
        },
      },
    );
    assert.equal(result.kind, "native_handoff");
  });

  it("deadline past → finalize without waiting for 3h stale", async () => {
    stash(["FIRECRAWL_API_KEY", "SCRAPEDO_API_TOKEN"]);
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.SCRAPEDO_API_TOKEN;

    const deadlineAtMs = Date.now() - 1_000;
    assert.equal(isActiveCrawlDeadlinePassed(deadlineAtMs), true);

    const result = await recoverAndFinalizeCorpus({
      homepageUrl: "https://example.com/",
      profile: "quick",
      primaryPages: [
        {
          url: "https://example.com/",
          title: "Home",
          markdown: "x".repeat(1_000),
          pageType: "homepage",
          metadata: { provider: "apify" },
        },
      ],
      primaryProvider: "apify",
      failedUrls: ["https://example.com/pricing"],
      deadlineAtMs,
    });
    assert.equal(result.viable, true);
    // Must not hang attempting recovery past deadline
    assert.ok(result.pages.length >= 1);
  });

  it("empty primary past deadline is non-viable (native handoff signal)", async () => {
    stash(["FIRECRAWL_API_KEY", "SCRAPEDO_API_TOKEN"]);
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.SCRAPEDO_API_TOKEN;

    const result = await recoverAndFinalizeCorpus({
      homepageUrl: "https://example.com/",
      profile: "quick",
      primaryPages: [],
      primaryProvider: "apify",
      deadlineAtMs: Date.now() - 5_000,
    });
    assert.equal(result.viable, false);
  });

  it("tick env splits missing secret vs missing APP_URL", () => {
    stash(["APP_URL", "NEXT_PUBLIC_APP_URL", "CRON_SECRET", "VERCEL_ENV"]);
    process.env.VERCEL_ENV = "production";
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.CRON_SECRET;

    const missingBoth = diagnoseTickEnv();
    assert.equal(missingBoth.ok, false);
    assert.match(missingBoth.message ?? "", /CRON_SECRET/);
    assert.match(missingBoth.message ?? "", /APP_URL/);

    process.env.CRON_SECRET = "secret";
    const missingOrigin = diagnoseTickEnv();
    assert.equal(missingOrigin.ok, false);
    assert.match(missingOrigin.message ?? "", /APP_URL/);
    assert.equal(missingOrigin.hasSecret, true);
    assert.equal(missingOrigin.hasOrigin, false);

    process.env.APP_URL = "https://moneygap-ai.com";
    const ok = diagnoseTickEnv();
    assert.equal(ok.ok, true);
    assert.equal(resolveCrawlTickOrigin().origin, "https://moneygap-ai.com");
  });

  it("withTimeout aborts AbortController on timeout", async () => {
    const controller = new AbortController();
    await assert.rejects(
      () =>
        withTimeout(
          new Promise(() => {
            /* hang */
          }),
          40,
          "smoke-hang",
          controller,
        ),
      /timed out/i,
    );
    assert.equal(controller.signal.aborted, true);
  });

  it("resolveActiveCrawlDeadlineAt prefers scanMeta", () => {
    const at = resolveActiveCrawlDeadlineAt({
      scanMeta: { crawlDeadlineAt: 12345 },
      profile: "standard",
    });
    assert.equal(at, 12345);
  });
});
