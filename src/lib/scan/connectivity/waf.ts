/** Cloudflare / WAF challenge detection from response headers + HTML snippet. */
export function detectCloudflareOrWaf(
  headers: Headers,
  body: string,
): { detected: boolean; warning: string | null } {
  const server = (headers.get("server") ?? "").toLowerCase();
  const cfRay = headers.get("cf-ray");
  const bodyLower = body.slice(0, 8_000).toLowerCase();
  const challenge =
    bodyLower.includes("just a moment") ||
    bodyLower.includes("cf-browser-verification") ||
    bodyLower.includes("cf-challenge") ||
    bodyLower.includes("attention required") ||
    bodyLower.includes("_cf_chl");

  if (cfRay || server.includes("cloudflare") || challenge) {
    return {
      detected: true,
      warning: challenge
        ? "Cloudflare/WAF challenge page detected — automated crawls may be limited."
        : "Cloudflare or similar WAF headers detected.",
    };
  }
  return { detected: false, warning: null };
}
