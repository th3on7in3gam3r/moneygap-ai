const PRIVATE_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function isPrivateIp(hostname: string): boolean {
  if (PRIVATE_HOSTS.has(hostname.toLowerCase())) return true;

  const ipv4 = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }

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
