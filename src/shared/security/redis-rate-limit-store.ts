import { getSharedRedis } from "@/shared/redis";
import type { RateLimitStore } from "./rate-limit";

const RATE_LIMIT_SCRIPT = `
  local key = KEYS[1]
  local window = tonumber(ARGV[1])
  local count = redis.call('INCR', key)
  local ttl = redis.call('PTTL', key)
  if ttl == -1 then
    redis.call('PEXPIRE', key, window)
  end
  return {count, ttl}
`;

export class RedisRateLimitStore implements RateLimitStore {
  async hit(
    key: string,
    windowMs: number,
  ): Promise<{ count: number; resetAt: number }> {
    const redis = getSharedRedis();
    const now = Date.now();
    const result = (await redis.eval(RATE_LIMIT_SCRIPT, 1, key, String(windowMs))) as
      | [number, number]
      | null;
    const count = result?.[0] ?? 1;
    const ttl = result?.[1] ?? -1;
    const resetAt = now + (ttl > 0 ? ttl : windowMs);
    return { count, resetAt };
  }
}
