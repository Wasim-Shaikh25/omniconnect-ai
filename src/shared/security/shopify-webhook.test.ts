import { describe, it, expect } from "vitest";
import { signShopifyPayload } from "@/test/webhooks";
import { verifyShopifyWebhookSignature } from "./shopify-webhook";

describe("verifyShopifyWebhookSignature", () => {
  it("accepts a valid HMAC-SHA256 signature (S7)", () => {
    const body = '{"id":"shopify-evt-1"}';
    const secret = "shopify-secret";
    const signature = signShopifyPayload(body, secret);
    expect(verifyShopifyWebhookSignature(body, signature, secret)).toBe(true);
  });

  it("rejects an invalid signature (S7)", () => {
    const body = '{"id":"shopify-evt-1"}';
    const signature = signShopifyPayload(body, "wrong-secret");
    expect(verifyShopifyWebhookSignature(body, signature, "shopify-secret")).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyShopifyWebhookSignature('{"id":"x"}', null, "secret")).toBe(false);
  });
});
