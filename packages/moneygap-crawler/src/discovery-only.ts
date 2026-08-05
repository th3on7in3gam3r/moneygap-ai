import { globalCrawlCache } from "./cache/memory.js";
import { normalizeCrawlUrl, originOf, sameOrigin } from "./discovery/normalize.js";
import { classifyPageType, prioritizeUrls } from "./discovery/prioritize.js";
import { harvestLinksFromHtml } from "./extractors/html.js";
import { detectFramework } from "./framework-detectors/index.js";
import { fetchText } from "./renderers/fetch-static.js";
import { loadRobots } from "./robots/index.js";
import { discoverSitemapUrls } from "./sitemaps/index.js";
import {
  CrawlConfigSchema,
  type CrawlConfigInput,
  type DiscoveryResult,
  type FrameworkId,
} from "./types/index.js";

/**
 * Discovery-only: robots + sitemaps + nav harvest + prioritize.
 * Does not extract page content.
 */
export async function discoverOnly(
  input: CrawlConfigInput,
): Promise<DiscoveryResult> {
  const started = Date.now();
  const config = CrawlConfigSchema.parse({ ...input, discoverOnly: true });
  const homepage = normalizeCrawlUrl(config.url);
  const origin = originOf(homepage);
  const warnings: string[] = [];

  const robots = await loadRobots(origin, {
    userAgent: config.userAgent,
    timeoutMs: 10_000,
    cache: globalCrawlCache,
    cacheTtlMs: config.cacheTtlMs,
  });

  let sitemapUrls: string[] = [];
  try {
    sitemapUrls = await discoverSitemapUrls(origin, {
      userAgent: config.userAgent,
      timeoutMs: 12_000,
      cache: globalCrawlCache,
      cacheTtlMs: config.cacheTtlMs,
      extraSitemapUrls: robots.sitemaps,
      maxSitemaps: config.mode === "deep" ? 25 : 8,
      maxUrls: Math.min(config.maxPages * 4, config.mode === "deep" ? 50_000 : 2_000),
    });
  } catch (err) {
    warnings.push(
      `Sitemap soft-fail: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const discovered = new Set<string>([
    homepage,
    ...sitemapUrls.filter((u) => sameOrigin(u, homepage)),
  ]);

  let framework: FrameworkId = "unknown";
  let jsRequired = false;
  let homepageLinkCount = 0;

  try {
    const homeFetch = await fetchText(homepage, {
      timeoutMs: 12_000,
      maxBytes: config.maxResponseBytes,
      userAgent: config.userAgent,
      maxRedirects: config.maxRedirects,
    });
    if (homeFetch.ok) {
      const detection = detectFramework(homeFetch.text);
      framework = detection.framework;
      jsRequired = detection.needsJs;
      const links = harvestLinksFromHtml(
        homeFetch.text,
        homeFetch.finalUrl,
        homepage,
      );
      homepageLinkCount = links.length;
      for (const link of links) discovered.add(link);
    }
  } catch (err) {
    warnings.push(
      `Homepage harvest soft-fail: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const allowed = Array.from(discovered).filter((u) => robots.isAllowed(u));
  const prioritized = prioritizeUrls(
    homepage,
    allowed,
    config.maxPages,
    config.mode,
  );

  // Tag types for consumers
  void classifyPageType;

  return {
    homepage,
    urls: prioritized,
    sitemapFound: sitemapUrls.length > 0 || robots.sitemaps.length > 0,
    sitemapUrlCount: sitemapUrls.length,
    robotsFound: Boolean(robots.raw && robots.raw.length > 10),
    framework,
    jsRequired,
    homepageLinkCount,
    warnings,
    durationMs: Date.now() - started,
  };
}
