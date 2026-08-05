import normalizeUrlLib from "normalize-url";

/** Tracking / noise query params collapsed for crawl dedup. */
const STRIP_QUERY_PARAMS: Array<string | RegExp> = [
  /^utm_/i,
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  /^mc_/i,
  "_ga",
  "_gl",
  "yclid",
  "msclkid",
  "dclid",
  "twclid",
  "li_fat_id",
  "igshid",
  "vero_id",
];

/**
 * Canonical crawl URL for dedup.
 * Collapses: trailing slash, hash, utm/fbclid/gclid, http→https.
 * example.com / example.com/ / ?utm= / #section → one URL.
 */
export function normalizeCrawlUrl(
  raw: string,
  opts?: { stripHash?: boolean; stripWww?: boolean },
): string {
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return normalizeUrlLib(withProto, {
      stripHash: opts?.stripHash ?? true,
      stripWWW: opts?.stripWww ?? false,
      forceHttps: true,
      removeTrailingSlash: true,
      removeQueryParameters: STRIP_QUERY_PARAMS,
      sortQueryParameters: true,
    });
  } catch {
    try {
      const u = new URL(withProto);
      u.hash = "";
      u.protocol = "https:";
      return u.href.replace(/\/$/, "") || u.origin;
    } catch {
      return withProto;
    }
  }
}

export function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

export function resolveUrl(base: string, href: string): string | null {
  try {
    if (
      !href ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:")
    ) {
      return null;
    }
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return normalizeCrawlUrl(u.href);
  } catch {
    return null;
  }
}

export function originOf(url: string): string {
  return new URL(url).origin;
}
