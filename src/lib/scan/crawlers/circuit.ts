/**
 * Simple in-memory Apify circuit breaker.
 * Cold starts may reset state — that is intentional and safe.
 */

const FAILURE_THRESHOLD = 3;
const OPEN_MS = 15 * 60_000;

type CircuitState = {
  consecutiveFailures: number;
  openedUntil: number;
};

const state: CircuitState = {
  consecutiveFailures: 0,
  openedUntil: 0,
};

export function isApifyCircuitOpen(now = Date.now()): boolean {
  return now < state.openedUntil;
}

export function recordApifySuccess(): void {
  state.consecutiveFailures = 0;
  state.openedUntil = 0;
}

export function recordApifyProviderFailure(): void {
  state.consecutiveFailures += 1;
  if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
    state.openedUntil = Date.now() + OPEN_MS;
  }
}

export function getApifyCircuitSnapshot() {
  return {
    consecutiveFailures: state.consecutiveFailures,
    openedUntil: state.openedUntil,
    open: isApifyCircuitOpen(),
  };
}

/** Test helper — do not use in production paths. */
export function resetApifyCircuitForTests(): void {
  state.consecutiveFailures = 0;
  state.openedUntil = 0;
}
