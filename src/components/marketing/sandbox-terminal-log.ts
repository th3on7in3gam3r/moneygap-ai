import type { DiagnosticFinding } from "@/lib/public-diagnostics/types";

/** Progressive stage lines shown while the real sandbox scan runs. */
export const SCAN_STAGE_LINES = [
  "› Fetching page…",
  "› Checking robots.txt & sitemap…",
  "› Validating JSON-LD schema…",
  "› Performance signals…",
  "› Summarizing findings…",
] as const;

export const STAGE_INTERVAL_MS = 260;

export function commandLine(url: string): string {
  return `$ moneygap-scan ${url}`;
}

export function severityMark(severity: DiagnosticFinding["severity"]): string {
  switch (severity) {
    case "pass":
      return "✓";
    case "warn":
      return "!";
    case "fail":
      return "✗";
    default:
      return "·";
  }
}

/** Compact result lines appended after the API returns. */
export function findingSummaryLines(
  findings: DiagnosticFinding[],
  limit = 6,
): string[] {
  return findings
    .filter((f) => f.id !== "perf.disclaimer")
    .slice(0, limit)
    .map((f) => `${severityMark(f.severity)} ${f.title}`);
}

/**
 * Schedules progressive stage lines. Calls `onLine` for each stage.
 * Lines stay as pending “› …” (never fake ✓) until the API returns.
 * Returns a cancel function.
 */
export function runProgressiveStages(
  onLine: (line: string) => void,
  intervalMs = STAGE_INTERVAL_MS,
): () => void {
  let i = 0;
  let stopped = false;
  const id = window.setInterval(() => {
    if (stopped) return;
    if (i >= SCAN_STAGE_LINES.length) {
      window.clearInterval(id);
      onLine("› Still working…");
      return;
    }
    onLine(SCAN_STAGE_LINES[i]!);
    i += 1;
  }, intervalMs);

  // First stage immediately
  onLine(SCAN_STAGE_LINES[0]!);
  i = 1;

  return () => {
    stopped = true;
    window.clearInterval(id);
  };
}

/** Collapse optimistic stage chatter into a clear failure line. */
export function failureLogLines(
  priorLines: string[],
  error: string,
): string[] {
  const cmd = priorLines.find((l) => l.startsWith("$ "));
  const base = cmd ? [cmd] : [];
  return [...base, `✗ ${error}`];
}
