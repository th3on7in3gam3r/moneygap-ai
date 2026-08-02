import type { PageCrawlSnapshot } from "../types";

const UA =
  "Mozilla/5.0 (compatible; MoneyGapCrawlability/1.0; +https://moneygap-ai.com)";

function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    let path = url.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    url.pathname = path || "/";
    return url.toString();
  } catch {
    return u;
  }
}

export async function checkBrokenInternalLinks(
  pages: PageCrawlSnapshot[],
  maxChecks = 20,
): Promise<{ from: string; to: string; status: number | null }[]> {
  const candidates: { from: string; to: string }[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    for (const href of page.internalHrefs) {
      const key = normalizeUrl(href);
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({ from: page.url, to: href });
      if (candidates.length >= maxChecks) break;
    }
    if (candidates.length >= maxChecks) break;
  }

  const broken: { from: string; to: string; status: number | null }[] = [];
  for (const c of candidates) {
    try {
      const res = await fetch(c.to, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": UA, Accept: "*/*" },
        signal: AbortSignal.timeout(6_000),
        cache: "no-store",
      });
      if (res.status >= 400) {
        broken.push({ from: c.from, to: c.to, status: res.status });
      }
    } catch {
      broken.push({ from: c.from, to: c.to, status: null });
    }
  }
  return broken;
}

/** URLs in sitemap (or expected set) with zero inbound internal links from probed pages. */
export function findOrphans(
  candidateUrls: string[],
  pages: PageCrawlSnapshot[],
): string[] {
  const inbound = new Set<string>();
  for (const p of pages) {
    inbound.add(normalizeUrl(p.finalUrl || p.url));
    for (const h of p.internalHrefs) inbound.add(normalizeUrl(h));
  }
  const orphans: string[] = [];
  for (const raw of candidateUrls) {
    const n = normalizeUrl(raw);
    try {
      const path = new URL(n).pathname;
      if (path === "/" || path === "") continue;
    } catch {
      continue;
    }
    if (!inbound.has(n)) orphans.push(raw);
  }
  return orphans.slice(0, 25);
}

/** Approximate depth from homepage via BFS on internal link graph. */
export function estimateMaxDepth(pages: PageCrawlSnapshot[], origin: string): number | null {
  if (pages.length === 0) return null;
  const home = origin.replace(/\/$/, "") + "/";
  const adj = new Map<string, string[]>();
  for (const p of pages) {
    const from = normalizeUrl(p.finalUrl || p.url);
    adj.set(from, p.internalHrefs.map(normalizeUrl));
  }
  const start = normalizeUrl(home);
  const queue: { url: string; depth: number }[] = [{ url: start, depth: 0 }];
  const visited = new Set<string>([start]);
  let max = 0;
  while (queue.length) {
    const cur = queue.shift()!;
    max = Math.max(max, cur.depth);
    for (const next of adj.get(cur.url) ?? []) {
      if (visited.has(next)) continue;
      if (!adj.has(next) && !pages.some((p) => normalizeUrl(p.finalUrl || p.url) === next)) {
        continue;
      }
      visited.add(next);
      queue.push({ url: next, depth: cur.depth + 1 });
    }
  }
  return max;
}

export function urlConsistencyIssues(pages: PageCrawlSnapshot[], origin: string): string[] {
  const issues: string[] = [];
  let wantWww: boolean | null = null;
  try {
    wantWww = new URL(origin).hostname.startsWith("www.");
  } catch {
    /* ignore */
  }
  for (const p of pages) {
    try {
      const u = new URL(p.finalUrl || p.url);
      if (u.protocol === "http:") {
        issues.push(`HTTP (not HTTPS): ${u.toString()}`);
      }
      if (wantWww != null) {
        const isWww = u.hostname.startsWith("www.");
        if (isWww !== wantWww) {
          issues.push(`Host mismatch (www): ${u.toString()}`);
        }
      }
    } catch {
      /* skip */
    }
  }
  return [...new Set(issues)].slice(0, 15);
}

export function duplicateUrlGroups(pages: PageCrawlSnapshot[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const p of pages) {
    try {
      const u = new URL(p.finalUrl || p.url);
      const key = `${u.pathname.replace(/\/$/, "") || "/"}|${u.search}`;
      const list = groups.get(key) ?? [];
      list.push(u.toString());
      groups.set(key, list);
    } catch {
      /* skip */
    }
  }
  return [...groups.values()].filter((g) => new Set(g).size > 1).slice(0, 10);
}
