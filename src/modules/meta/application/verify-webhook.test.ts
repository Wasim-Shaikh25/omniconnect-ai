import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signMetaPayload } from "@/test/webhooks";
import { env } from "@/shared/config";
import { verifyWebhookChallenge, verifyWebhookSignature } from "./verify-webhook";

describe("verifyWebhookChallenge", () => {
  it("returns the challenge when mode and token match", () => {
    (env as { META_WEBHOOK_VERIFY_TOKEN?: string }).META_WEBHOOK_VERIFY_TOKEN = "expected-token";
    const result = verifyWebhookChallenge({ mode: "subscribe", token: "expected-token", challenge: "challenge-123" });
    expect(result).toBe("challenge-123");
  });

  it("returns null when the verify token is missing", () => {
    (env as { META_WEBHOOK_VERIFY_TOKEN?: string }).META_WEBHOOK_VERIFY_TOKEN = "";
    const result = verifyWebhookChallenge({ mode: "subscribe", token: "any", challenge: "challenge" });
    expect(result).toBeNull();
  });

  it("returns null when the token does not match", () => {
    (env as { META_WEBHOOK_VERIFY_TOKEN?: string }).META_WEBHOOK_VERIFY_TOKEN = "expected-token";
    const result = verifyWebhookChallenge({ mode: "subscribe", token: "wrong-token", challenge: "challenge" });
    expect(result).toBeNull();
  });
});

describe("verifyWebhookSignature", () => {
  beforeEach(() => {
    (env as { META_APP_SECRET?: string }).META_APP_SECRET = "meta-secret";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts a valid HMAC-SHA256 signature (S7)", async () => {
    const body = '{"id":"evt-1"}';
    const signature = signMetaPayload(body, "meta-secret");
    const result = await verifyWebhookSignature(body, signature);
    expect(result).toBe(true);
  });

  it("rejects an invalid signature (S7)", async () => {
    const body = '{"id":"evt-1"}';
    const signature = signMetaPayload(body, "wrong-secret");
    const result = await verifyWebhookSignature(body, signature);
    expect(result).toBe(false);
  });

  it("rejects a missing signature or secret (S7)", async () => {
    (env as { META_APP_SECRET?: string }).META_APP_SECRET = "";
    const result = await verifyWebhookSignature('{"id":"evt-1"}', "sha256=abcd");
    expect(result).toBe(false);
  });
});
