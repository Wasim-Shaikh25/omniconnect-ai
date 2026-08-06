import { describe, it, expect } from "vitest";
import { isPasswordValid, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "./password-policy";

describe("password policy", () => {
  it(`accepts passwords between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters with uppercase, number, and special`, () => {
    expect(isPasswordValid("short1!")).toBe(false);
    expect(isPasswordValid("validPassword123")).toBe(false);
    expect(isPasswordValid("ValidPassword123!")).toBe(true);
    expect(isPasswordValid("a".repeat(201))).toBe(false);
  });

  it("rejects passwords missing uppercase, number, or special character", () => {
    expect(isPasswordValid("lowercase1!")).toBe(false);
    expect(isPasswordValid("UPPERCASE1!")).toBe(false);
    expect(isPasswordValid("NoNumberHere!")).toBe(false);
    expect(isPasswordValid("NoSpecial123")).toBe(false);
  });

  it("rejects empty passwords", () => {
    expect(isPasswordValid("")).toBe(false);
  });
});
