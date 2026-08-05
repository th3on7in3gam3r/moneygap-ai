import robotsParser from "robots-parser";
import type { MemoryCache } from "../cache/memory.js";
import { fetchText } from "../renderers/fetch-static.js";

export type RobotsGate = {
  isAllowed: (url: string) => boolean;
  crawlDelayMs: number;
  sitemaps: string[];
  raw: string | null;
};

export async function loadRobots(
  origin: string,
  opts: {
    userAgent: string;
    timeoutMs: number;
    cache: MemoryCache;
    cacheTtlMs: number;
  },
): Promise<RobotsGate> {
  const robotsUrl = `${origin.replace(/\/$/, "")}/robots.txt`;
  const cacheKey = `robots:${robotsUrl}`;
  const cached = opts.cache.get<string>(cacheKey);

  let raw: string | null = cached ?? null;
  if (raw == null) {
    const res = await fetchText(robotsUrl, {
      timeoutMs: opts.timeoutMs,
      maxBytes: 512_000,
      userAgent: opts.userAgent,
      maxRedirects: 5,
    });
    raw = res.ok && res.statusCode < 400 ? res.text : "";
    opts.cache.set(cacheKey, raw, opts.cacheTtlMs);
  }

  const parser = robotsParser(robotsUrl, raw || "");
  const delaySec = parser.getCrawlDelay(opts.userAgent) ?? parser.getCrawlDelay("*");
  const sitemaps = parser.getSitemaps?.() ?? [];

  return {
    raw: raw || null,
    sitemaps,
    crawlDelayMs: delaySec != null ? Math.round(Number(delaySec) * 1000) : 0,
    isAllowed: (url: string) => {
      try {
        return parser.isAllowed(url, opts.userAgent) !== false;
      } catch {
        return true;
      }
    },
  };
}
