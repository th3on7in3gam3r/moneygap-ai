import { EXPECTED_CONTENT_PATHS } from "@/lib/self-optimization/content-gaps/catalog";
import { crawlabilityIntegrationNotes } from "./integrations";
import { probeLlmsTxt, probePages } from "./probes/links";
import { probeRobots } from "./probes/robots";
import { probeSitemap } from "./probes/sitemap";
import {
  checkBrokenInternalLinks,
  duplicateUrlGroups,
  estimateMaxDepth,
  findOrphans,
  urlConsistencyIssues,
} from "./probes/structure";
import { scoreCrawlability } from "./score";
import type {
  CrawlabilityResult,
  RunCrawlabilityAuditOptions,
} from "./types";

function toAbsolute(origin: string, pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const base = origin.replace(/\/$/, "");
  return `${base}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

/**
 * Run Crawlability Score™ audit against an origin.
 * Deterministic — no invented integration findings.
 */
export async function runCrawlabilityAudit(
  originInput: string,
  opts: RunCrawlabilityAuditOptions = {},
): Promise<CrawlabilityResult> {
  let origin = originInput.trim();
  try {
    const u = new URL(origin.includes("://") ? origin : `https://${origin}`);
    origin = u.origin;
  } catch {
    origin = origin.replace(/\/$/, "");
  }

  const maxPages = opts.maxPages ?? 12;
  const maxLinkChecks = opts.maxLinkChecks ?? 20;

  const robots = await probeRobots(origin);
  const sitemap = await probeSitemap(origin, robots.sitemapDirectives);

  const defaultPaths = EXPECTED_CONTENT_PATHS.slice(0, 14).map((p) => p.path);
  const pathList = [...(opts.paths ?? defaultPaths), "/"];
  const fromOpts = (opts.knownUrls ?? []).slice(0, 40);
  const fromSitemap = sitemap.urls.slice(0, 30);

  const seedUrls = [
    ...pathList.map((p) => toAbsolute(origin, p)),
    ...fromOpts,
    ...fromSitemap,
  ]
    .map((u) => {
      try {
        const x = new URL(u);
        if (x.origin !== origin) return null;
        return x.toString();
      } catch {
        return null;
      }
    })
    .filter((u): u is string => Boolean(u));

  const uniqueSeeds = [...new Set(seedUrls)].slice(0, maxPages);

  const [pages, llmsTxt] = await Promise.all([
    probePages(uniqueSeeds, 4),
    probeLlmsTxt(origin),
  ]);

  const brokenInternal = await checkBrokenInternalLinks(pages, maxLinkChecks);
  const orphanCandidates = [
    ...sitemap.urls.slice(0, 40),
    ...uniqueSeeds,
  ];
  const orphans = findOrphans(orphanCandidates, pages);
  const maxDepth = estimateMaxDepth(pages, origin);
  const consistency = urlConsistencyIssues(pages, origin);
  const dupes = duplicateUrlGroups(pages);

  const evidence = {
    origin,
    robots,
    sitemap,
    pages,
    llmsTxt,
    brokenInternal,
    orphans,
    maxDepth,
    urlConsistencyIssues: consistency,
    duplicateUrlGroups: dupes,
  };

  const result = scoreCrawlability(evidence);
  const integrationNotes = await crawlabilityIntegrationNotes(opts.workspaceId);
  result.unavailableReasons = {
    ...result.unavailableReasons,
    ...integrationNotes,
  };

  // Drop heavy HTML evidence from return for persistence-friendly payloads
  const { evidence: _e, ...rest } = result;
  return {
    ...rest,
    evidence: {
      ...evidence,
      sitemap: {
        ...sitemap,
        body: sitemap.body ? sitemap.body.slice(0, 2000) : null,
      },
      robots: {
        ...robots,
        body: robots.body ? robots.body.slice(0, 2000) : null,
      },
    },
  };
}
