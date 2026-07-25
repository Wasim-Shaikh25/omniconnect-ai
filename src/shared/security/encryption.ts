import { env } from "@/shared/config";

const ENCRYPTED_PREFIX = "enc:";
const SALT = "omniconnect-token-v1";

function assertCrypto(): Crypto {
  const globalCrypto = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!globalCrypto?.subtle) {
    throw new Error("Web Crypto API (crypto.subtle) is not available.");
  }
  return globalCrypto;
}

async function encryptionKey(): Promise<CryptoKey> {
  if (!env.ENCRYPTION_KEY) {
    if (env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY is required in production.");
    }
    console.warn("[encryption] ENCRYPTION_KEY not set; using dev fallback key.");
  }

  const encoder = new TextEncoder();
  const secret = env.ENCRYPTION_KEY ?? `${SALT}:__dev_insecure_fallback_key__`;
  const raw = encoder.encode(`${SALT}:${secret}`);
  const hash = await assertCrypto().subtle.digest("SHA-256", raw);

  return assertCrypto().subtle.importKey("raw", hash, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(str: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(str, "base64"));
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypt a plaintext string. Returns null for null/empty input.
 * Backwards-compatible with existing plaintext values: decryptString will return
 * any value that does not start with the encrypted prefix unchanged.
 */
export async function encryptString(plaintext: string | null): Promise<string | null> {
  if (!plaintext) return plaintext;

  const key = await encryptionKey();
  const iv = assertCrypto().getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertext = await assertCrypto().subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext),
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return `${ENCRYPTED_PREFIX}${bytesToBase64(combined)}`;
}

/**
 * Decrypt a ciphertext string produced by encryptString.
 * If the value is not prefixed with the encrypted marker, it is assumed to be
 * a legacy plaintext value and is returned unchanged.
 */
export async function decryptString(ciphertext: string | null): Promise<string | null> {
  if (!ciphertext) return ciphertext;
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    // Legacy plaintext token stored before encryption rollout.
    return ciphertext;
  }

  const combined = base64ToBytes(ciphertext.slice(ENCRYPTED_PREFIX.length));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const key = await encryptionKey();
  const decoder = new TextDecoder();
  const decrypted = await assertCrypto().subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted,
  );

  return decoder.decode(decrypted);
}

/** Convenience guard for tests and conditional logic. */
export function isEncrypted(value: string | null): boolean {
  return !!value && value.startsWith(ENCRYPTED_PREFIX);
}
