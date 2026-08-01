import { describe, it, expect } from "vitest";
import { decryptString, encryptString, isEncrypted } from "./encryption";

describe("encryptString / decryptString", () => {
  it("round-trips a plaintext value (S9)", async () => {
    const plaintext = "super-secret-token";
    const encrypted = await encryptString(plaintext);
    expect(encrypted).not.toEqual(plaintext);
    expect(isEncrypted(encrypted)).toBe(true);

    const decrypted = await decryptString(encrypted);
    expect(decrypted).toEqual(plaintext);
  });

  it("passes through legacy plaintext values (S9)", async () => {
    const legacy = "plain-old-token";
    const decrypted = await decryptString(legacy);
    expect(decrypted).toEqual(legacy);
    expect(isEncrypted(legacy)).toBe(false);
  });

  it("returns null for null input", async () => {
    expect(await encryptString(null)).toBeNull();
    expect(await decryptString(null)).toBeNull();
  });

  it("rejects tampered ciphertext (S9)", async () => {
    const encrypted = await encryptString("sensitive");
    expect(encrypted).not.toBeNull();

    const tampered = `${encrypted!.slice(0, -3)}xxx`;
    await expect(decryptString(tampered)).rejects.toThrow();
  });
});
