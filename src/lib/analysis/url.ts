import { runConnectivityDiagnostics } from "@/lib/scan/connectivity";
import type { ConnectivityDiagnostics } from "@/lib/scan/connectivity";
import {
  validateAndNormalizeUrl,
  type ValidatedUrl,
} from "@/lib/analysis/url-normalize";

export { validateAndNormalizeUrl, type ValidatedUrl };

export type UrlReachabilityResult =
  | {
      ok: true;
      value: ValidatedUrl;
      statusCode: number;
      finalUrl: string;
      diagnostics: ConnectivityDiagnostics;
    }
  | {
      ok: false;
      error: string;
      code?: "invalid" | "dns" | "unreachable" | "http" | "tcp" | "tls" | "timeout" | "waf" | "auth";
      diagnostics: ConnectivityDiagnostics;
    };

/**
 * Validate + staged connectivity diagnostics (DNS → TCP → TLS → GET → robots/sitemap).
 * Wrapper around runConnectivityDiagnostics for existing analysis/onboarding call sites.
 */
export async function verifyUrlReachable(
  input: string,
): Promise<UrlReachabilityResult> {
  const diagnostics = await runConnectivityDiagnostics(input);

  if (!diagnostics.ok || !diagnostics.value) {
    const code = diagnostics.code ?? "unreachable";
    const mapped =
      code === "tcp" ||
      code === "tls" ||
      code === "timeout" ||
      code === "waf" ||
      code === "auth" ||
      code === "dns" ||
      code === "invalid" ||
      code === "http"
        ? code
        : "unreachable";
    return {
      ok: false,
      error: diagnostics.summary,
      code: mapped,
      diagnostics,
    };
  }

  const statusCode = Number.parseInt(diagnostics.homepage, 10);
  return {
    ok: true,
    value: diagnostics.value,
    statusCode: Number.isFinite(statusCode) ? statusCode : 200,
    finalUrl: diagnostics.finalUrl ?? diagnostics.value.href,
    diagnostics,
  };
}
