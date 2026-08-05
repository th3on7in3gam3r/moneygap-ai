import { connect as netConnect } from "node:net";
import { connect as tlsConnect } from "node:tls";
import { authGateMessage, detectAuthRedirect } from "./auth-gate";
import { loggedFetch } from "./fetch-log";
import { classifyNetworkError } from "./classify-error";
import { detectCloudflareOrWaf } from "./waf";
import type {
  ConnectivityFetchRecord,
  ConnectivityStageRecord,
} from "./types";

export { detectCloudflareOrWaf };

const TCP_TIMEOUT_MS = 5_000;
const TLS_TIMEOUT_MS = 5_000;
const GET_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 5;

export type DnsStageResult =
  | { ok: true; detail: string; address: string; family: number; elapsedMs: number }
  | { ok: false; detail: string; code: string; elapsedMs: number };

export async function stageDns(hostname: string): Promise<DnsStageResult> {
  const started = Date.now();
  try {
    const { lookup } = await import("dns/promises");
    const result = await lookup(hostname);
    return {
      ok: true,
      detail: `success (${result.address})`,
      address: result.address,
      family: result.family,
      elapsedMs: Date.now() - started,
    };
  } catch (err) {
    const classified = classifyNetworkError(err);
    const code =
      classified.code ||
      (err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "ENOTFOUND");
    return {
      ok: false,
      detail: `fail: ${code}`,
      code,
      elapsedMs: Date.now() - started,
    };
  }
}

export type TcpStageResult =
  | { ok: true; detail: string; elapsedMs: number }
  | { ok: false; detail: string; code: string; elapsedMs: number };

export function stageTcp(host: string, port: number): Promise<TcpStageResult> {
  const started = Date.now();
  return new Promise((resolve) => {
    const socket = netConnect({ host, port });
    let settled = false;

    const finish = (result: TcpStageResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({
        ok: false,
        detail: "fail: ETIMEDOUT",
        code: "ETIMEDOUT",
        elapsedMs: Date.now() - started,
      });
    }, TCP_TIMEOUT_MS);

    socket.once("connect", () => {
      clearTimeout(timer);
      finish({
        ok: true,
        detail: "success",
        elapsedMs: Date.now() - started,
      });
    });

    socket.once("error", (err) => {
      clearTimeout(timer);
      const classified = classifyNetworkError(err);
      finish({
        ok: false,
        detail: `fail: ${classified.code}`,
        code: classified.code,
        elapsedMs: Date.now() - started,
      });
    });
  });
}

export type TlsStageResult =
  | { ok: true; detail: string; elapsedMs: number; authorized: boolean }
  | { ok: false; detail: string; code: string; elapsedMs: number };

export function stageTls(host: string, port: number): Promise<TlsStageResult> {
  const started = Date.now();
  return new Promise((resolve) => {
    let settled = false;
    const socket = tlsConnect(
      {
        host,
        port,
        servername: host,
        rejectUnauthorized: true,
      },
      () => {
        // connected
      },
    );

    const finish = (result: TlsStageResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({
        ok: false,
        detail: "fail: ETIMEDOUT",
        code: "ETIMEDOUT",
        elapsedMs: Date.now() - started,
      });
    }, TLS_TIMEOUT_MS);

    socket.once("secureConnect", () => {
      clearTimeout(timer);
      const authorized = socket.authorized;
      if (!authorized && socket.authorizationError) {
        const code = String(socket.authorizationError);
        finish({
          ok: false,
          detail: `fail: ${code}`,
          code,
          elapsedMs: Date.now() - started,
        });
        return;
      }
      finish({
        ok: true,
        detail: "success",
        authorized: true,
        elapsedMs: Date.now() - started,
      });
    });

    socket.once("error", (err) => {
      clearTimeout(timer);
      const classified = classifyNetworkError(err);
      finish({
        ok: false,
        detail: `fail: ${classified.code}`,
        code: classified.code,
        elapsedMs: Date.now() - started,
      });
    });
  });
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

export type HomepageStageResult = {
  ok: boolean;
  homepage: string;
  finalUrl: string | null;
  redirect: string | null;
  statusCode: number | null;
  bodyText: string;
  cloudflareOrWaf: boolean;
  wafWarning: string | null;
  hardError: string | null;
  errorCode?: "timeout" | "tls" | "tcp" | "unreachable" | "http" | "auth";
  elapsedMs: number;
  stages: ConnectivityStageRecord[];
};

function authGateFail(
  started: number,
  current: string,
  redirectHops: string[],
  provider: string | null,
  statusCode: number | null,
): HomepageStageResult {
  const hardError = authGateMessage(provider);
  return {
    ok: false,
    homepage: "fail: auth redirect",
    finalUrl: current,
    redirect: redirectHops.length ? redirectHops.join(" → ") : null,
    statusCode,
    bodyText: "",
    cloudflareOrWaf: false,
    wafWarning: null,
    hardError,
    errorCode: "auth",
    elapsedMs: Date.now() - started,
    stages: [
      {
        id: "homepage",
        status: "fail",
        detail: provider ? `auth: ${provider}` : "auth redirect",
        elapsedMs: Date.now() - started,
      },
      {
        id: "redirect",
        status: "fail",
        detail: redirectHops[redirectHops.length - 1] ?? "auth redirect",
        elapsedMs: 0,
      },
    ],
  };
}

export async function stageHomepageGet(
  startUrl: string,
  fetchLog: ConnectivityFetchRecord[],
): Promise<HomepageStageResult> {
  const started = Date.now();
  const stages: ConnectivityStageRecord[] = [];
  let current = startUrl;
  const redirectHops: string[] = [];
  let redirectCount = 0;

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const result = await loggedFetch(current, {
      method: "GET",
      redirect: "manual",
      timeoutMs: GET_TIMEOUT_MS,
      fetchLog,
    });

    if (!result.ok) {
      const kind = result.classified.kind;
      const errorCode =
        kind === "timeout"
          ? "timeout"
          : kind === "tls"
            ? "tls"
            : kind === "refused" || kind === "tcp" || kind === "reset"
              ? "tcp"
              : "unreachable";
      const homepage = `fail: ${result.classified.code}`;
      stages.push({
        id: "homepage",
        status: "fail",
        detail: homepage,
        elapsedMs: Date.now() - started,
      });
      return {
        ok: false,
        homepage,
        finalUrl: null,
        redirect: redirectHops.length ? redirectHops.join(" → ") : null,
        statusCode: null,
        bodyText: "",
        cloudflareOrWaf: false,
        wafWarning: null,
        hardError: `${result.classified.code}: ${result.classified.message}`,
        errorCode,
        elapsedMs: Date.now() - started,
        stages,
      };
    }

    // Patch redirectCount on last fetch record
    const last = fetchLog[fetchLog.length - 1];
    if (last) last.redirectCount = redirectCount;

    const { response, bodyText } = result;
    const status = response.status;

    if (isRedirect(status)) {
      const location = response.headers.get("location");
      if (!location) {
        stages.push({
          id: "homepage",
          status: "fail",
          detail: `fail: redirect ${status} without Location`,
          elapsedMs: Date.now() - started,
        });
        return {
          ok: false,
          homepage: `fail: ${status} redirect missing Location`,
          finalUrl: current,
          redirect: redirectHops.length ? redirectHops.join(" → ") : `${status} (no Location)`,
          statusCode: status,
          bodyText,
          cloudflareOrWaf: false,
          wafWarning: null,
          hardError: `HTTP ${status} redirect without Location header`,
          errorCode: "http",
          elapsedMs: Date.now() - started,
          stages,
        };
      }
      let nextUrl: string;
      try {
        nextUrl = new URL(location, current).href;
      } catch {
        return {
          ok: false,
          homepage: `fail: invalid redirect Location`,
          finalUrl: current,
          redirect: `${status} -> ${location}`,
          statusCode: status,
          bodyText,
          cloudflareOrWaf: false,
          wafWarning: null,
          hardError: `Invalid redirect Location: ${location}`,
          errorCode: "http",
          elapsedMs: Date.now() - started,
          stages,
        };
      }
      redirectHops.push(`${status} -> ${nextUrl}`);
      redirectCount += 1;

      const auth = detectAuthRedirect(current, nextUrl);
      if (auth.detected) {
        return authGateFail(
          started,
          current,
          redirectHops,
          auth.provider,
          status,
        );
      }

      current = nextUrl;
      continue;
    }

    const waf = detectCloudflareOrWaf(response.headers, bodyText);
    const redirectStr = redirectHops.length ? redirectHops.join(" → ") : null;

    // Soft success: 401/403 — reachable but gated
    if (status === 401 || status === 403) {
      stages.push({
        id: "homepage",
        status: "warn",
        detail: String(status),
        elapsedMs: Date.now() - started,
      });
      return {
        ok: true,
        homepage: String(status),
        finalUrl: current,
        redirect: redirectStr,
        statusCode: status,
        bodyText,
        cloudflareOrWaf: waf.detected || status === 403,
        wafWarning:
          waf.warning ??
          `Homepage returned HTTP ${status} (reachable but may block bots).`,
        hardError: null,
        elapsedMs: Date.now() - started,
        stages,
      };
    }

    if (status >= 200 && status < 400) {
      stages.push({
        id: "homepage",
        status: "success",
        detail: String(status),
        elapsedMs: Date.now() - started,
      });
      return {
        ok: true,
        homepage: String(status),
        finalUrl: current,
        redirect: redirectStr,
        statusCode: status,
        bodyText,
        cloudflareOrWaf: waf.detected,
        wafWarning: waf.warning,
        hardError: null,
        elapsedMs: Date.now() - started,
        stages,
      };
    }

    if (status === 404 || status === 410) {
      return {
        ok: false,
        homepage: String(status),
        finalUrl: current,
        redirect: redirectStr,
        statusCode: status,
        bodyText,
        cloudflareOrWaf: waf.detected,
        wafWarning: waf.warning,
        hardError: `That URL returned ${status}. Confirm the site is public and the path is correct.`,
        errorCode: "http",
        elapsedMs: Date.now() - started,
        stages: [
          {
            id: "homepage",
            status: "fail",
            detail: String(status),
            elapsedMs: Date.now() - started,
          },
        ],
      };
    }

    if (status >= 500) {
      return {
        ok: false,
        homepage: String(status),
        finalUrl: current,
        redirect: redirectStr,
        statusCode: status,
        bodyText,
        cloudflareOrWaf: waf.detected,
        wafWarning: waf.warning,
        hardError: `That site returned an error (${status}). Try again when the website is healthy.`,
        errorCode: "http",
        elapsedMs: Date.now() - started,
        stages: [
          {
            id: "homepage",
            status: "fail",
            detail: String(status),
            elapsedMs: Date.now() - started,
          },
        ],
      };
    }

    return {
      ok: false,
      homepage: String(status),
      finalUrl: current,
      redirect: redirectStr,
      statusCode: status,
      bodyText,
      cloudflareOrWaf: waf.detected,
      wafWarning: waf.warning,
      hardError: `That URL isn’t publicly readable (HTTP ${status}). Use a live public website.`,
      errorCode: "http",
      elapsedMs: Date.now() - started,
      stages: [
        {
          id: "homepage",
          status: "fail",
          detail: String(status),
          elapsedMs: Date.now() - started,
        },
      ],
    };
  }

  const redirectChain = redirectHops.join(" → ");
  const authHop = redirectHops
    .map((hop) => {
      const m = hop.match(/->\s*(\S+)/);
      return m?.[1] ? detectAuthRedirect(startUrl, m[1]) : null;
    })
    .find((a) => a?.detected);

  if (authHop?.detected) {
    return authGateFail(
      started,
      current,
      redirectHops,
      authHop.provider,
      null,
    );
  }

  return {
    ok: false,
    homepage: "fail: too many redirects",
    finalUrl: current,
    redirect: redirectChain,
    statusCode: null,
    bodyText: "",
    cloudflareOrWaf: false,
    wafWarning: null,
    hardError: `This site redirected more than ${MAX_REDIRECTS} times (possible redirect loop). Confirm the URL opens a public page in a private/incognito window without signing in.`,
    errorCode: "http",
    elapsedMs: Date.now() - started,
    stages: [
      {
        id: "homepage",
        status: "fail",
        detail: "too many redirects",
        elapsedMs: Date.now() - started,
      },
    ],
  };
}

export async function stageRobots(
  origin: string,
  fetchLog: ConnectivityFetchRecord[],
): Promise<{ status: string; body: string; sitemapHints: string[] }> {
  const url = `${origin.replace(/\/$/, "")}/robots.txt`;
  const result = await loggedFetch(url, {
    method: "GET",
    redirect: "manual",
    timeoutMs: 8_000,
    maxBodyChars: 64_000,
    fetchLog,
  });
  if (!result.ok) {
    return {
      status: `fail: ${result.classified.code}`,
      body: "",
      sitemapHints: [],
    };
  }
  // follow one redirect for robots if needed
  let response = result.response;
  let bodyText = result.bodyText;
  if (isRedirect(response.status)) {
    const loc = response.headers.get("location");
    if (loc) {
      const next = new URL(loc, url).href;
      const redirected = await loggedFetch(next, {
        method: "GET",
        redirect: "manual",
        timeoutMs: 8_000,
        maxBodyChars: 64_000,
        fetchLog,
      });
      if (!redirected.ok) {
        return {
          status: `fail: ${redirected.classified.code}`,
          body: "",
          sitemapHints: [],
        };
      }
      response = redirected.response;
      bodyText = redirected.bodyText;
    }
  }

  const status = String(response.status);
  const sitemapHints: string[] = [];
  for (const line of bodyText.split("\n")) {
    const m = line.match(/^\s*Sitemap:\s*(\S+)/i);
    if (m?.[1]) sitemapHints.push(m[1].trim());
  }
  return { status, body: bodyText, sitemapHints };
}

function countUrlsInSitemapXml(xml: string): number {
  const locs = xml.match(/<loc\b[^>]*>/gi);
  return locs?.length ?? 0;
}

export async function stageSitemap(
  origin: string,
  hints: string[],
  fetchLog: ConnectivityFetchRecord[],
): Promise<{ status: string; urlCount: number }> {
  const candidates = [
    ...hints,
    `${origin.replace(/\/$/, "")}/sitemap.xml`,
    `${origin.replace(/\/$/, "")}/sitemap_index.xml`,
  ];
  const seen = new Set<string>();
  let lastStatus = "404";
  let urlCount = 0;

  for (const raw of candidates) {
    let href: string;
    try {
      href = new URL(raw, origin).href;
    } catch {
      continue;
    }
    if (seen.has(href)) continue;
    seen.add(href);

    const result = await loggedFetch(href, {
      method: "GET",
      redirect: "manual",
      timeoutMs: 10_000,
      maxBodyChars: 512_000,
      fetchLog,
    });
    if (!result.ok) {
      lastStatus = `fail: ${result.classified.code}`;
      continue;
    }

    let response = result.response;
    let bodyText = result.bodyText;
    if (isRedirect(response.status)) {
      const loc = response.headers.get("location");
      if (loc) {
        const next = new URL(loc, href).href;
        const redirected = await loggedFetch(next, {
          method: "GET",
          redirect: "manual",
          timeoutMs: 10_000,
          maxBodyChars: 512_000,
          fetchLog,
        });
        if (!redirected.ok) {
          lastStatus = `fail: ${redirected.classified.code}`;
          continue;
        }
        response = redirected.response;
        bodyText = redirected.bodyText;
      }
    }

    lastStatus = String(response.status);
    if (response.status >= 200 && response.status < 300) {
      urlCount = Math.max(urlCount, countUrlsInSitemapXml(bodyText));
      return { status: lastStatus, urlCount };
    }
  }

  return { status: lastStatus, urlCount };
}

export function countHomepageLinks(html: string, origin: string): number {
  const hrefs = html.matchAll(/href\s*=\s*["']([^"']+)["']/gi);
  let n = 0;
  for (const m of hrefs) {
    const raw = m[1];
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
      continue;
    }
    try {
      const u = new URL(raw, origin);
      if (u.origin === new URL(origin).origin) n += 1;
    } catch {
      // skip
    }
  }
  return n;
}

export async function detectFrameworkSafe(html: string): Promise<string | null> {
  try {
    const { detectFramework } = await import("moneygap-crawler");
    const det = detectFramework(html);
    if (!det?.framework || det.framework === "unknown") return null;
    return det.framework;
  } catch {
    return null;
  }
}
