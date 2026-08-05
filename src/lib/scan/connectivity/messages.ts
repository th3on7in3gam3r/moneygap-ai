import type { ConnectivityDiagnostics, ConnectivityErrorCode } from "./types";

export function summaryForFailure(
  code: ConnectivityErrorCode | undefined,
  detail: string,
  domain?: string,
): string {
  switch (code) {
    case "invalid":
      return detail || "Enter a valid public website URL.";
    case "dns":
      return domain
        ? `We couldn’t find DNS records for ${domain} (${detail}). Check the domain spelling and try again.`
        : `DNS lookup failed (${detail}). Check the domain spelling and try again.`;
    case "tcp":
      return `Could not open a TCP connection (${detail}). The host may be down or blocking connections.`;
    case "tls":
      return `TLS/certificate check failed (${detail}). The site’s HTTPS certificate may be expired, misconfigured, or self-signed.`;
    case "timeout":
      return `That website took too long to respond (${detail}). Confirm it’s online and try again.`;
    case "http":
      return detail;
    case "waf":
      return `The site is reachable but a bot/WAF challenge may limit automated access (${detail}). You can still try a Quick Scan.`;
    case "unreachable":
    default:
      return detail
        ? `Could not reach that website (${detail}).`
        : "Could not reach that website. Confirm the URL is public and online.";
  }
}

export function finalizeSummary(d: ConnectivityDiagnostics): string {
  if (d.ok) {
    if (d.warnings.length) {
      return `Website reachable. ${d.warnings[0]}`;
    }
    return "Website reachable — connectivity checks passed.";
  }
  if (d.errors.length) {
    return summaryForFailure(d.code, d.errors[0]!, d.value?.domain);
  }
  return summaryForFailure(d.code, "connectivity check failed", d.value?.domain);
}
