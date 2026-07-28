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

interface ClientIpSource {
  get(name: string): string | null;
}

function safeIp(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/** Best-effort client IP extraction from proxy headers.
 *
 * In production, set RATE_LIMIT_IP_HEADER to the trusted header supplied by your
 * CDN/proxy (e.g. `Fly-Client-IP`, `CF-Connecting-IP`). If that header is absent,
 * we fall back to the rightmost `x-forwarded-for` hop, which is harder to spoof
 * than the leftmost value when the request has passed through trusted proxies.
 */
export function clientIp(source: ClientIpSource): string {
  const trustedHeader = env.RATE_LIMIT_IP_HEADER;
  if (trustedHeader) {
    const trusted = safeIp(source.get(trustedHeader));
    if (trusted) return trusted;
  }

  const forwarded = source.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    const rightmost = hops[hops.length - 1];
    if (rightmost) return rightmost;
  }

  return safeIp(source.get("x-real-ip")) ?? "unknown";
}
