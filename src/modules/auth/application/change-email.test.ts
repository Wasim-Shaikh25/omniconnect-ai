import { describe, it, expect, vi } from "vitest";
import { makeChangeEmailService } from "./change-email";
import type { AccountRecord, AccountRepository, PasswordHasher } from "./ports";
import type { EmailVerificationService } from "./email-verification";
import type { EmailSender } from "@/shared/email";

function makeAccount(overrides?: Partial<AccountRecord>): AccountRecord {
  return {
    id: "user-1",
    email: "old@example.com",
    name: null,
    passwordHash: "hash",
    phone: null,
    emailVerified: new Date(),
    phoneVerified: null,
    role: "USER",
    isSuperAdmin: false,
    userId: null,
    projectId: null,
    tokenVersion: 1,
    deletedAt: null,
    ...overrides,
  };
}

describe("change-email service", () => {
  function makeSut({ passwordMatches = true, existingNewEmail = false } = {}) {
    let account = makeAccount();
    const records: { token: string; userId: string; target: string; purpose: "signup" | "email_change" }[] = [];
    const accounts: AccountRepository = {
      findById: vi.fn(async () => account),
      findByEmail: vi.fn(async (email) =>
        email === account.email
          ? account
          : existingNewEmail && email === "new@example.com"
            ? { ...makeAccount(), id: "user-2", email: "new@example.com" }
            : null,
      ),
      findByEmailIncludingDeleted: vi.fn(async () => null),
      restoreAccount: vi.fn(async () => null),
      updatePassword: vi.fn(async () => null),
      updateEmail: vi.fn(async (id, email) => {
        account = { ...account, email: email.toLowerCase().trim(), emailVerified: new Date(), tokenVersion: account.tokenVersion + 1 };
        return account;
      }),
      bumpTokenVersion: vi.fn(async () => null),
      setEmailVerified: vi.fn(async () => null),
      create: vi.fn(),
    };
    const hasher: PasswordHasher = {
      hash: vi.fn(async (plain) => `hashed-${plain}`),
      compare: vi.fn(async () => passwordMatches),
    };
    const sent: { to: string; subject: string }[] = [];
    const emailSender: EmailSender = {
      send: vi.fn(async (to, subject) => {
        sent.push({ to, subject });
      }),
    };
    const emailVerification: EmailVerificationService = {
      issue: vi.fn(async (userId, target, purpose) => {
        const token = `token-${records.length + 1}`;
        records.push({ token, userId, target, purpose });
        return token;
      }),
      inspect: vi.fn(async () => null),
      consume: vi.fn(async (token) => {
        const record = records.find((r) => r.token === token);
        if (!record) return null;
        return { userId: record.userId, target: record.target, purpose: record.purpose };
      }),
      verifySignupEmail: vi.fn(async () => null),
      resend: vi.fn(),
      sendRegistrationAttempt: vi.fn(),
    };
    const service = makeChangeEmailService({ accounts, hasher, emailVerification, emailSender });
    return { service, accounts, hasher, emailVerification, emailSender, sent, records, getAccount: () => account };
  }

  it("requests an email change with the correct password", async () => {
    const { service, emailVerification, sent } = makeSut();

    const result = await service.request({ userId: "user-1", newEmail: "new@example.com", currentPassword: "password" });

    expect(result.ok).toBe(true);
    expect(emailVerification.issue).toHaveBeenCalledWith("user-1", "new@example.com", "email_change");
    expect(sent.some((m) => m.to === "old@example.com")).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const { service, emailVerification } = makeSut({ passwordMatches: false });

    const result = await service.request({ userId: "user-1", newEmail: "new@example.com", currentPassword: "wrong" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe("Current password is incorrect");
    expect(emailVerification.issue).not.toHaveBeenCalled();
  });

  it("appears to succeed when the new email already exists", async () => {
    const { service, emailVerification } = makeSut({ existingNewEmail: true });

    const result = await service.request({ userId: "user-1", newEmail: "new@example.com", currentPassword: "password" });

    expect(result.ok).toBe(true);
    expect(emailVerification.issue).not.toHaveBeenCalled();
  });

  it("confirms an email change with a valid token", async () => {
    const { service, records, accounts, getAccount } = makeSut();
    await service.request({ userId: "user-1", newEmail: "new@example.com", currentPassword: "password" });
    const token = records[0].token;

    const result = await service.confirm(token);

    expect(result.ok).toBe(true);
    expect(getAccount().email).toBe("new@example.com");
    expect(getAccount().tokenVersion).toBe(2);
    expect(accounts.updateEmail).toHaveBeenCalledWith("user-1", "new@example.com");
  });

  it("rejects an invalid or consumed token", async () => {
    const { service } = makeSut();

    const result = await service.confirm("bad-token");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message.toLowerCase()).toContain("invalid");
  });
});
