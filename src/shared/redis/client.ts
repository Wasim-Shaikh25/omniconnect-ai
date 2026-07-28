import Redis from "ioredis";
import { env } from "@/shared/config";

let sharedRedis: Redis | null = null;

function createRedis(url: string): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });
}

export function getSharedRedis(): Redis {
  if (!sharedRedis) {
    if (!env.REDIS_URL) {
      throw new Error("REDIS_URL is not configured");
    }
    sharedRedis = createRedis(env.REDIS_URL);
  }
  return sharedRedis;
}

export function createStandaloneRedis(url: string): Redis {
  return createRedis(url);
}
