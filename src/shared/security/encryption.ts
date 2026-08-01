import { env } from "@/shared/config";

const LEGACY_PREFIX = "enc:";
const V2_PREFIX = "enc:v2:";
const SALT = "omniconnect-token-v1";
const HKDF_INFO = "omniconnect:token-encryption";

function assertCrypto(): Crypto {
  const globalCrypto = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!globalCrypto?.subtle) {
    throw new Error("Web Crypto API (crypto.subtle) is not available.");
  }
  return globalCrypto;
}

function getFallbackSecret(): string {
  return `${SALT}:__dev_insecure_fallback_key__`;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const material = await assertCrypto().subtle.importKey(
    "raw",
    encoder.encode(secret),
    "HKDF",
    false,
    ["deriveKey"],
  );
  return assertCrypto().subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode(SALT),
      info: encoder.encode(HKDF_INFO),
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function legacyKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const raw = encoder.encode(`${SALT}:${secret}`);
  const hash = await assertCrypto().subtle.digest("SHA-256", raw);
  return assertCrypto().subtle.importKey("raw", hash, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function currentKey(): Promise<CryptoKey> {
  if (!env.ENCRYPTION_KEY) {
    if (env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY is required in production.");
    }
    console.warn("[encryption] ENCRYPTION_KEY not set; using dev fallback key.");
  }
  return deriveKey(env.ENCRYPTION_KEY ?? getFallbackSecret());
}

async function previousKey(): Promise<CryptoKey | null> {
  if (!env.ENCRYPTION_KEY_PREVIOUS) return null;
  return deriveKey(env.ENCRYPTION_KEY_PREVIOUS);
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

async function decryptWithKey(
  key: CryptoKey,
  combined: Uint8Array,
): Promise<string> {
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  const decoder = new TextDecoder();
  const decrypted = await assertCrypto().subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted,
  );
  return decoder.decode(decrypted);
}

/**
 * Encrypt a plaintext string. Returns null for null/empty input.
 * Ciphertext format is `enc:v2:<base64(iv||ciphertext)>`.
 */
export async function encryptString(plaintext: string | null): Promise<string | null> {
  if (!plaintext) return plaintext;

  const key = await currentKey();
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

  return `${V2_PREFIX}${bytesToBase64(combined)}`;
}

/**
 * Decrypt a ciphertext string produced by encryptString.
 *
 * Supports three formats:
 * - `enc:v2:`  -> v2 HKDF-derived key; retries with ENCRYPTION_KEY_PREVIOUS on failure.
 * - `enc:`     -> legacy v1 SHA-256-derived key.
 * - no prefix  -> legacy plaintext value; returned unchanged.
 *                This passthrough branch is time-boxed until 2026-09-01.
 */
export async function decryptString(ciphertext: string | null): Promise<string | null> {
  if (!ciphertext) return ciphertext;

  if (ciphertext.startsWith(V2_PREFIX)) {
    const combined = base64ToBytes(ciphertext.slice(V2_PREFIX.length));
    try {
      return await decryptWithKey(await currentKey(), combined);
    } catch (error) {
      const prev = await previousKey();
      if (!prev) throw error;
      return decryptWithKey(prev, combined);
    }
  }

  if (ciphertext.startsWith(LEGACY_PREFIX)) {
    const key = await legacyKey(env.ENCRYPTION_KEY ?? getFallbackSecret());
    const combined = base64ToBytes(ciphertext.slice(LEGACY_PREFIX.length));
    return decryptWithKey(key, combined);
  }

  // Legacy plaintext token stored before encryption rollout.
  // TODO: remove plaintext passthrough after 2026-09-01 once all stored tokens are re-encrypted.
  return ciphertext;
}

/** Convenience guard for tests and conditional logic. */
export function isEncrypted(value: string | null): boolean {
  return !!value && (value.startsWith(V2_PREFIX) || value.startsWith(LEGACY_PREFIX));
}
