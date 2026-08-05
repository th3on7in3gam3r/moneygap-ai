import normalizeUrlLib from "normalize-url";

export function normalizeCrawlUrl(
  raw: string,
  opts?: { stripHash?: boolean },
): string {
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return normalizeUrlLib(withProto, {
    stripHash: opts?.stripHash ?? true,
    removeQueryParameters: false,
    stripWWW: false,
    forceHttps: false,
  });
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
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
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
