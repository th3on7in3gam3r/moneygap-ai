/**
 * Thin re-exports for the Next.js app. Source of truth lives in
 * packages/moneygap-diagnostics.
 */
export {
  runLiveDiagnostics,
  normalizePublicUrl,
  isPrivateHostname,
  scoreFindings,
  hasCriticalFailures,
  SANDBOX_STORAGE_KEY,
  type DiagnosticFinding,
  type DiagnosticSeverity,
  type DiagnosticCategory,
  type DiagnosticStage,
  type LiveDiagnosticsResult,
  type LiveDiagnosticsOptions,
  type SandboxStoragePayload,
} from "moneygap-diagnostics";
