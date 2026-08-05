import { scanWarn } from "./scan-log";

export const WATCHDOG_MS = 20_000;

export type WatchdogHandle = {
  /** Call whenever meaningful progress happens (page done, claim, etc.). */
  beat: () => void;
  stop: () => void;
};

/**
 * If no beat() for `timeoutMs`, invoke onStall once (then resets).
 * Used inside a tick to abort hanging extracts and reclaim.
 */
export function startWatchdog(input: {
  timeoutMs?: number;
  analysisId: string;
  onStall: () => void | Promise<void>;
  getDiagnostics: () => Record<string, unknown>;
}): WatchdogHandle {
  const timeoutMs = input.timeoutMs ?? WATCHDOG_MS;
  let lastBeat = Date.now();
  let stopped = false;
  let firing = false;

  const timer = setInterval(() => {
    if (stopped || firing) return;
    const idle = Date.now() - lastBeat;
    if (idle < timeoutMs) return;
    firing = true;
    lastBeat = Date.now();
    scanWarn("WATCHDOG", "No progress — dumping diagnostics and aborting hang", {
      analysisId: input.analysisId,
      idleMs: idle,
      ...input.getDiagnostics(),
    });
    Promise.resolve(input.onStall())
      .catch(() => undefined)
      .finally(() => {
        firing = false;
      });
  }, Math.min(5_000, Math.max(1_000, Math.floor(timeoutMs / 4))));

  return {
    beat: () => {
      lastBeat = Date.now();
    },
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
}

/** Race a promise against a timeout; reject with AbortError-like Error. */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = "operation",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${label} timed out after ${timeoutMs}ms`);
      err.name = "TimeoutError";
      reject(err);
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
