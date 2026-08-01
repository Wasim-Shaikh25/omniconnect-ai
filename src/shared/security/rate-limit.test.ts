import { describe, it, expect } from "vitest";
import { rateLimit, type RateLimitStore } from "./rate-limit";

function createFakeStore(): RateLimitStore {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    async hit(key: string, windowMs: number) {
      const now = Date.now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt < now) {
        const fresh = { count: 1, resetAt: now + windowMs };
        buckets.set(key, fresh);
        return fresh;
      }
      bucket.count += 1;
      return bucket;
    },
  };
}

describe("rateLimit", () => {
  it("allows requests up to the limit (S8)", async () => {
    const store = createFakeStore();
    for (let i = 0; i < 5; i++) {
      const result = await rateLimit({ key: "login:u:ip", limit: 5, windowMs: 60000, store });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it("blocks requests beyond the limit (S8)", async () => {
    const store = createFakeStore();
    for (let i = 0; i < 5; i++) {
      await rateLimit({ key: "login:u:ip", limit: 5, windowMs: 60000, store });
    }
    const blocked = await rateLimit({ key: "login:u:ip", limit: 5, windowMs: 60000, store });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks different keys independently", async () => {
    const store = createFakeStore();
    await rateLimit({ key: "login:a:ip", limit: 1, windowMs: 60000, store });
    const other = await rateLimit({ key: "login:b:ip", limit: 1, windowMs: 60000, store });
    expect(other.allowed).toBe(true);
    expect(other.remaining).toBe(0);
  });
});
