import type { SitemapProbeResult } from "../types";

const UA =
  "Mozilla/5.0 (compatible; MoneyGapCrawlability/1.0; +https://moneygap-ai.com)";

async function fetchText(
  url: string,
): Promise<{ ok: boolean; status: number | null; body: string | null }> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "application/xml,text/xml,*/*" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: null, body: null };
  }
}

function extractTags(body: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const v = m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    if (v) out.push(v);
  }
  return out;
}

export function parseSitemapBody(body: string): {
  validXml: boolean;
  isIndex: boolean;
  urls: string[];
  lastmodDates: string[];
} {
  const trimmed = body.trim();
  const looksXml =
    trimmed.startsWith("<?xml") ||
    /<urlset[\s>]/i.test(trimmed) ||
    /<sitemapindex[\s>]/i.test(trimmed);
  const isIndex = /<sitemapindex[\s>]/i.test(trimmed);
  const urls = isIndex
    ? extractTags(trimmed, "loc").slice(0, 200)
    : extractTags(trimmed, "loc").slice(0, 500);
  const lastmodDates = extractTags(trimmed, "lastmod").slice(0, 200);
  return {
    validXml: looksXml && urls.length > 0,
    isIndex,
    urls,
    lastmodDates,
  };
}

function isFresh(lastmods: string[]): boolean | null {
  if (lastmods.length === 0) return null;
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  let anyFresh = false;
  let anyParsed = false;
  for (const d of lastmods) {
    const t = Date.parse(d);
    if (Number.isNaN(t)) continue;
    anyParsed = true;
    if (t >= cutoff) anyFresh = true;
  }
  if (!anyParsed) return null;
  return anyFresh;
}

export async function probeSitemap(
  origin: string,
  robotsSitemapUrls: string[] = [],
): Promise<SitemapProbeResult> {
  const base = origin.replace(/\/$/, "");
  const candidates = [
    ...robotsSitemapUrls,
    `${base}/sitemap.xml`,
    `${base}/sitemap_index.xml`,
  ];
  const unique = [...new Set(candidates.filter(Boolean))];

  for (const url of unique) {
    const res = await fetchText(url);
    if (!res.ok || !res.body?.trim()) continue;
    const parsed = parseSitemapBody(res.body);
    if (!parsed.validXml && !res.ok) continue;
    return {
      ok: res.ok && (parsed.validXml || Boolean(res.body.trim())),
      status: res.status,
      body: res.body,
      validXml: parsed.validXml,
      isIndex: parsed.isIndex,
      urlCount: parsed.urls.length,
      urls: parsed.urls,
      lastmodDates: parsed.lastmodDates,
      fresh: isFresh(parsed.lastmodDates),
    };
  }

  return {
    ok: false,
    status: null,
    body: null,
    validXml: false,
    isIndex: false,
    urlCount: 0,
    urls: [],
    lastmodDates: [],
    fresh: null,
  };
}
