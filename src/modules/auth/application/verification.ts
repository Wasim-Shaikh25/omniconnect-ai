import { env } from "@/shared/config";
import { EmailSender } from "@/shared/email";
import { VerificationCodeRepository } from "./ports";

export type VerificationPurpose = "mfa" | "reset";

export interface VerificationCodeService {
  sendCode(email: string, purpose: VerificationPurpose): Promise<string>;
  verifyCode(email: string, code: string, purpose: VerificationPurpose): Promise<boolean>;
}

const TTL_MINUTES: Record<VerificationPurpose, number> = {
  mfa: 10,
  reset: 60,
};

function assertCrypto(): Crypto {
  const globalCrypto = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!globalCrypto?.getRandomValues) {
    throw new Error("Web Crypto API is not available.");
  }
  return globalCrypto;
}

function generateCode(): string {
  const values = new Uint32Array(1);
  assertCrypto().getRandomValues(values);
  return (100000 + (values[0] % 900000)).toString();
}

function buildIdentifier(email: string, purpose: VerificationPurpose): string {
  return `${purpose}:${email.toLowerCase().trim()}`;
}

function buildEmail(email: string, code: string, purpose: VerificationPurpose): { subject: string; text: string } {
  if (purpose === "mfa") {
    return {
      subject: "Your OmniConnect verification code",
      text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
    };
  }
  const resetUrl = `${env.APP_URL}/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`;
  return {
    subject: "Reset your OmniConnect password",
    text: `You requested a password reset. Your code is: ${code}\n\nOr use this link: ${resetUrl}\n\nThis code expires in 1 hour.`,
  };
}

export function makeVerificationCodeService(deps: {
  repository: VerificationCodeRepository;
  emailSender: EmailSender;
}): VerificationCodeService {
  return {
    async sendCode(email, purpose) {
      const code = generateCode();
      const identifier = buildIdentifier(email, purpose);
      const expiresAt = new Date(Date.now() + TTL_MINUTES[purpose] * 60 * 1000);
      await deps.repository.save(identifier, code, expiresAt);
      const { subject, text } = buildEmail(email, code, purpose);
      await deps.emailSender.send(email, subject, text);
      return code;
    },
    async verifyCode(email, code, purpose) {
      const identifier = buildIdentifier(email, purpose);
      return deps.repository.consume(identifier, code);
    },
  };
}
