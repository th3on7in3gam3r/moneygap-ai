/**
 * Canonical site origin — never hardcode production host in callers.
 * Prefer NEXT_PUBLIC_APP_URL, then APP_URL, then production default.
 */
export function getSiteOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://www.moneygap-ai.com";
}

/** Absolute URL for a path (leading slash optional). */
export function absoluteUrl(path = "/"): string {
  const origin = getSiteOrigin();
  if (!path || path === "/") return `${origin}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}
