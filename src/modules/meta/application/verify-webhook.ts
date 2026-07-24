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
