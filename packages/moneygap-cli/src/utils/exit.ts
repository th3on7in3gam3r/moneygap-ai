import path from "node:path";
import type { ScanResult, Severity } from "../types/index.js";
import { EXIT } from "./constants.js";

const DEFAULT_FAIL: Severity[] = ["critical", "high"];

export function exitCodeForScan(
  result: ScanResult,
  failOnSeverity?: Severity[],
): number {
  const thresholds = failOnSeverity?.length ? failOnSeverity : DEFAULT_FAIL;
  const set = new Set(thresholds);
  const hit = result.findings.some((f) => set.has(f.severity));
  return hit ? EXIT.FINDINGS : EXIT.OK;
}

export function resolveCwd(cwd?: string): string {
  return cwd ? path.resolve(cwd) : process.cwd();
}
