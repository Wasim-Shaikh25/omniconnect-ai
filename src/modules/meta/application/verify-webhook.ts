import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/shared/config";

/**
 * Meta webhook verification handshake. Returns the challenge to echo back only
 * when the mode + verify token match the configured token; otherwise null.
 */
export function verifyWebhookChallenge(params: {
  mode: string | null;
  token: string | null;
  challenge: string | null;
}): string | null {
  const expected = env.META_WEBHOOK_VERIFY_TOKEN;
  if (!expected) return null;
  if (params.mode === "subscribe" && params.token === expected) {
    return params.challenge;
  }
  return null;
}

/**
 * Verifies the `X-Hub-Signature-256` header against the raw request body using
 * HMAC-SHA256 with the configured app secret. Constant-time comparison. Returns
 * false (reject) when the app secret is unset or the signature is malformed —
 * so invalid/unsigned requests never produce side effects.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = env.META_APP_SECRET;
  if (!secret || !signatureHeader) return false;

  const [algo, provided] = signatureHeader.split("=");
  if (algo !== "sha256" || !provided) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  const providedBuf = Buffer.from(provided, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (providedBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(providedBuf, expectedBuf);
}
