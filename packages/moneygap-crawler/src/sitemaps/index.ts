import { XMLParser } from "fast-xml-parser";
import type { MemoryCache } from "../cache/memory.js";
import { resolveUrl } from "../discovery/normalize.js";
import { fetchText } from "../renderers/fetch-static.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

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
  },
): Promise<string[]> {
  const maxSitemaps = opts.maxSitemaps ?? 10;
  const maxUrls = opts.maxUrls ?? 2000;
  const seeds = [
    ...(opts.extraSitemapUrls ?? []),
    `${origin.replace(/\/$/, "")}/sitemap.xml`,
    `${origin.replace(/\/$/, "")}/sitemap_index.xml`,
  ];

  const seenMaps = new Set<string>();
  const queue = [...seeds];
  const found = new Set<string>();

  while (queue.length > 0 && seenMaps.size < maxSitemaps && found.size < maxUrls) {
    const mapUrl = queue.shift()!;
    if (seenMaps.has(mapUrl)) continue;
    seenMaps.add(mapUrl);

    const cacheKey = `sitemap:${mapUrl}`;
    let xml = opts.cache.get<string>(cacheKey);
    if (xml == null) {
      const res = await fetchText(mapUrl, {
        timeoutMs: opts.timeoutMs,
        maxBytes: 5_000_000,
        userAgent: opts.userAgent,
        maxRedirects: 5,
      });
      if (!res.ok || res.statusCode >= 400) continue;
      xml = res.text;
      opts.cache.set(cacheKey, xml, opts.cacheTtlMs);
    }

    const { urls, childSitemaps } = parseSitemapXml(xml, mapUrl);
    for (const u of urls) {
      found.add(u);
      if (found.size >= maxUrls) break;
    }
    for (const child of childSitemaps) {
      if (!seenMaps.has(child)) queue.push(child);
    }
  }

  return Array.from(found);
}
