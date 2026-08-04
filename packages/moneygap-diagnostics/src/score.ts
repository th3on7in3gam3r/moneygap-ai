import type { DiagnosticFinding } from "./types.js";

export function scoreFindings(findings: DiagnosticFinding[]): number {
  let score = 100;
  for (const f of findings) {
    if (f.id === "perf.disclaimer") continue;
    switch (f.severity) {
      case "fail":
        score -= 18;
        break;
      case "warn":
        score -= 8;
        break;
      case "info":
        score -= 2;
        break;
      case "pass":
        break;
    }
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function hasCriticalFailures(findings: DiagnosticFinding[]): boolean {
  return findings.some((f) => f.severity === "fail");
}
