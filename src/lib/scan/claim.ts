/** Pure helpers for queue claim / drain semantics (unit-tested). */

export function pickClaimableIds(
  pages: { id: string; state: string }[],
  limit: number,
): string[] {
  if (limit <= 0) return [];
  return pages
    .filter((p) => p.state === "queued" || p.state === "retry")
    .slice(0, limit)
    .map((p) => p.id);
}

export function remainingQueueCount(counts: Record<string, number>): number {
  return (
    (counts.queued ?? 0) + (counts.retry ?? 0) + (counts.processing ?? 0)
  );
}

export function isQueueDrained(counts: Record<string, number>): boolean {
  return remainingQueueCount(counts) === 0;
}
