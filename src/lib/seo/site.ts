/**
 * Canonical site origin — never hardcode production host in callers.
 * Prefer NEXT_PUBLIC_APP_URL, then APP_URL, then production default.
 * Localhost / loopback values are ignored on Vercel Production so crawl
 * surfaces never emit development URLs.
 */
function isLocalOrigin(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  } catch {
    return true;
  }
}

export function getSiteOrigin(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL?.trim(),
    process.env.APP_URL?.trim(),
  ].filter(Boolean) as string[];

  const onVercelProduction = process.env.VERCEL_ENV === "production";

  for (const raw of candidates) {
    const origin = raw.replace(/\/$/, "");
    if (onVercelProduction && isLocalOrigin(origin)) continue;
    return origin;
  }

  if (onVercelProduction) {
    return "https://www.moneygap-ai.com";
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const host = vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }

  return "https://www.moneygap-ai.com";
}

/** Absolute URL for a path (leading slash optional). */
export function absoluteUrl(path = "/"): string {
  const origin = getSiteOrigin();
  if (!path || path === "/") return `${origin}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}
