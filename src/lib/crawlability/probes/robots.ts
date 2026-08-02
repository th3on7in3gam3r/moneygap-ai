import type { RobotsProbeResult } from "../types";

const UA =
  "Mozilla/5.0 (compatible; MoneyGapCrawlability/1.0; +https://moneygap-ai.com)";

async function fetchText(
  url: string,
): Promise<{ ok: boolean; status: number | null; body: string | null }> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/plain,*/*" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: null, body: null };
  }
}

/** Parse robots.txt for crawl-blocking and Sitemap directives. */
export function parseRobotsBody(body: string): {
  blocksAll: boolean;
  blocksHomepage: boolean;
  sitemapDirectives: string[];
  disallowPaths: string[];
} {
  const lines = body.split(/\r?\n/).map((l) => l.trim());
  const sitemapDirectives: string[] = [];
  const disallowPaths: string[] = [];
  let inStarOrGooglebot = false;
  let blocksAll = false;
  let blocksHomepage = false;

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const lower = line.toLowerCase();
    if (lower.startsWith("user-agent:")) {
      const agent = line.slice(line.indexOf(":") + 1).trim().toLowerCase();
      inStarOrGooglebot = agent === "*" || agent.includes("googlebot");
      continue;
    }
    if (lower.startsWith("sitemap:")) {
      const url = line.slice(line.indexOf(":") + 1).trim();
      if (url) sitemapDirectives.push(url);
      continue;
    }
    if (!inStarOrGooglebot) continue;
    if (lower.startsWith("disallow:")) {
      const path = line.slice(line.indexOf(":") + 1).trim() || "/";
      disallowPaths.push(path);
      if (path === "/") blocksAll = true;
      if (path === "/" || path === "") blocksHomepage = true;
    }
  }

  return { blocksAll, blocksHomepage, sitemapDirectives, disallowPaths };
}

export async function probeRobots(origin: string): Promise<RobotsProbeResult> {
  const base = origin.replace(/\/$/, "");
  const res = await fetchText(`${base}/robots.txt`);
  if (!res.ok || !res.body?.trim()) {
    return {
      ok: false,
      status: res.status,
      body: res.body,
      blocksAll: false,
      blocksHomepage: false,
      sitemapDirectives: [],
      disallowPaths: [],
    };
  }
  const parsed = parseRobotsBody(res.body);
  return {
    ok: true,
    status: res.status,
    body: res.body,
    ...parsed,
  };
}
