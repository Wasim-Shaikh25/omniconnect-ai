import { createHash } from "node:crypto";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const MAX_REQUESTS_PER_MINUTE = 120;
const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;

const rateLimits = new Map<string, RateLimitBucket>();
const processedPayloads = new Map<string, number>();

function nowMs(): number {
  return Date.now();
}

function cleanup(): void {
  const now = nowMs();
  for (const [key, bucket] of rateLimits) {
    if (bucket.resetAt < now) rateLimits.delete(key);
  }
  for (const [key, timestamp] of processedPayloads) {
    if (timestamp < now - IDEMPOTENCY_WINDOW_MS) processedPayloads.delete(key);
  }
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Lightweight in-memory webhook guard.
 * In a multi-instance deployment this should be backed by Redis; the interface
 * is async so a Redis-backed implementation can be swapped in later.
 */
export const webhookGuard = {
  async isRateLimited(request: Request): Promise<boolean> {
    cleanup();
    const ip = clientIp(request);
    const now = nowMs();
    const bucket = rateLimits.get(ip);
    if (!bucket || bucket.resetAt < now) {
      rateLimits.set(ip, { count: 1, resetAt: now + 60_000 });
      return false;
    }
    bucket.count += 1;
    return bucket.count > MAX_REQUESTS_PER_MINUTE;
  },

  async isDuplicate(rawBody: string): Promise<boolean> {
    cleanup();
    const hash = createHash("sha256").update(rawBody).digest("hex");
    if (processedPayloads.has(hash)) return true;
    processedPayloads.set(hash, nowMs());
    return false;
  },
};
