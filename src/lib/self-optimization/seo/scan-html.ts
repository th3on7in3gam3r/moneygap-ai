import Firecrawl from "@mendable/firecrawl-js";
import type { PageSeoSnapshot } from "../types";

function metaContent(html: string, nameOrProp: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${nameOrProp}["'][^>]+content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${nameOrProp}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function collectMetaPrefix(html: string, prefix: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<meta[^>]+>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const prop =
      tag.match(/(?:property|name)=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    if (!prop.startsWith(prefix)) continue;
    const content = tag.match(/content=["']([^"']*)["']/i)?.[1];
    if (content) out[prop] = content;
  }
  return out;
}

function headings(html: string, tag: "h1" | "h2"): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (text) out.push(text.slice(0, 200));
  }
  return out;
}

function jsonLdTypes(html: string): string[] {
  const types: string[] = [];
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1]) as unknown;
      const walk = (node: unknown) => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        const obj = node as Record<string, unknown>;
        const t = obj["@type"];
        if (typeof t === "string") types.push(t);
        if (Array.isArray(t)) {
          for (const x of t) if (typeof x === "string") types.push(x);
        }
        if (obj["@graph"]) walk(obj["@graph"]);
      };
      walk(data);
    } catch {
      /* ignore invalid JSON-LD */
    }
  }
  return [...new Set(types)];
}

function countLinks(html: string, origin: string): { internal: number; external: number } {
  const re = /<a[^>]+href=["']([^"']+)["']/gi;
  let internal = 0;
  let external = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }
    try {
      const abs = new URL(href, origin);
      if (abs.origin === origin) internal += 1;
      else external += 1;
    } catch {
      /* skip */
    }
  }
  return { internal, external };
}

function imageAltStats(html: string): { total: number; missingAlt: number } {
  const re = /<img\b[^>]*>/gi;
  let total = 0;
  let missingAlt = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    total += 1;
    const tag = m[0];
    const alt = tag.match(/\balt=["']([^"']*)["']/i);
    if (!alt || !alt[1].trim()) missingAlt += 1;
  }
  return { total, missingAlt };
}

function emptySnapshot(url: string): PageSeoSnapshot {
  return {
    url,
    status: null,
    title: null,
    metaDescription: null,
    canonical: null,
    og: {},
    twitter: {},
    h1: [],
    h2: [],
    imagesMissingAlt: 0,
    imageCount: 0,
    internalLinks: 0,
    externalLinks: 0,
    jsonLdTypes: [],
    hasMain: false,
    hasNav: false,
    hasFooter: false,
    htmlLength: 0,
    ttfbMs: null,
  };
}

export function parseHtmlToSnapshot(
  url: string,
  htmlInput: string,
  status: number | null,
  ttfbMs: number | null,
): PageSeoSnapshot {
  const html =
    htmlInput.length > 400_000 ? htmlInput.slice(0, 400_000) : htmlInput;
  const origin = (() => {
    try {
      return new URL(url).origin;
    } catch {
      return url;
    }
  })();

  const title =
    html
      .match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/<[^>]+>/g, "")
      .trim() ?? null;
  const imgs = imageAltStats(html);
  const links = countLinks(html, origin);

  return {
    url,
    status,
    title,
    metaDescription: metaContent(html, "description"),
    canonical:
      html.match(
        /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
      )?.[1] ??
      html.match(
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i,
      )?.[1] ??
      null,
    og: collectMetaPrefix(html, "og:"),
    twitter: collectMetaPrefix(html, "twitter:"),
    h1: headings(html, "h1"),
    h2: headings(html, "h2"),
    imagesMissingAlt: imgs.missingAlt,
    imageCount: imgs.total,
    internalLinks: links.internal,
    externalLinks: links.external,
    jsonLdTypes: jsonLdTypes(html),
    hasMain: /<main\b/i.test(html),
    hasNav: /<nav\b/i.test(html),
    hasFooter: /<footer\b/i.test(html),
    htmlLength: html.length,
    ttfbMs,
  };
}

const PAGE_FETCH_TIMEOUT_MS = 10_000;
/** Keep modest — local self-scans hit the same Next server that is running the job. */
const PAGE_FETCH_CONCURRENCY = 4;

function isLocalTarget(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/\.+$/, "").toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1"
    );
  } catch {
    return false;
  }
}

export async function fetchPageSeo(url: string): Promise<PageSeoSnapshot> {
  const started = Date.now();

  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MoneyGapSelfOptimization/1.1; +https://moneygap-ai.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    const ttfbMs = Date.now() - started;
    const raw = await res.text();
    return parseHtmlToSnapshot(url, raw, res.status, ttfbMs);
  } catch {
    return emptySnapshot(url);
  }
}

async function fetchPageSeoViaFirecrawl(url: string): Promise<PageSeoSnapshot | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const client = new Firecrawl({ apiKey });
    const result = await client.scrape(url, {
      formats: ["rawHtml", "html"],
      onlyMainContent: false,
    });
    const html =
      (typeof result.rawHtml === "string" && result.rawHtml) ||
      (typeof result.html === "string" && result.html) ||
      "";
    if (!html.trim()) return null;
    return parseHtmlToSnapshot(url, html, 200, null);
  } catch {
    return null;
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await fn(items[i]!, i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

export async function fetchPages(
  origin: string,
  paths: string[],
): Promise<PageSeoSnapshot[]> {
  const urls = paths.map((p) => {
    if (p.startsWith("http")) return p;
    return `${origin.replace(/\/$/, "")}${p.startsWith("/") ? p : `/${p}`}`;
  });
  const unique = [...new Set(urls)];

  // On Vercel/serverless, HTTP-fetching the same deployment often times out.
  // Prefer Firecrawl (external) for any non-local self-scan target.
  const useFirecrawlFirst =
    Boolean(process.env.FIRECRAWL_API_KEY?.trim()) && !isLocalTarget(origin);

  if (useFirecrawlFirst) {
    return mapPool(unique, 3, async (url) => {
      const viaFc = await fetchPageSeoViaFirecrawl(url);
      if (viaFc) return viaFc;
      return fetchPageSeo(url);
    });
  }

  let results = await mapPool(unique, PAGE_FETCH_CONCURRENCY, (url) =>
    fetchPageSeo(url),
  );

  const okCount = results.filter((p) => p.status === 200).length;
  if (okCount === 0 && process.env.FIRECRAWL_API_KEY?.trim()) {
    results = await mapPool(unique, 3, async (url) => {
      const viaFc = await fetchPageSeoViaFirecrawl(url);
      return viaFc ?? emptySnapshot(url);
    });
  }

  return results;
}
