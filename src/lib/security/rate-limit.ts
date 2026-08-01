/**
 * Soft in-memory sliding-window rate limiter (single instance).
 * Does not replace API-key limits in platform/auth.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const windowStart = now - input.windowMs;
  let bucket = buckets.get(input.key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(input.key, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);
  if (bucket.timestamps.length >= input.limit) {
    const oldest = bucket.timestamps[0] ?? now;
    return { ok: false, retryAfterMs: Math.max(0, oldest + input.windowMs - now) };
  }
  bucket.timestamps.push(now);
  return { ok: true };
}

/** Test helper */
export function clearRateLimitBuckets() {
  buckets.clear();
}
