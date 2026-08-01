import { describe, it, expect, vi, beforeEach } from "vitest";
import { isEncrypted } from "./encryption";

const V1_SALT = "omniconnect-token-v1";

async function legacyV1Encrypt(plaintext: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const raw = encoder.encode(`${V1_SALT}:${secret}`);
  const hash = await crypto.subtle.digest("SHA-256", raw);
  const key = await crypto.subtle.importKey("raw", hash, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext),
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return `enc:${Buffer.from(combined).toString("base64")}`;
}

async function loadEncryption() {
  vi.resetModules();
  return import("./encryption");
}

describe("encryptString / decryptString", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a plaintext value with v2 HKDF (S9)", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "test-secret-32-characters-longer");
    const { encryptString, decryptString } = await loadEncryption();
    const plaintext = "super-secret-token";
    const encrypted = await encryptString(plaintext);
    expect(encrypted).toMatch(/^enc:v2:/);
    expect(isEncrypted(encrypted)).toBe(true);

    const decrypted = await decryptString(encrypted);
    expect(decrypted).toEqual(plaintext);
  });

  it("decrypts legacy v1 ciphertext (S9)", async () => {
    const secret = "test-secret-32-characters-longer";
    vi.stubEnv("ENCRYPTION_KEY", secret);
    const { decryptString } = await loadEncryption();
    const encrypted = await legacyV1Encrypt("legacy-token", secret);
    expect(isEncrypted(encrypted)).toBe(true);

    const decrypted = await decryptString(encrypted);
    expect(decrypted).toEqual("legacy-token");
  });

  it("decrypts a v2 ciphertext with ENCRYPTION_KEY_PREVIOUS after rotation (S9)", async () => {
    const oldKey = "old-encryption-key-32-characters!";
    const newKey = "new-encryption-key-32-characters!";
    vi.stubEnv("ENCRYPTION_KEY", oldKey);
    const { encryptString } = await loadEncryption();
    const encrypted = await encryptString("rotated-secret");

    vi.stubEnv("ENCRYPTION_KEY", newKey);
    vi.stubEnv("ENCRYPTION_KEY_PREVIOUS", oldKey);
    const { decryptString } = await loadEncryption();
    const decrypted = await decryptString(encrypted);
    expect(decrypted).toEqual("rotated-secret");
  });

  it("passes through legacy plaintext values until 2026-09-01 (S9)", async () => {
    const { decryptString } = await loadEncryption();
    const legacy = "plain-old-token";
    const decrypted = await decryptString(legacy);
    expect(decrypted).toEqual(legacy);
    expect(isEncrypted(legacy)).toBe(false);
  });

  it("returns null for null input", async () => {
    const { encryptString, decryptString } = await loadEncryption();
    expect(await encryptString(null)).toBeNull();
    expect(await decryptString(null)).toBeNull();
  });

  it("rejects tampered ciphertext (S9)", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "test-secret-32-characters-longer");
    const { encryptString, decryptString } = await loadEncryption();
    const encrypted = await encryptString("sensitive");
    expect(encrypted).not.toBeNull();

    const tampered = `${encrypted!.slice(0, -3)}xxx`;
    await expect(decryptString(tampered)).rejects.toThrow();
  });
});
