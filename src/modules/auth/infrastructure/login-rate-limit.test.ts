import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RateLimitStore } from "@/shared/security/rate-limit";
import { assertLoginRateLimit, RateLimitError, type LoginRateLimits } from "./login-rate-limit";

class TestStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  async hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      return fresh;
    }
    bucket.count += 1;
    return bucket;
  }
}

const limits: LoginRateLimits = {
  perIpLimit: 2,
  perIpWindowMs: 1_000,
  perAccountLimit: 5,
  perAccountWindowMs: 1_000,
};

describe("assertLoginRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("engages the per-IP limit after configured attempts", async () => {
    const store = new TestStore();
    const email = "user@example.com";
    await assertLoginRateLimit(email, "1.2.3.4", store, limits);
    await assertLoginRateLimit(email, "1.2.3.4", store, limits);
    await expect(
      assertLoginRateLimit(email, "1.2.3.4", store, limits),
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it("engages the global per-account limit across rotating IPs", async () => {
    const store = new TestStore();
    const email = "user@example.com";
    for (let i = 0; i < 5; i++) {
      await assertLoginRateLimit(email, `ip-${i}`, store, limits);
    }
    await expect(
      assertLoginRateLimit(email, "new-ip", store, limits),
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it("refuses attempts during lockout and allows them after the window elapses", async () => {
    const store = new TestStore();
    const email = "user@example.com";
    await assertLoginRateLimit(email, "1.2.3.4", store, limits);
    await assertLoginRateLimit(email, "1.2.3.4", store, limits);
    await expect(
      assertLoginRateLimit(email, "1.2.3.4", store, limits),
    ).rejects.toBeInstanceOf(RateLimitError);

    vi.advanceTimersByTime(1_500);
    await expect(
      assertLoginRateLimit(email, "1.2.3.4", store, limits),
    ).resolves.toBeUndefined();
  });
});
