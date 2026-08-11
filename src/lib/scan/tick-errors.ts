export type TickScheduleErrorClass =
  | "MISSING_APP_URL"
  | "MISSING_CRON_SECRET"
  | "TICK_CONNECTION_TIMEOUT"
  | "TICK_HTTP_ERROR"
  | "WORKER_UNAVAILABLE"
  | "ALREADY_CLAIMED"
  | "ENV_INCOMPLETE";

export type TickScheduleSeverity = "WARNING" | "RECOVERED" | "INFO";

/** Fresh tick lease window — align with stall kick cooldown. */
export const TICK_CLAIM_FRESH_MS = 60_000;

export function isTickClaimFresh(input: {
  claimedAt: number | null;
  lastProgressAt?: number | null;
  now?: number;
}): boolean {
  const now = input.now ?? Date.now();
  if (input.claimedAt == null) return false;
  if (now - input.claimedAt >= TICK_CLAIM_FRESH_MS) return false;
  if (
    input.lastProgressAt != null &&
    now - input.lastProgressAt >= TICK_CLAIM_FRESH_MS
  ) {
    return false;
  }
  return true;
}

export function classifyTickScheduleError(err: unknown): TickScheduleErrorClass {
  const msg = err instanceof Error ? err.message : String(err);
  if (/missing.?cron.?secret/i.test(msg)) return "MISSING_CRON_SECRET";
  if (/missing.?app.?url/i.test(msg)) return "MISSING_APP_URL";
  if (/already.?claimed|lost.?race/i.test(msg)) return "ALREADY_CLAIMED";
  if (/worker/i.test(msg) && /unavail|not.?running|stale/i.test(msg)) {
    return "WORKER_UNAVAILABLE";
  }
  if (
    /aborted due to timeout|timeout|TimeoutError|AbortError/i.test(msg) ||
    (typeof err === "object" &&
      err != null &&
      "name" in err &&
      (err as { name?: string }).name === "TimeoutError")
  ) {
    return "TICK_CONNECTION_TIMEOUT";
  }
  if (/HTTP \d+|Tick HTTP/i.test(msg)) return "TICK_HTTP_ERROR";
  if (/CRON_SECRET|APP_URL|NEXT_PUBLIC_APP_URL/i.test(msg)) {
    return "ENV_INCOMPLETE";
  }
  return "TICK_HTTP_ERROR";
}

/** Customer-facing orange alert only for true WARNING severity. */
export function shouldShowCustomerTickWarning(input: {
  tickScheduleError?: string | null;
  tickScheduleSeverity?: string | null;
}): boolean {
  if (!input.tickScheduleError) return false;
  const sev = (input.tickScheduleSeverity ?? "").toUpperCase();
  if (sev === "RECOVERED" || sev === "INFO") return false;
  return sev === "WARNING" || sev === "";
}

/** Admin env copy only when env is actually missing. */
export function shouldShowTickEnvAdminHint(
  errorClass: string | null | undefined,
): boolean {
  return (
    errorClass === "MISSING_APP_URL" ||
    errorClass === "MISSING_CRON_SECRET" ||
    errorClass === "ENV_INCOMPLETE"
  );
}
