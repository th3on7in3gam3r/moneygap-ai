import { gunzipSync } from "node:zlib";
import { XMLParser } from "fast-xml-parser";
import type { MemoryCache } from "../cache/memory.js";
import { resolveUrl } from "../discovery/normalize.js";
import { fetchBytes } from "../renderers/fetch-static.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

const COMMON_SITEMAP_PATHS = [
  "/sitemap.xml",
  "/sitemap_index.xml",
  "/post-sitemap.xml",
  "/page-sitemap.xml",
  "/category-sitemap.xml",
  "/news-sitemap.xml",
  "/image-sitemap.xml",
  "/sitemap.xml.gz",
  "/sitemap_index.xml.gz",
] as const;

/** Hard wall for entire sitemap discovery phase (ms). */
export const SITEMAP_DISCOVER_BUDGET_MS = 25_000;

export type SitemapDiscoverProgress = {
  mapsTried: number;
  mapsOk: number;
  urlsFound: number;
  currentUrl: string | null;
  message: string;
};

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

export function parseSitemapXml(xml: string, baseUrl: string): {
  urls: string[];
  childSitemaps: string[];
} {
  const urls: string[] = [];
  const childSitemaps: string[] = [];
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch {
    return { urls, childSitemaps };
  }

  const root = doc as Record<string, unknown>;
  const urlset = root.urlset as Record<string, unknown> | undefined;
  const sitemapindex = root.sitemapindex as Record<string, unknown> | undefined;

  if (urlset) {
    for (const entry of asArray(urlset.url as { loc?: string } | { loc?: string }[])) {
      const loc = typeof entry?.loc === "string" ? entry.loc.trim() : "";
      const resolved = loc ? resolveUrl(baseUrl, loc) : null;
      if (resolved) urls.push(resolved);
    }
  }

  if (sitemapindex) {
    for (const entry of asArray(
      sitemapindex.sitemap as { loc?: string } | { loc?: string }[],
    )) {
      const loc = typeof entry?.loc === "string" ? entry.loc.trim() : "";
      const resolved = loc ? resolveUrl(baseUrl, loc) : null;
      if (resolved) childSitemaps.push(resolved);
    }
  }

  return { urls, childSitemaps };
}

function looksGzip(url: string, headers: Record<string, string>): boolean {
  if (/\.gz(\?|$)/i.test(url)) return true;
  const enc = headers["content-encoding"] ?? "";
  const ctype = headers["content-type"] ?? "";
  return /gzip/i.test(enc) || /gzip|application\/x-gzip/i.test(ctype);
}

function bytesToXml(
  bytes: Uint8Array,
  url: string,
  headers: Record<string, string>,
): string {
  if (looksGzip(url, headers) || (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b)) {
    try {
      return gunzipSync(Buffer.from(bytes)).toString("utf-8");
    } catch {
      /* fall through to utf-8 */
    }
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/** Clamp robots Crawl-delay to avoid multi-minute freezes between pages. */
export function clampCrawlDelayMs(delayMs: number, maxMs = 2_000): number {
  if (!Number.isFinite(delayMs) || delayMs <= 0) return 0;
  return Math.min(Math.max(0, delayMs), maxMs);
}

export function buildSitemapSeeds(
  origin: string,
  extraSitemapUrls?: string[],
): string[] {
  const base = origin.replace(/\/$/, "");
  const seeds = [
    ...(extraSitemapUrls ?? []),
    ...COMMON_SITEMAP_PATHS.map((p) => `${base}${p}`),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of seeds) {
    const key = s.split("#")[0]!.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export async function discoverSitemapUrls(
  origin: string,
  opts: {
    userAgent: string;
    timeoutMs: number;
    cache: MemoryCache;
    cacheTtlMs: number;
    extraSitemapUrls?: string[];
    maxSitemaps?: number;
    maxUrls?: number;
    /** Wall-clock budget for the whole discover phase. */
    budgetMs?: number;
    onProgress?: (p: SitemapDiscoverProgress) => void | Promise<void>;
  },
): Promise<string[]> {
  const maxSitemaps = opts.maxSitemaps ?? 10;
  const maxUrls = opts.maxUrls ?? 2000;
  const budgetMs = opts.budgetMs ?? SITEMAP_DISCOVER_BUDGET_MS;
  const started = Date.now();
  const seeds = buildSitemapSeeds(origin, opts.extraSitemapUrls);

  const seenMaps = new Set<string>();
  const queue = [...seeds];
  const found = new Set<string>();
  let mapsOk = 0;

  const emit = async (message: string, currentUrl: string | null = null) => {
    console.info("[Scanner]", message, {
      mapsTried: seenMaps.size,
      mapsOk,
      urlsFound: found.size,
      currentUrl,
    });
    await opts.onProgress?.({
      mapsTried: seenMaps.size,
      mapsOk,
      urlsFound: found.size,
      currentUrl,
      message,
    });
  };

  await emit(`Looking for sitemap… (${seeds.length} seed locations)`, null);

  while (
    queue.length > 0 &&
    seenMaps.size < maxSitemaps &&
    found.size < maxUrls
  ) {
    if (Date.now() - started >= budgetMs) {
      await emit(
        `Sitemap budget reached — continuing with ${found.size} URLs`,
        null,
      );
      break;
    }

    const mapUrl = queue.shift()!;
    if (seenMaps.has(mapUrl)) continue;
    seenMaps.add(mapUrl);

    await emit(
      found.size > 0
        ? `Found ${found.size} URLs…`
        : `Looking for sitemap… (${seenMaps.size}/${maxSitemaps})`,
      mapUrl,
    );

    const cacheKey = `sitemap:${mapUrl}`;
    let xml = opts.cache.get<string>(cacheKey);
    if (xml == null) {
      const remaining = Math.max(1_000, budgetMs - (Date.now() - started));
      const perFetch = Math.min(opts.timeoutMs, remaining);
      const res = await fetchBytes(mapUrl, {
        timeoutMs: perFetch,
        maxBytes: 5_000_000,
        userAgent: opts.userAgent,
        maxRedirects: 5,
      });
      if (!res.ok || (res.statusCode ?? 0) >= 400) {
        // Try .gz sibling when plain .xml 404s
        if (!/\.gz(\?|$)/i.test(mapUrl) && /\.xml(\?|$)/i.test(mapUrl)) {
          const gzUrl = mapUrl.replace(/\.xml(\?|$)/i, ".xml.gz$1");
          if (!seenMaps.has(gzUrl)) queue.push(gzUrl);
        }
        continue;
      }
      xml = bytesToXml(res.bytes, mapUrl, res.headers);
      if (!xml.trim()) continue;
      opts.cache.set(cacheKey, xml, opts.cacheTtlMs);
    }

    const { urls, childSitemaps } = parseSitemapXml(xml, mapUrl);
    if (urls.length === 0 && childSitemaps.length === 0) continue;

    mapsOk += 1;
    for (const u of urls) {
      found.add(u);
      if (found.size >= maxUrls) break;
    }
    for (const child of childSitemaps) {
      if (!seenMaps.has(child)) queue.push(child);
    }

    await emit(`Found ${found.size} URLs…`, mapUrl);
  }

  await emit(
    found.size > 0
      ? `Found ${found.size} URLs from ${mapsOk} sitemap(s)`
      : "No sitemap URLs — using homepage link discovery",
    null,
  );

  return Array.from(found);
}
