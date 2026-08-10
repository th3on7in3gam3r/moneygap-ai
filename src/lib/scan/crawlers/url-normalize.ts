/** Tracking / noise query params collapsed for crawl dedup. */
const STRIP_KEYS = new Set([
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "_ga",
  "_gl",
  "yclid",
  "msclkid",
  "dclid",
  "twclid",
  "li_fat_id",
  "igshid",
  "vero_id",
]);

function shouldStripParam(key: string): boolean {
  const k = key.toLowerCase();
  if (STRIP_KEYS.has(k)) return true;
  if (k.startsWith("utm_")) return true;
  if (k.startsWith("mc_")) return true;
  return false;
}

/**
 * Canonical crawl URL for dedup (local copy so tests don't require moneygap-crawler CJS).
 * Collapses trailing slash, hash, tracking params; keeps meaningful query params.
 */
export function normalizeCrawlUrl(raw: string): string {
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withProto);
    u.hash = "";
    u.protocol = "https:";
    u.hostname = u.hostname.toLowerCase();

    const kept = new URLSearchParams();
    const keys = [...u.searchParams.keys()].sort();
    for (const key of keys) {
      if (shouldStripParam(key)) continue;
      for (const value of u.searchParams.getAll(key)) {
        kept.append(key, value);
      }
    }
    u.search = kept.toString() ? `?${kept.toString()}` : "";

    let href = u.href;
    if (href.endsWith("/") && u.pathname !== "/") {
      href = href.slice(0, -1);
    } else if (u.pathname === "/" && href.endsWith("/") && !u.search) {
      href = href.slice(0, -1);
    }
    return href;
  } catch {
    return withProto;
  }
}
