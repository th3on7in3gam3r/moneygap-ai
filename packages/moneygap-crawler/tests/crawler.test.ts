import { describe, expect, it } from "vitest";
import { toScrapedPage } from "../src/adapters/scraped-page.js";
import { normalizeCrawlUrl, resolveUrl, sameOrigin } from "../src/discovery/normalize.js";
import { classifyPageType, prioritizeUrls } from "../src/discovery/prioritize.js";
import { detectFramework } from "../src/framework-detectors/index.js";
import { extractPageRecord } from "../src/extractors/html.js";
import { backoffMs, InMemoryCrawlQueue, isTransientError } from "../src/queue/memory.js";
import {
  buildSitemapSeeds,
  clampCrawlDelayMs,
  parseSitemapXml,
  SITEMAP_DISCOVER_BUDGET_MS,
} from "../src/sitemaps/index.js";
import type { PageRecord } from "../src/types/index.js";

describe("normalize", () => {
  it("normalizes and compares origins", () => {
    const a = normalizeCrawlUrl("example.com/path/#hash");
    expect(a).toMatch(/^https:\/\/example\.com\/path/);
    expect(sameOrigin(a, "https://example.com/other")).toBe(true);
    expect(resolveUrl("https://example.com/a/", "../b")).toBe("https://example.com/b");
  });
});

describe("prioritize", () => {
  it("classifies and prioritizes quick pages", () => {
    const home = "https://acme.com/";
    expect(classifyPageType(home, home)).toBe("homepage");
    expect(classifyPageType("https://acme.com/pricing", home)).toBe("pricing");
    const urls = prioritizeUrls(
      home,
      [
        home,
        "https://acme.com/about",
        "https://acme.com/pricing",
        "https://acme.com/random-page",
        "https://acme.com/contact",
      ],
      8,
      "quick",
    );
    expect(urls[0]).toContain("acme.com");
    expect(urls.some((u) => u.includes("pricing"))).toBe(true);
    expect(urls.every((u) => !u.includes("random-page") || urls.length < 3)).toBe(true);
  });
});

describe("sitemap parse", () => {
  it("parses urlset and index", () => {
    const urlset = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://acme.com/</loc></url>
        <url><loc>https://acme.com/about</loc></url>
      </urlset>`;
    const a = parseSitemapXml(urlset, "https://acme.com/sitemap.xml");
    expect(a.urls).toContain("https://acme.com");
    expect(a.urls.length).toBeGreaterThanOrEqual(2);

    const index = `<?xml version="1.0"?>
      <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap><loc>https://acme.com/sitemap-pages.xml</loc></sitemap>
      </sitemapindex>`;
    const b = parseSitemapXml(index, "https://acme.com/sitemap_index.xml");
    expect(b.childSitemaps[0]).toContain("sitemap-pages.xml");
  });

  it("soft-fails invalid XML", () => {
    const bad = parseSitemapXml("<not-xml", "https://acme.com/sitemap.xml");
    expect(bad.urls).toEqual([]);
    expect(bad.childSitemaps).toEqual([]);
  });

  it("builds common WordPress-style seeds and clamps crawl-delay", () => {
    const seeds = buildSitemapSeeds("https://blog.example.com", [
      "https://blog.example.com/custom-sitemap.xml",
    ]);
    expect(seeds[0]).toContain("custom-sitemap.xml");
    expect(seeds.some((s) => s.endsWith("/post-sitemap.xml"))).toBe(true);
    expect(seeds.some((s) => s.endsWith("/page-sitemap.xml"))).toBe(true);
    expect(seeds.some((s) => s.endsWith("/sitemap.xml.gz"))).toBe(true);
    expect(SITEMAP_DISCOVER_BUDGET_MS).toBe(25_000);
    expect(clampCrawlDelayMs(60_000)).toBe(2_000);
    expect(clampCrawlDelayMs(500)).toBe(500);
    expect(clampCrawlDelayMs(-1)).toBe(0);
  });
});

describe("framework detection", () => {
  it("detects next and spa shells", () => {
    const next = detectFramework(
      `<html><script id="__NEXT_DATA__" type="application/json">{}</script><div id="__next"><h1>Hello product</h1><p>${"x".repeat(500)}</p></div></html>`,
    );
    expect(next.framework).toBe("nextjs");
    expect(next.needsJs).toBe(false);

    const spa = detectFramework(
      `<html><body><div id="root"></div><script src="/app.js"></script></body></html>`,
    );
    expect(spa.needsJs).toBe(true);
  });
});

describe("extractor + adapter", () => {
  it("extracts structured page and maps to ScrapedPage", () => {
    const html = `<!doctype html><html lang="en"><head>
      <title>Acme Pricing</title>
      <meta name="description" content="Plans"/>
      <meta property="og:title" content="Acme Pricing"/>
      <link rel="canonical" href="https://acme.com/pricing"/>
      <script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>
    </head><body>
      <h1>Pricing</h1><p>Simple plans for growth teams.</p>
      <a href="/about">About</a><a href="https://other.com">Ext</a>
      <img src="/logo.png"/>
    </body></html>`;
    const record = extractPageRecord({
      url: "https://acme.com/pricing",
      finalUrl: "https://acme.com/pricing",
      html,
      statusCode: 200,
      pageType: "pricing",
      fetchMs: 12,
      renderedWith: "cheerio",
      homepageUrl: "https://acme.com/",
    });
    expect(record.title).toBe("Acme Pricing");
    expect(record.schemaTypes).toContain("Organization");
    expect(record.internalLinks.some((u) => u.includes("/about"))).toBe(true);
    expect(record.markdown.length).toBeGreaterThan(20);

    const scraped = toScrapedPage(record);
    expect(scraped.pageType).toBe("pricing");
    expect(scraped.metadata.framework).toBeDefined();
  });
});

describe("queue retry", () => {
  it("tracks states and backoff", () => {
    const q = new InMemoryCrawlQueue();
    expect(q.enqueue("https://a.com/", 0)).toBe(true);
    expect(q.enqueue("https://a.com/", 0)).toBe(false);
    const next = q.nextQueued();
    expect(next?.url).toBe("https://a.com/");
    q.mark(next!.url, "processing");
    q.mark(next!.url, "retry", "timeout");
    expect(q.countByState("retry")).toBe(1);
    expect(isTransientError(429)).toBe(true);
    expect(backoffMs(1)).toBeGreaterThan(0);
  });
});

describe("memory stability", () => {
  it("processes many mock pages without retaining raw html arrays", () => {
    const pages: PageRecord[] = [];
    for (let i = 0; i < 50; i++) {
      const html = `<html><head><title>P${i}</title></head><body><h1>Page ${i}</h1><p>${"content ".repeat(80)}</p></body></html>`;
      pages.push(
        extractPageRecord({
          url: `https://acme.com/p/${i}`,
          finalUrl: `https://acme.com/p/${i}`,
          html,
          statusCode: 200,
          pageType: "other",
          fetchMs: 1,
          renderedWith: "cheerio",
          homepageUrl: "https://acme.com/",
        }),
      );
    }
    expect(pages).toHaveLength(50);
    expect(pages.every((p) => p.markdown.length > 40)).toBe(true);
  });
});
