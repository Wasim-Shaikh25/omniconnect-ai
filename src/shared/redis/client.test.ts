import { describe, it, expect } from "vitest";
import { createStandaloneRedis } from "./client";

const redisUrl = process.env.REDIS_URL;
const withRedis = redisUrl ? describe : describe.skip;

withRedis("redis client", () => {
  it("connects to Redis and responds to ping", async () => {
    const redis = createStandaloneRedis(redisUrl!);
    try {
      await expect(redis.ping()).resolves.toBe("PONG");
    } finally {
      await redis.quit();
    }
  });
});
