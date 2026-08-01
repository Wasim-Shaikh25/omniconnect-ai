import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies the `x-shopify-hmac-sha256` header against the raw request body using
 * HMAC-SHA256 with the configured API secret. Returns false when the secret or
 * signature is missing or malformed so unsigned requests never produce side effects.
 */
export function verifyShopifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
