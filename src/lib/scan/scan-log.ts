import { log } from "@/lib/observability/logger";

export type ScanLogScope =
  | "SCAN"
  | "CRAWLER"
  | "FETCH"
  | "PARSER"
  | "QUEUE"
  | "PROGRESS"
  | "WATCHDOG";

export function scanLog(
  scope: ScanLogScope,
  message: string,
  fields: Record<string, unknown> = {},
) {
  log("info", `[${scope}] ${message}`, fields);
}

export function scanWarn(
  scope: ScanLogScope,
  message: string,
  fields: Record<string, unknown> = {},
) {
  log("warn", `[${scope}] ${message}`, fields);
}

export function scanError(
  scope: ScanLogScope,
  message: string,
  fields: Record<string, unknown> = {},
) {
  log("error", `[${scope}] ${message}`, fields);
}
