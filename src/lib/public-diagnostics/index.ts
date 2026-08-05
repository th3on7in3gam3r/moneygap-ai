/**
 * Server / shared re-exports. Client Components should import types from
 * `./types` and `SANDBOX_STORAGE_KEY` from `./constants` instead of this barrel.
 */
export {
  runLiveDiagnostics,
  normalizePublicUrl,
  isPrivateHostname,
  scoreFindings,
  hasCriticalFailures,
} from "moneygap-diagnostics";

export { SANDBOX_STORAGE_KEY } from "./constants";
export type {
  DiagnosticFinding,
  DiagnosticSeverity,
  DiagnosticCategory,
  DiagnosticStage,
  LiveDiagnosticsResult,
  LiveDiagnosticsOptions,
  SandboxStoragePayload,
} from "./types";
