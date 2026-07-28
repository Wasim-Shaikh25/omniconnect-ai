import { env } from "@/shared/config";
import { RedisRateLimitStore } from "./redis-rate-limit-store";

/**
 * Reusable fixed-window rate limiter.
 *
 * Uses Redis when `REDIS_URL` is configured so rate limits are shared across
 * instances. Falls back to an in-memory store for local development and tests.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

class InMemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  async hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      this.cleanup(now);
      return fresh;
    }
    bucket.count += 1;
    return bucket;
  }

  private cleanup(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt < now) this.buckets.delete(key);
    }
  }
}

let defaultStore: RateLimitStore | null = null;

function getDefaultStore(): RateLimitStore {
  if (!defaultStore) {
    defaultStore = env.REDIS_URL ? new RedisRateLimitStore() : new InMemoryRateLimitStore();
  }
  return defaultStore;
}

export interface RateLimitOptions {
  /** Unique bucket key, e.g. `checkout:${userId}`. */
  key: string;
  /** Max requests allowed within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  store?: RateLimitStore;
}

export async function rateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const store = options.store ?? getDefaultStore();
  const { count, resetAt } = await store.hit(options.key, options.windowMs);
  return {
    allowed: count <= options.limit,
    remaining: Math.max(0, options.limit - count),
    resetAt,
  };
}

/** Best-effort client IP extraction from proxy headers. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}
