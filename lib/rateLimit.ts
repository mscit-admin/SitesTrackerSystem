// Minimal in-memory rate limiter for login attempts (single-node deployment).
// Keyed by identifier+IP. Not shared across processes — fine for one pm2 fork.

interface Entry {
  count: number;
  first: number;
  lockUntil?: number;
}

const WINDOW_MS = 15 * 60_000; // sliding window over which failures accumulate

const store = new Map<string, Entry>();

export function isLocked(key: string): { locked: boolean; retryAfterSec?: number } {
  const e = store.get(key);
  const now = Date.now();
  if (e?.lockUntil && e.lockUntil > now) {
    return { locked: true, retryAfterSec: Math.ceil((e.lockUntil - now) / 1000) };
  }
  return { locked: false };
}

export function recordFailure(key: string, maxFailures = 8, lockMinutes = 15): void {
  const now = Date.now();
  const lockMs = lockMinutes * 60_000;
  let e = store.get(key);
  if (!e || now - e.first > WINDOW_MS) e = { count: 0, first: now };
  e.count += 1;
  if (e.count >= maxFailures) e.lockUntil = now + lockMs;
  store.set(key, e);
  // opportunistic prune
  if (store.size > 5000) {
    for (const [k, v] of store) if ((v.lockUntil ?? v.first) + lockMs < now) store.delete(k);
  }
}

export function recordSuccess(key: string): void {
  store.delete(key);
}
