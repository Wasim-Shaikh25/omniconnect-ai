import { logger, redactValue } from "@/shared/observability";
import type { SmsSender } from "../domain/sms-sender";

export class ConsoleSmsSender implements SmsSender {
  async send(input: { to: string; body: string }): Promise<void> {
    // Never log the OTP body; only the redacted destination.
    logger.info("sms.console.sent", {
      to: redactValue(input.to),
      // body intentionally omitted
    });
  }
}
