import type { SiteFilesResult } from "../types";

async function fetchText(
  url: string,
): Promise<{ ok: boolean; status: number | null; body: string | null }> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "MoneyGapSelfOptimization/1.0" },
      signal: AbortSignal.timeout(6_000),
      cache: "no-store",
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: null, body: null };
  }
}

export async function fetchSiteFiles(origin: string): Promise<SiteFilesResult> {
  const base = origin.replace(/\/$/, "");
  const [robots, sitemap] = await Promise.all([
    fetchText(`${base}/robots.txt`),
    fetchText(`${base}/sitemap.xml`),
  ]);
  const sitemapAlt =
    !sitemap.ok ? await fetchText(`${base}/sitemap_index.xml`) : null;

  const sitemapFinal = sitemap.ok
    ? sitemap
    : sitemapAlt && sitemapAlt.ok
      ? sitemapAlt
      : sitemap;

  return {
    robotsOk: robots.ok && Boolean(robots.body?.trim()),
    robotsStatus: robots.status,
    robotsBody: robots.body,
    sitemapOk: sitemapFinal.ok && Boolean(sitemapFinal.body?.trim()),
    sitemapStatus: sitemapFinal.status,
    sitemapBody: sitemapFinal.body,
  };
}
