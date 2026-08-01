import { lookup } from "dns/promises";
import type { DiscoverySignals } from "@/db/schema";
import { validateAndNormalizeUrl } from "@/lib/analysis/url";

function detectCms(html: string, headers: Headers): string | null {
  const gen = headers.get("x-generator") ?? "";
  const server = headers.get("server") ?? "";
  const blob = `${html.slice(0, 80_000)}\n${gen}\n${server}`.toLowerCase();
  if (/wp-content|wordpress/.test(blob)) return "WordPress";
  if (/cdn\.shopify|shopify/.test(blob)) return "Shopify";
  if (/webflow/.test(blob)) return "Webflow";
  if (/squarespace/.test(blob)) return "Squarespace";
  if (/wix\.com|wixstatic/.test(blob)) return "Wix";
  if (/drupal/.test(blob)) return "Drupal";
  return null;
}

function detectFramework(html: string, headers: Headers): string | null {
  const blob = `${html.slice(0, 80_000)}\n${headers.get("x-powered-by") ?? ""}`.toLowerCase();
  if (/__next|_next\//.test(blob) || headers.get("x-nextjs-cache")) return "Next.js";
  if (/__nuxt|nuxt/.test(blob)) return "Nuxt";
  if (/data-reactroot|react/.test(blob) && /_app/.test(blob)) return "React";
  if (/ng-version|angular/.test(blob)) return "Angular";
  if (/vite|svelte/.test(blob) && /svelte/.test(blob)) return "Svelte";
  if (/gatsby/.test(blob)) return "Gatsby";
  return null;
}

function detectHosting(headers: Headers, html: string): string | null {
  const server = (headers.get("server") ?? "").toLowerCase();
  const via = (headers.get("via") ?? "").toLowerCase();
  const cf = headers.get("cf-ray");
  const vercel = headers.get("x-vercel-id") || headers.get("x-vercel-cache");
  const netlify = headers.get("x-nf-request-id");
  const blob = `${server} ${via} ${html.slice(0, 20_000)}`.toLowerCase();
  if (vercel) return "Vercel";
  if (netlify || /netlify/.test(blob)) return "Netlify";
  if (cf || /cloudflare/.test(blob)) return "Cloudflare";
  if (/amazon|aws|cloudfront/.test(blob)) return "AWS";
  if (/google|ghs|gws/.test(blob)) return "Google";
  if (/nginx/.test(server)) return "Nginx (self/host unknown)";
  if (/apache/.test(server)) return "Apache (self/host unknown)";
  return server || null;
}

/**
 * Lightweight discovery — not a MoneyGap Engine scan.
 */
export async function discoverWebsiteSignals(
  rawUrl: string,
): Promise<DiscoverySignals> {
  const validated = validateAndNormalizeUrl(rawUrl);
  if (!validated.ok) {
    return { error: validated.error, completedAt: new Date().toISOString() };
  }

  const href = validated.value.href;
  const hostname = validated.value.domain;
  const signals: DiscoverySignals = { completedAt: new Date().toISOString() };

  try {
    const dns = await lookup(hostname, { all: true });
    signals.dns = {
      ok: dns.length > 0,
      records: dns.map((d) => d.address).slice(0, 6),
      detail: dns.length ? `${dns.length} address(es)` : "No A/AAAA records",
    };
  } catch (e) {
    signals.dns = {
      ok: false,
      detail: e instanceof Error ? e.message : "DNS lookup failed",
    };
  }

  const isHttps = href.startsWith("https://");
  signals.ssl = {
    ok: isHttps,
    detail: isHttps ? "HTTPS URL" : "Not HTTPS — upgrade recommended",
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(href, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "MoneyGapAI-Onboarding/1.0 (+https://moneygap.ai)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const descMatch =
      html.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
      );

    signals.meta = {
      title: titleMatch?.[1]?.trim() || null,
      description: descMatch?.[1]?.trim() || null,
      statusCode: res.status,
    };

    if (res.url.startsWith("https://")) {
      signals.ssl = { ok: true, detail: "TLS reachable" };
    }

    signals.cms = {
      name: detectCms(html, res.headers),
      detail: detectCms(html, res.headers) ? "Detected from markup/headers" : "Not detected",
    };
    signals.framework = {
      name: detectFramework(html, res.headers),
      detail: detectFramework(html, res.headers)
        ? "Detected from markup/headers"
        : "Not detected",
    };
    signals.hosting = {
      provider: detectHosting(res.headers, html),
      detail: "Heuristic from response headers",
    };
  } catch (e) {
    signals.error = e instanceof Error ? e.message : "Fetch failed";
    signals.meta = { title: null, description: null, statusCode: null };
  }

  return signals;
}
