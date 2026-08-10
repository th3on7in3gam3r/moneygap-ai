import type { ApifyRun } from "./apify";
import { isApifyInProgress, isApifySuccess, isApifyTerminalFailure } from "./apify";
import type { CrawlProgressStage } from "./types";

export type WatchdogDecision =
  | { action: "continue"; reason: string }
  | { action: "process_success"; reason: string }
  | { action: "fallback"; reason: string }
  | { action: "fail"; reason: string };

export const APIFY_STALE_PROGRESS_MS = 90_000;

/**
 * Decide next step for an async Apify-backed scan.
 * Never leave READING_PAGES forever.
 */
export function decideApifyWatchdog(input: {
  run: ApifyRun | null;
  crawlStartedAtMs: number;
  lastProgressAtMs: number | null;
  profileTimeoutMs: number;
  now?: number;
}): WatchdogDecision {
  const now = input.now ?? Date.now();
  const elapsed = now - input.crawlStartedAtMs;

  if (elapsed > input.profileTimeoutMs) {
    if (input.run && isApifySuccess(input.run.status)) {
      return { action: "process_success", reason: "budget_exceeded_but_succeeded" };
    }
    if (input.run && isApifyInProgress(input.run.status)) {
      return { action: "fallback", reason: "global_scan_budget_exceeded" };
    }
    return { action: "fallback", reason: "global_scan_budget_exceeded" };
  }

  if (!input.run) {
    return { action: "fallback", reason: "run_missing_or_invalid" };
  }

  if (isApifySuccess(input.run.status)) {
    return { action: "process_success", reason: "succeeded" };
  }

  if (isApifyTerminalFailure(input.run.status)) {
    return {
      action: "fallback",
      reason: `provider_${input.run.status.toLowerCase()}`,
    };
  }

  if (isApifyInProgress(input.run.status)) {
    const last = input.lastProgressAtMs ?? input.crawlStartedAtMs;
    const stale = now - last;
    // Still RUNNING — keep monitoring even if UI heartbeat is stale.
    if (stale > APIFY_STALE_PROGRESS_MS) {
      return { action: "continue", reason: "still_running_stale_heartbeat" };
    }
    return { action: "continue", reason: "running" };
  }

  return { action: "fallback", reason: `unknown_status_${input.run.status}` };
}

export function crawlStageFromWatchdog(
  decision: WatchdogDecision,
): CrawlProgressStage {
  if (decision.action === "process_success") return "retrieving";
  if (decision.action === "fallback") return "fallback";
  if (decision.action === "fail") return "failed";
  return "running";
}
