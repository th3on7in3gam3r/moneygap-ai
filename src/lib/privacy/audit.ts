import { scorePrivacy } from "./score";
import type {
  PrivacyPageProbe,
  PrivacyResult,
  RunPrivacyAuditOptions,
  SetCookieDetail,
} from "./types";

const ANALYTICS_HOST_RE =
  /google-analytics|googletagmanager|gtag\/js|segment\.|mixpanel|amplitude|hotjar|fullstory|heap-api|posthog|plausible\.io|clarity\.ms|facebook\.net\/.*fbevents/i;

const CMP_PATTERNS = [
  /smart[-_]?consent/i,
  /cookie[-_]?consent/i,
  /consent[-_]?manager/i,
  /onetrust/i,
  /cookiebot/i,
  /didomi/i,
  /osano/i,
  /privacy[-_]?preferences/i,
  /mg_consent/i,
  /accept\s+all/i,
  /reject\s+(all|optional)/i,
  /we respect your privacy/i,
];

const CONSENT_STORAGE_RE =
  /mg_consent|cookie_consent|consent_prefs|otConsent|CookieConsent|didomiConfig/i;

function parseSetCookie(header: string): SetCookieDetail {
  const parts = header.split(";").map((p) => p.trim());
  const [nv, ...attrs] = parts;
  const name = (nv ?? "").split("=")[0]?.trim() || "unknown";
  const lower = attrs.map((a) => a.toLowerCase());
  const same = attrs.find((a) => a.toLowerCase().startsWith("samesite="));
  const path = attrs.find((a) => a.toLowerCase().startsWith("path="));
  const maxAge = attrs.find((a) => a.toLowerCase().startsWith("max-age="));
  return {
    raw: header.slice(0, 240),
    name,
    secure: lower.some((a) => a === "secure"),
    httpOnly: lower.some((a) => a === "httponly"),
    sameSite: same ? same.split("=")[1] ?? null : null,
    path: path ? path.split("=")[1] ?? null : null,
    maxAge: maxAge ? maxAge.split("=")[1] ?? null : null,
  };
}

function headersToObject(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((v, k) => {
    out[k.toLowerCase()] = v;
  });
  return out;
}

function extractScriptHosts(html: string, pageOrigin: string): {
  analytics: string[];
  thirdParty: string[];
} {
  const analytics = new Set<string>();
  const thirdParty = new Set<string>();
  const re = /<script[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const u = new URL(m[1], pageOrigin);
      if (ANALYTICS_HOST_RE.test(u.href) || ANALYTICS_HOST_RE.test(u.hostname)) {
        analytics.add(u.hostname);
      }
      if (u.origin !== new URL(pageOrigin).origin) {
        thirdParty.add(u.hostname);
      }
    } catch {
      /* ignore */
    }
  }
  if (ANALYTICS_HOST_RE.test(html)) {
    analytics.add("(inline-or-loader-match)");
  }
  return { analytics: [...analytics], thirdParty: [...thirdParty] };
}

function linkHints(html: string): {
  privacy: boolean;
  cookie: boolean;
  terms: boolean;
} {
  return {
    privacy: /href=["'][^"']*\/privacy/i.test(html) || />privacy\s*policy</i.test(html),
    cookie: /href=["'][^"']*cookie/i.test(html) || /cookie\s*policy/i.test(html),
    terms: /href=["'][^"']*\/terms/i.test(html),
  };
}

async function probePage(url: string): Promise<PrivacyPageProbe | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "MoneyGapPrivacyIntelligence/1.0",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(12000),
    });
    const html = await res.text();
    const finalUrl = res.url || url;
    const https = finalUrl.startsWith("https://");
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const links = linkHints(html);
    const scripts = extractScriptHosts(html, finalUrl);
    const cmpHeuristics = CMP_PATTERNS.filter((p) => p.test(html)).map((p) =>
      String(p).replace(/^\/|\/\w*$/g, ""),
    );
    const consentStorageHints = CONSENT_STORAGE_RE.test(html)
      ? ["html_contains_consent_storage_marker"]
      : [];

    const setCookieRaw =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : (() => {
            const single = res.headers.get("set-cookie");
            return single ? [single] : [];
          })();

    return {
      url: finalUrl,
      status: res.status,
      https,
      htmlLength: html.length,
      title: titleMatch?.[1]?.trim() ?? null,
      hasPrivacyLink: links.privacy,
      hasCookiePolicyLink: links.cookie,
      hasTermsLink: links.terms,
      cmpHeuristics,
      analyticsScriptHosts: scripts.analytics,
      thirdPartyScriptHosts: scripts.thirdParty,
      consentStorageHints,
      setCookies: setCookieRaw.map(parseSetCookie),
      responseHeaders: headersToObject(res.headers),
    };
  } catch {
    return null;
  }
}

/**
 * Privacy Intelligence™ audit — deterministic probes only.
 */
export async function runPrivacyAudit(
  originInput: string,
  _opts: RunPrivacyAuditOptions = {},
): Promise<PrivacyResult> {
  let origin = originInput.trim();
  try {
    const u = new URL(origin.includes("://") ? origin : `https://${origin}`);
    origin = u.origin;
  } catch {
    origin = origin.replace(/\/$/, "");
  }

  const [homepage, privacyPage, cookiePage] = await Promise.all([
    probePage(`${origin}/`),
    probePage(`${origin}/privacy`),
    probePage(`${origin}/cookies`).then(async (c) => {
      if (c && c.status && c.status < 400) return c;
      return probePage(`${origin}/cookie-policy`);
    }),
  ]);

  const headerSamples = [homepage, privacyPage]
    .filter((p): p is PrivacyPageProbe => Boolean(p))
    .map((p) => ({
      url: p.url,
      requestHeaders: {
        "user-agent": "MoneyGapPrivacyIntelligence/1.0",
        accept: "text/html",
      },
      responseHeaders: p.responseHeaders,
      setCookies: p.setCookies,
    }));

  // Self-scan of MoneyGap: treat Smart Consent markers as present when probing own domain
  // if privacy page mentions Smart Consent / categories (verified HTML only — already in CMP).

  return scorePrivacy({
    origin,
    homepage,
    privacyPage,
    cookiePage,
    headerSamples,
  });
}
