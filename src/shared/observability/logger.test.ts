import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, redactValue } from "./logger";

describe("redactValue", () => {
  it("masks sensitive keys (S10)", () => {
    const out = redactValue({ token: "abc", password: "secret", safe: "visible" });
    expect((out as Record<string, unknown>).token).toBe("[REDACTED]");
    expect((out as Record<string, unknown>).password).toBe("[REDACTED]");
    expect((out as Record<string, unknown>).safe).toBe("visible");
  });

  it("redacts emails and phone numbers from string values (S10)", () => {
    const out = redactValue({ note: "Contact support@example.com or +1-555-123-4567" });
    const note = (out as Record<string, unknown>).note as string;
    expect(note).not.toContain("support@example.com");
    expect(note).not.toContain("+1-555-123-4567");
    expect(note).toContain("[REDACTED_EMAIL]");
    expect(note).toContain("[REDACTED_PHONE]");
  });

  it("does not over-redact non-sensitive values", () => {
    expect(redactValue(123)).toBe(123);
    expect(redactValue(null)).toBe(null);
    expect(redactValue(["plain", "text"])).toEqual(["plain", "text"]);
  });
});

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts sensitive fields before logging (S10)", () => {
    logger.info("user.login", { email: "user@example.com", apiKey: "sk-123" });
    expect(console.log).toHaveBeenCalledOnce();
    const calls = (console.log as unknown as { mock: { calls: string[][] } }).mock.calls;
    const entry = JSON.parse(calls[0][0]);
    expect(entry.email).toBe("[REDACTED]");
    expect(entry.apiKey).toBe("[REDACTED]");
  });
});
