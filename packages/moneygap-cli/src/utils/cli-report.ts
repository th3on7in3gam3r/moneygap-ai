import type { DiagnosticFinding, LiveDiagnosticsResult } from "moneygap-diagnostics";

const DEFAULT_ORIGIN = "https://www.moneygap-ai.com";

export function apiOrigin(): string {
  return (
    process.env.MONEYGAP_API_ORIGIN?.replace(/\/$/, "") ||
    DEFAULT_ORIGIN
  );
}

export type CliReportResponse = {
  ok?: boolean;
  slug?: string;
  href?: string;
  emailed?: boolean;
  error?: string;
};

export async function requestCliVisualReport(input: {
  email: string;
  result: LiveDiagnosticsResult;
}): Promise<CliReportResponse> {
  const origin = apiOrigin();
  const res = await fetch(`${origin}/api/public/cli-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      url: input.result.url,
      score: input.result.score,
      findings: input.result.findings as DiagnosticFinding[],
      durationMs: input.result.durationMs,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as CliReportResponse;
  if (!res.ok) {
    return {
      ok: false,
      error: data.error ?? `Request failed (${res.status})`,
    };
  }
  return data;
}
