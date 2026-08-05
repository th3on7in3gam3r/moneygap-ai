/** Fault-tolerant crawl queue reclaim for orphaned `processing` pages. */

export const MAX_PAGE_ATTEMPTS = 3;
/** Processing rows older than this are reclaimed to retry/failed. */
export const STALE_PROCESSING_MS = 20_000;

export type ReclaimDecision =
  | { id: string; nextState: "retry" }
  | { id: string; nextState: "failed" };

/**
 * Decide reclaim targets from in-memory page rows (unit-testable).
 * `processing` older than staleMs → retry if attempts < max, else failed.
 */
export function planStaleReclaim(
  pages: Array<{ id: string; state: string; attempts: number; updatedAt: Date | string }>,
  opts?: { now?: number; staleMs?: number; maxAttempts?: number },
): ReclaimDecision[] {
  const now = opts?.now ?? Date.now();
  const staleMs = opts?.staleMs ?? STALE_PROCESSING_MS;
  const maxAttempts = opts?.maxAttempts ?? MAX_PAGE_ATTEMPTS;
  const out: ReclaimDecision[] = [];

  for (const p of pages) {
    if (p.state !== "processing") continue;
    const updated =
      p.updatedAt instanceof Date
        ? p.updatedAt.getTime()
        : new Date(p.updatedAt).getTime();
    if (!Number.isFinite(updated) || now - updated < staleMs) continue;
    out.push({
      id: p.id,
      nextState: p.attempts >= maxAttempts ? "failed" : "retry",
    });
  }
  return out;
}

export function shouldRetryAfterFail(
  attempts: number,
  requestedRetry: boolean,
  maxAttempts = MAX_PAGE_ATTEMPTS,
): boolean {
  return requestedRetry && attempts < maxAttempts;
}
