/**
 * Crawl execution mode: long-lived Render worker (preferred) vs serverless ticks.
 *
 * Enable worker mode only when moneygap-crawl-worker is deployed and sharing DB:
 *   CRAWL_WORKER_ENABLED=1
 *   or SCAN_EXECUTION=worker
 *
 * Default remains ticks so Vercel-only / web-only deploys keep working.
 */

export type ScanExecutionMode = "worker" | "ticks";

export function getScanExecutionMode(): ScanExecutionMode {
  const explicit = process.env.SCAN_EXECUTION?.trim().toLowerCase();
  if (explicit === "worker" || explicit === "ticks") return explicit;

  if (process.env.CRAWL_WORKER_ENABLED === "1") return "worker";
  return "ticks";
}

export function isWorkerScanExecution(): boolean {
  return getScanExecutionMode() === "worker";
}
