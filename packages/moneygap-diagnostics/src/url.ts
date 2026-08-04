const PRIVATE_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export function isPrivateHostname(hostname: string): boolean {
  const h = hostname.replace(/\.$/, "").toLowerCase();
  if (PRIVATE_HOSTS.has(h)) return true;

  const ipv4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 10 || a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }

  if (h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) return true;
  return false;
}

export function normalizePublicUrl(input: string): {
  ok: true;
  href: string;
  origin: string;
  hostname: string;
} | {
  ok: false;
  error: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a website URL to scan." };
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

  if (isPrivateHostname(hostname)) {
    return {
      ok: false,
      error: "Private or local addresses cannot be scanned. Use a public website URL.",
    };
  }

  parsed.hash = "";
  const href =
    parsed.pathname === "/"
      ? parsed.origin
      : `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "");

  return { ok: true, href, origin: parsed.origin, hostname };
}
