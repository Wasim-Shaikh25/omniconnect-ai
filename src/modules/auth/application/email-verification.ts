import { env } from "@/shared/config";
import { EmailSender } from "@/shared/email";
import { logger, redactValue } from "@/shared/observability";
import {
  generateVerificationToken,
  hashVerificationToken,
} from "../domain/verification-token";
import {
  AccountRecord,
  AccountRepository,
  VerificationRequestRecord,
  VerificationRequestRepository,
} from "./ports";

const TTL_MS: Record<"signup" | "email_change" | "phone_verify", number> = {
  signup: 24 * 60 * 60 * 1000,
  email_change: 24 * 60 * 60 * 1000,
  phone_verify: 10 * 60 * 1000,
};

export interface EmailVerificationService {
  issue(userId: string, email: string, purpose: "signup" | "email_change"): Promise<string>;
  inspect(token: string): Promise<{ userId: string; target: string; purpose: VerificationRequestRecord["purpose"] } | null>;
  consume(token: string): Promise<{ userId: string; target: string; purpose: VerificationRequestRecord["purpose"] } | null>;
  verifySignupEmail(token: string): Promise<AccountRecord | null>;
  resend(email: string): Promise<void>;
  sendRegistrationAttempt(email: string): Promise<void>;
}

interface EmailVerificationDeps {
  accounts: AccountRepository;
  repository: VerificationRequestRepository;
  emailSender: EmailSender;
}

function buildVerificationUrl(token: string): string {
  const base = env.APP_URL ?? "http://localhost:3000";
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}

export function makeEmailVerificationService(deps: EmailVerificationDeps): EmailVerificationService {
  return {
    async issue(userId, email, purpose) {
      const token = generateVerificationToken();
      const tokenHash = await hashVerificationToken(token);
      const expiresAt = new Date(Date.now() + TTL_MS[purpose]);
      await deps.repository.save({
        userId,
        channel: "email",
        purpose,
        target: email.toLowerCase().trim(),
        tokenHash,
        attempts: 0,
        expiresAt,
        consumedAt: null,
      });

      const subject = purpose === "signup" ? "Verify your OmniConnect account" : "Confirm your new OmniConnect email";
      const text =
        purpose === "signup"
          ? `Welcome to OmniConnect. Click the link below to verify your email address:\n\n${buildVerificationUrl(token)}\n\nThis link expires in 24 hours.`
          : `Click the link below to confirm your new email address:\n\n${buildVerificationUrl(token)}\n\nThis link expires in 24 hours.`;
      await deps.emailSender.send(email, subject, text);
      return token;
    },

    async inspect(token) {
      const tokenHash = await hashVerificationToken(token);
      const request = await deps.repository.findByTokenHash(tokenHash);
      if (!request) return null;
      if (request.consumedAt || request.expiresAt.getTime() < Date.now()) return null;
      return { userId: request.userId ?? "", target: request.target, purpose: request.purpose };
    },

    async consume(token) {
      const tokenHash = await hashVerificationToken(token);
      const request = await deps.repository.findByTokenHash(tokenHash);
      if (!request) return null;

      if (request.consumedAt || request.expiresAt.getTime() < Date.now()) {
        return null;
      }

      await deps.repository.consume(request.id);
      return { userId: request.userId ?? "", target: request.target, purpose: request.purpose };
    },

    async verifySignupEmail(token) {
      const consumed = await (this as EmailVerificationService).consume(token);
      if (!consumed || consumed.purpose !== "signup") return null;
      const account = await deps.accounts.setEmailVerified(consumed.userId, new Date());
      return account;
    },

    async resend(email) {
      const target = email.toLowerCase().trim();
      const account = await deps.accounts.findByEmail(target);
      if (!account || account.emailVerified) {
        // Always appear to succeed; do not leak existence or verification state.
        logger.info("emailVerification.resend.noOp", { email: redactValue(email) });
        return;
      }

      const since = new Date(Date.now() - 60 * 60 * 1000);
      const recent = await deps.repository.countRecentByTarget(target, "signup", since);
      if (recent >= 3) {
        logger.warn("emailVerification.resend.rateLimited", { email: redactValue(email) });
        return;
      }

      await (this as EmailVerificationService).issue(account.id, account.email, "signup");
    },

    async sendRegistrationAttempt(email) {
      const subject = "Someone tried to create an OmniConnect account with this email";
      const text =
        "We noticed a sign-up attempt for this email address. If this was not you, no action is needed. If you already have an account, sign in with your existing password.";
      await deps.emailSender.send(email, subject, text);
    },
  };
}
