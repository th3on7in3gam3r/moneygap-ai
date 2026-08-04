import path from "node:path";
import { fileURLToPath } from "node:url";

export const CLI_VERSION = "0.1.1";
export const SCAN_SCHEMA_VERSION = "1.0.0";

export function packageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

export const EXIT = {
  OK: 0,
  FINDINGS: 1,
  ERROR: 2,
} as const;
