/**
 * Tiny in-memory rate limiter — primitive but sufficient for a sandbox.
 *
 * Each key is associated with a sliding list of request timestamps. When the
 * window slides forward, old timestamps are pruned. If the number of requests
 * within the window exceeds `max`, the request is rejected.
 *
 * NOTE: This is per-process. In a multi-instance deployment, swap this for a
 * Redis-backed limiter. For Vismay's single-process sandbox it's fine.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

/** Periodically prune empty buckets so the map doesn't grow unbounded. */
const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    // Keep only timestamps from the last hour.
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < 60 * 60 * 1000);
    if (bucket.timestamps.length === 0) {
      buckets.delete(key);
    }
  }
}

/**
 * Returns true if the request is allowed (and records it), false if the
 * caller is rate-limited.
 *
 * @param key      A stable identifier (e.g. `${ip}:topic-outline`).
 * @param max      Maximum number of requests allowed in the window.
 * @param windowMs Window size in milliseconds.
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key) ?? { timestamps: [] };
  // Drop timestamps that fell out of the window.
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= max) {
    buckets.set(key, bucket);
    return false;
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return true;
}
