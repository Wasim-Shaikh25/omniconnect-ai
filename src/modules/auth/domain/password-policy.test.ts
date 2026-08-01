import { describe, it, expect } from "vitest";
import { isPasswordValid, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "./password-policy";

describe("password policy", () => {
  it(`accepts passwords between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`, () => {
    expect(isPasswordValid("short1!")).toBe(false);
    expect(isPasswordValid("validPassword123")).toBe(true);
    expect(isPasswordValid("a".repeat(201))).toBe(false);
  });

  it("rejects empty passwords", () => {
    expect(isPasswordValid("")).toBe(false);
  });
});
