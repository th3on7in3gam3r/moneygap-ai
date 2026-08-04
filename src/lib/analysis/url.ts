const PRIVATE_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function isPrivateIp(hostname: string): boolean {
  if (PRIVATE_HOSTS.has(hostname.toLowerCase())) return true;

  // IPv4 private / link-local ranges
  const ipv4 = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }

  // Basic IPv6 local checks
  const h = hostname.toLowerCase();
  if (h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) return true;

  return false;
}

export type ValidatedUrl = {
  href: string;
  origin: string;
  hostname: string;
  domain: string;
  pathname: string;
};

export function validateAndNormalizeUrl(input: string): {
  ok: true;
  value: ValidatedUrl;
} | {
  ok: false;
  error: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a website URL to analyze." };
  }

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: "Enter a valid URL, for example https://example.com." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http and https URLs are supported." };
  }

  // Prefer https for public sites
  if (parsed.protocol === "http:") {
    parsed.protocol = "https:";
  }

  const hostname = parsed.hostname.replace(/\.$/, "").toLowerCase();
  if (!hostname || !hostname.includes(".")) {
    return { ok: false, error: "Enter a public domain, for example https://example.com." };
  }

  if (isPrivateIp(hostname)) {
    return {
      ok: false,
      error: "Private or local addresses cannot be analyzed. Use a public website URL.",
    };
  }

  // Strip hash/trailing slash noise for storage, keep path if meaningful
  parsed.hash = "";
  const href =
    parsed.pathname === "/"
      ? parsed.origin
      : `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "");

  const domain = hostname.replace(/^www\./, "");

  return {
    ok: true,
    value: {
      href,
      origin: parsed.origin,
      hostname,
      domain,
      pathname: parsed.pathname || "/",
    },
  };
}

export type UrlReachabilityResult =
  | {
      ok: true;
      value: ValidatedUrl;
      statusCode: number;
      finalUrl: string;
    }
  | {
      ok: false;
      error: string;
      code?: "invalid" | "dns" | "unreachable" | "http";
    };

const PREFLIGHT_TIMEOUT_MS = 12_000;
const PREFLIGHT_UA = "MoneyGapAI-Preflight/1.0 (+https://moneygap-ai.com)";

/**
 * Validate format, resolve DNS, then HTTP-probe the URL before starting a full scan.
 * Rejects dead domains / connection failures / hard HTTP errors so users are not
 * stuck on "Reading pages" for unreachable sites.
 */
export async function verifyUrlReachable(
  input: string,
): Promise<UrlReachabilityResult> {
  const validated = validateAndNormalizeUrl(input);
  if (!validated.ok) {
    return { ok: false, error: validated.error, code: "invalid" };
  }

  const { value } = validated;

  try {
    const { lookup } = await import("dns/promises");
    await lookup(value.hostname);
  } catch {
    return {
      ok: false,
      code: "dns",
      error: `We couldn’t find DNS records for ${value.domain}. Check the domain spelling and try again.`,
    };
  }

  try {
    const res = await fetch(value.href, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(PREFLIGHT_TIMEOUT_MS),
      cache: "no-store",
      headers: {
        "User-Agent": PREFLIGHT_UA,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });

    // Consume a small amount so the connection completes cleanly.
    await res.arrayBuffer().catch(() => null);

    const status = res.status;
    // Site exists but may block anonymous bots — still treat as reachable.
    if (status === 401 || status === 403) {
      return {
        ok: true,
        value,
        statusCode: status,
        finalUrl: res.url || value.href,
      };
    }

    if (status >= 200 && status < 400) {
      return {
        ok: true,
        value,
        statusCode: status,
        finalUrl: res.url || value.href,
      };
    }

    if (status === 404 || status === 410) {
      return {
        ok: false,
        code: "http",
        error: `That URL returned ${status}. Confirm the site is public and the path is correct.`,
      };
    }

    if (status >= 500) {
      return {
        ok: false,
        code: "http",
        error: `That site returned an error (${status}). Try again when the website is healthy.`,
      };
    }

    return {
      ok: false,
      code: "http",
      error: `That URL isn’t publicly readable (HTTP ${status}). Use a live public website.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const timedOut =
      message.includes("TimeoutError") ||
      message.includes("timed out") ||
      message.includes("aborted") ||
      (err instanceof Error && err.name === "TimeoutError");

    return {
      ok: false,
      code: "unreachable",
      error: timedOut
        ? "That website took too long to respond. Confirm it’s online and try again."
        : "We couldn’t reach that website. Confirm the URL is public and online, then try again.",
    };
  }
}
