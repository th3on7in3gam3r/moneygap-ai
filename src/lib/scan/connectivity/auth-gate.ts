/**
 * Detect redirects into login / SSO / auth handshakes.
 * MoneyGap analyzes public pages — auth gates are not a network failure.
 */

const AUTH_HOST_MARKERS: Array<{ test: RegExp; provider: string }> = [
  { test: /\.clerk\.accounts\.dev$/i, provider: "Clerk" },
  { test: /(^|\.)clerk\./i, provider: "Clerk" },
  { test: /accounts\.google\.com$/i, provider: "Google" },
  { test: /login\.microsoftonline\.com$/i, provider: "Microsoft" },
  { test: /(^|\.)auth0\.com$/i, provider: "Auth0" },
  { test: /(^|\.)okta\.com$/i, provider: "Okta" },
  { test: /(^|\.)cognito-idp\./i, provider: "Amazon Cognito" },
  { test: /signin\.aws\.amazon\.com$/i, provider: "AWS" },
  { test: /(^|\.)supabase\.co$/i, provider: "Supabase" },
  { test: /(^|\.)workos\.com$/i, provider: "WorkOS" },
];

const AUTH_PATH_MARKERS =
  /\/(sign-?in|sign-?up|login|log-?in|auth|oauth|sso|session|handshake)(\/|$|\?)/i;

const AUTH_QUERY_MARKERS =
  /[?&](__clerk_|clerk_|redirect_uri=|client_id=|oauth|saml)/i;

export type AuthGateDetection = {
  detected: boolean;
  provider: string | null;
  detail: string;
};

export function detectAuthRedirect(
  fromUrl: string,
  toUrl: string,
): AuthGateDetection {
  let to: URL;
  let from: URL | null = null;
  try {
    to = new URL(toUrl);
  } catch {
    return { detected: false, provider: null, detail: "" };
  }
  try {
    from = new URL(fromUrl);
  } catch {
    from = null;
  }

  const host = to.hostname.toLowerCase();
  for (const m of AUTH_HOST_MARKERS) {
    if (m.test.test(host)) {
      return {
        detected: true,
        provider: m.provider,
        detail: `${m.provider} auth (${host})`,
      };
    }
  }

  if (AUTH_PATH_MARKERS.test(to.pathname) || AUTH_QUERY_MARKERS.test(to.search)) {
    const crossOrigin = from && from.origin !== to.origin;
    // Same-origin /sign-in is still an auth gate for crawlers
    return {
      detected: true,
      provider: crossOrigin ? "SSO / identity provider" : "login page",
      detail: crossOrigin
        ? `cross-origin auth redirect (${host}${to.pathname})`
        : `login path (${to.pathname})`,
    };
  }

  return { detected: false, provider: null, detail: "" };
}

/**
 * Clerk development instances redirect browser-like clients to
 * /v1/client/handshake when the `__clerk_db_jwt` / dev-browser cookie is missing.
 * That is not a real login wall — public HTML is still served to bot UAs.
 */
export function isClerkDevBrowserHandshake(toUrl: string): boolean {
  try {
    const to = new URL(toUrl);
    const host = to.hostname.toLowerCase();
    const isClerkHost =
      /\.clerk\.accounts\.dev$/i.test(host) || /(^|\.)clerk\./i.test(host);
    if (!isClerkHost) return false;
    if (!/\/v1\/client\/handshake/i.test(to.pathname)) return false;
    return (
      /[?&]__clerk_hs_reason=dev-browser-missing/i.test(to.search) ||
      /[?&]redirect_url=/i.test(to.search)
    );
  } catch {
    return false;
  }
}

export function authGateMessage(provider: string | null, domain?: string): string {
  const where = domain ? ` (${domain})` : "";
  if (provider === "Clerk") {
    return `This site${where} redirects to Clerk login before serving a public page. MoneyGap can only analyze publicly reachable pages — sign-in walls aren’t crawlable. Use a public marketing URL, or allowlist bot access for anonymous visitors. If Clerk is in development mode on a production domain, switch to Clerk production keys so anonymous crawlers are not sent through the handshake.`;
  }
  if (provider) {
    return `This site${where} redirects to ${provider} authentication before serving a public page. MoneyGap analyzes public URLs only — try a public landing page, or open anonymous access for bots.`;
  }
  return `This site${where} requires login before the homepage is readable. MoneyGap analyzes public pages only — use a public URL without an auth wall.`;
}
