/**
 * Client-safe type re-exports. Use `import type` from this module in
 * Client Components so Turbopack never traces moneygap-crawler/Playwright.
 */
export type {
  DiagnosticFinding,
  DiagnosticSeverity,
  DiagnosticCategory,
  DiagnosticStage,
  LiveDiagnosticsResult,
  LiveDiagnosticsOptions,
  SandboxStoragePayload,
} from "moneygap-diagnostics";
