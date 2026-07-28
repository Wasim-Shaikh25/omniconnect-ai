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

function assertCrypto(): Crypto {
  const globalCrypto = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!globalCrypto?.subtle) {
    throw new Error("Web Crypto API is not available.");
  }
  return globalCrypto;
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length % 2 !== 0) return null;
  const buffer = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = Number.parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) return null;
    bytes[i / 2] = byte;
  }
  return bytes;
}

/**
 * Verifies the `X-Hub-Signature-256` header against the raw request body using
 * HMAC-SHA256 with the configured app secret. Returns false (reject) when the
 * app secret is unset or the signature is malformed — so invalid/unsigned
 * requests never produce side effects.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const secret = env.META_APP_SECRET;
  if (!secret || !signatureHeader) return false;

  const [algo, providedHex] = signatureHeader.split("=");
  if (algo !== "sha256" || !providedHex) return false;

  const providedBytes = hexToBytes(providedHex);
  if (!providedBytes) return false;

  const encoder = new TextEncoder();
  const key = await assertCrypto().subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  return assertCrypto().subtle.verify(
    { name: "HMAC", hash: "SHA-256" },
    key,
    providedBytes,
    encoder.encode(rawBody),
  );
}
