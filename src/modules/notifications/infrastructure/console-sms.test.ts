import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "@/shared/observability";
import { ConsoleSmsSender } from "./console-sms";

describe("ConsoleSmsSender", () => {
  beforeEach(() => {
    vi.spyOn(logger, "info").mockImplementation(() => logger);
    vi.spyOn(logger, "warn").mockImplementation(() => logger);
    vi.spyOn(logger, "error").mockImplementation(() => logger);
  });

  it("does not log the OTP body", async () => {
    const sender = new ConsoleSmsSender();
    await sender.send({ to: "+447700900123", body: "Your code is 123456" });

    const calls = vi.mocked(logger.info).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const [message, meta] = calls[0] as [string, Record<string, unknown> | undefined];
    expect(message).toBe("sms.console.sent");
    expect(meta?.body).toBeUndefined();
    expect(JSON.stringify(calls)).not.toContain("123456");
  });
});
