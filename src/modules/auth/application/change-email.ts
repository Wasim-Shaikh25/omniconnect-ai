import { z } from "zod";
import { Result, ok, err } from "@/shared/kernel";
import { EmailSender } from "@/shared/email";
import { logger, redactValue } from "@/shared/observability";
import { AccountRepository, PasswordHasher } from "./ports";
import { EmailVerificationService } from "./email-verification";

export const requestEmailChangeSchema = z
  .object({
    newEmail: z.string().email(),
    confirmNewEmail: z.string().email(),
    currentPassword: z.string().min(1),
  })
  .refine((data) => data.newEmail === data.confirmNewEmail, {
    message: "Email addresses do not match",
    path: ["confirmNewEmail"],
  });

export type RequestEmailChangeInput = z.infer<typeof requestEmailChangeSchema>;

export interface ChangeEmailService {
  request(input: {
    userId: string;
    newEmail: string;
    currentPassword: string;
  }): Promise<Result<void, Error>>;
  confirm(token: string): Promise<Result<{ id: string; email: string }, Error>>;
}

interface ChangeEmailDeps {
  accounts: AccountRepository;
  hasher: PasswordHasher;
  emailVerification: EmailVerificationService;
  emailSender: EmailSender;
}

export function makeChangeEmailService(deps: ChangeEmailDeps): ChangeEmailService {
  return {
    async request(input) {
      const account = await deps.accounts.findById(input.userId);
      if (!account || !account.passwordHash) {
        return err(new Error("Invalid credentials"));
      }

      const passwordMatches = await deps.hasher.compare(input.currentPassword, account.passwordHash);
      if (!passwordMatches) {
        return err(new Error("Current password is incorrect"));
      }

      const newEmail = input.newEmail.toLowerCase().trim();
      if (newEmail === account.email.toLowerCase()) {
        return err(new Error("New email must be different from your current email"));
      }

      const existing = await deps.accounts.findByEmail(newEmail);
      if (existing) {
        await deps.emailSender.send(
          newEmail,
          "Someone tried to change their OmniConnect email to this address",
          "We noticed a request to change an account email to this address. If this was not you, no action is needed.",
        );
        return ok(undefined);
      }

      await deps.emailVerification.issue(account.id, newEmail, "email_change");
      await deps.emailSender.send(
        account.email,
        "Confirm your OmniConnect email change",
        `A request was made to change your account email to ${newEmail}. If this was not you, contact support immediately.`,
      );

      logger.info("emailChange.requested", { userId: account.id, newEmail: redactValue(newEmail) });
      return ok(undefined);
    },

    async confirm(token) {
      const verification = await deps.emailVerification.consume(token);
      if (!verification) {
        return err(new Error("This link is invalid, expired, or has already been used."));
      }
      if (verification.purpose !== "email_change") {
        return err(new Error("This link is not valid for an email change."));
      }

      const account = await deps.accounts.findById(verification.userId);
      if (!account) {
        return err(new Error("Account not found."));
      }

      const newEmail = verification.target.toLowerCase().trim();
      if (newEmail === account.email.toLowerCase()) {
        return ok({ id: account.id, email: account.email });
      }

      const existing = await deps.accounts.findByEmail(newEmail);
      if (existing && existing.id !== account.id) {
        return err(new Error("This email address is already in use."));
      }

      const updated = await deps.accounts.updateEmail(account.id, newEmail);
      if (!updated) {
        return err(new Error("Could not update email."));
      }

      logger.info("emailChange.confirmed", { userId: updated.id, email: redactValue(updated.email) });
      return ok({ id: updated.id, email: updated.email });
    },
  };
}
