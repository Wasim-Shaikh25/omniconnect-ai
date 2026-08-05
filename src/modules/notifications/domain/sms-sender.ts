/** Port for sending SMS messages. Implementations must not log OTP bodies. */
export interface SmsSender {
  send(input: { to: string; body: string }): Promise<void>;
}
