import { env } from "@/shared/config";
import { logger, redactValue } from "@/shared/observability";
import type { SmsSender } from "../domain/sms-sender";

export class TwilioSmsSender implements SmsSender {
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;

  constructor(deps: { accountSid: string; authToken: string; fromNumber: string }) {
    this.accountSid = deps.accountSid;
    this.authToken = deps.authToken;
    this.fromNumber = deps.fromNumber;
  }

  async send(input: { to: string; body: string }): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const params = new URLSearchParams({
      To: input.to,
      From: this.fromNumber,
      Body: input.body,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "unknown");
      logger.error("sms.twilio.failed", { status: response.status, to: redactValue(input.to) });
      throw new Error(`Twilio SMS failed: ${response.status} ${text}`);
    }

    logger.info("sms.twilio.sent", { to: redactValue(input.to) });
  }
}

export function makeTwilioSmsSender(): SmsSender | null {
  if (
    !env.TWILIO_ACCOUNT_SID ||
    !env.TWILIO_AUTH_TOKEN ||
    !env.TWILIO_FROM_NUMBER
  ) {
    return null;
  }
  return new TwilioSmsSender({
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    fromNumber: env.TWILIO_FROM_NUMBER,
  });
}
