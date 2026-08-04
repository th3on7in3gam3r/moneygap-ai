import { fetchText } from "./fetch.js";
import type { DiagnosticFinding } from "./types.js";

function parseRobots(robotsTxt: string): {
  sitemapUrls: string[];
  disallowAll: boolean;
  hasDisallow: boolean;
} {
  const lines = robotsTxt.split(/\r?\n/);
  let inStar = false;
  let disallowAll = false;
  let hasDisallow = false;
  const sitemapUrls: string[] = [];

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const lower = line.toLowerCase();

    if (lower.startsWith("sitemap:")) {
      const u = line.slice(line.indexOf(":") + 1).trim();
      if (u) sitemapUrls.push(u);
      continue;
    }

    if (lower.startsWith("user-agent:")) {
      const agent = line.slice(line.indexOf(":") + 1).trim().toLowerCase();
      inStar = agent === "*";
      continue;
    }

    if (!inStar) continue;

    if (lower.startsWith("disallow:")) {
      const path = line.slice(line.indexOf(":") + 1).trim();
      hasDisallow = true;
      if (path === "/" || path === "/*") disallowAll = true;
    }
  }

  return { sitemapUrls, disallowAll, hasDisallow };
}

export async function checkCrawlability(
  origin: string,
  opts: { timeoutMs: number; userAgent?: string },
): Promise<DiagnosticFinding[]> {
  const findings: DiagnosticFinding[] = [];
  const robotsUrl = new URL("/robots.txt", origin).href;
  const robots = await fetchText(robotsUrl, {
    timeoutMs: Math.min(opts.timeoutMs, 8_000),
    maxBytes: 256_000,
    userAgent: opts.userAgent,
  });

  let sitemapCandidates: string[] = [];

  if (!robots.ok || robots.statusCode >= 400) {
    findings.push({
      id: "crawl.robots_missing",
      category: "crawlability",
      severity: "warn",
      title: "robots.txt not found",
      detail:
        "No reachable robots.txt. Search engines may still crawl, but crawl rules and sitemap hints are missing.",
    });
  } else {
    findings.push({
      id: "crawl.robots_ok",
      category: "crawlability",
      severity: "pass",
      title: "robots.txt is reachable",
      detail: `Fetched ${robotsUrl} (HTTP ${robots.statusCode}).`,
    });

    const parsed = parseRobots(robots.text);
    sitemapCandidates = parsed.sitemapUrls;

    if (parsed.disallowAll) {
      findings.push({
        id: "crawl.robots_block_all",
        category: "crawlability",
        severity: "fail",
        title: "robots.txt blocks all crawlers",
        detail: 'User-agent * Disallow: / will prevent most search crawlers from indexing the site.',
      });
    } else if (parsed.hasDisallow) {
      findings.push({
        id: "crawl.robots_partial",
        category: "crawlability",
        severity: "info",
        title: "robots.txt has crawl rules",
        detail: "Disallow rules found for User-agent *. Review them if important pages are blocked.",
      });
    }
  }

  if (sitemapCandidates.length === 0) {
    sitemapCandidates = [
      new URL("/sitemap.xml", origin).href,
      new URL("/sitemap_index.xml", origin).href,
    ];
  }

  let sitemapOk = false;
  for (const sm of sitemapCandidates.slice(0, 4)) {
    const res = await fetchText(sm, {
      timeoutMs: Math.min(opts.timeoutMs, 8_000),
      maxBytes: 512_000,
      userAgent: opts.userAgent,
    });
    if (res.ok && res.statusCode < 400) {
      const looksLikeXml =
        /<\?xml/i.test(res.text) ||
        /<urlset[\s>]/i.test(res.text) ||
        /<sitemapindex[\s>]/i.test(res.text);
      if (looksLikeXml) {
        sitemapOk = true;
        findings.push({
          id: "crawl.sitemap_ok",
          category: "crawlability",
          severity: "pass",
          title: "Sitemap is reachable",
          detail: `Found a sitemap at ${sm}.`,
        });
        break;
      }
    }
  }

  if (!sitemapOk) {
    findings.push({
      id: "crawl.sitemap_missing",
      category: "crawlability",
      severity: "warn",
      title: "Sitemap not found",
      detail:
        "No reachable XML sitemap. Adding sitemap.xml helps discovery of important URLs.",
    });
  }

  return findings;
}
