import { env } from "@/shared/config";
import { getSharedRedis } from "@/shared/redis";
import { clientIp as extractClientIp, rateLimit } from "@/shared/security/rate-limit";

const MAX_REQUESTS_PER_MINUTE = 120;
const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEDUP_PREFIX = "meta:webhook:dedup:";

const processedPayloads = new Map<string, number>();

function assertCrypto(): Crypto {
  const globalCrypto = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!globalCrypto?.subtle) {
    throw new Error("Web Crypto API is not available.");
  }
  return globalCrypto;
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await assertCrypto().subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function cleanupMemoryDedup(now: number): void {
  for (const [key, timestamp] of processedPayloads) {
    if (timestamp < now - IDEMPOTENCY_WINDOW_MS) processedPayloads.delete(key);
  }
}

function ensureProductionRedis(): void {
  if (env.NODE_ENV === "production" && !env.REDIS_URL) {
    throw new Error("REDIS_URL is required for the webhook guard in production");
  }
}

/**
 * Lightweight webhook guard for Meta inbound events.
 *
 * Uses Redis for rate limiting and payload deduplication when `REDIS_URL` is
 * configured; falls back to in-memory maps for local development and tests.
 */
export const webhookGuard = {
  async isRateLimited(request: Request): Promise<boolean> {
    ensureProductionRedis();
    const ip = extractClientIp(request.headers);
    const result = await rateLimit({
      key: `meta:webhook:rate:${ip}`,
      limit: MAX_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    });
    return !result.allowed;
  },

  async isDuplicate(rawBody: string): Promise<boolean> {
    ensureProductionRedis();
    const hash = await sha256Hex(rawBody);

    if (env.REDIS_URL) {
      const redis = getSharedRedis();
      const key = `${DEDUP_PREFIX}${hash}`;
      const result = await redis.set(key, "1", "PX", IDEMPOTENCY_WINDOW_MS, "NX");
      return result === null;
    }

    const now = Date.now();
    cleanupMemoryDedup(now);
    if (processedPayloads.has(hash)) return true;
    processedPayloads.set(hash, now);
    return false;
  },
};
