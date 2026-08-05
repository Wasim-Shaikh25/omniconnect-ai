import { describe, it, expect, vi } from "vitest";
import { makeChangePasswordService } from "./change-password";
import type { AccountRecord, AccountRepository, PasswordHasher } from "./ports";

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

describe("change-password service", () => {
  function makeSut({ passwordMatches = true, updateResult = true }: { passwordMatches?: boolean; updateResult?: boolean } = {}) {
    let account = makeAccount();
    const accounts: AccountRepository = {
      findById: vi.fn(async () => account),
      findByEmail: vi.fn(async () => null),
      findByEmailIncludingDeleted: vi.fn(async () => null),
      restoreAccount: vi.fn(async () => null),
      updatePassword: vi.fn(async (input) => {
        if (!updateResult) return null;
        account = { ...account, passwordHash: input.passwordHash, tokenVersion: account.tokenVersion + 1 };
        return account;
      }),
      updateEmail: vi.fn(async () => null),
      bumpTokenVersion: vi.fn(async () => null),
      setEmailVerified: vi.fn(async () => null),
      updatePhone: vi.fn(async () => null),
      setPhoneVerified: vi.fn(async () => null),
      create: vi.fn(),
    };
    const hasher: PasswordHasher = {
      hash: vi.fn(async (plain) => `hashed-${plain}`),
      compare: vi.fn(async () => passwordMatches),
    };
    const service = makeChangePasswordService({ accounts, hasher });
    return { accounts, hasher, service, getAccount: () => account };
  }

  it("changes the password when the current password is correct", async () => {
    const { service, accounts, hasher, getAccount } = makeSut();

    const result = await service.change({
      userId: "user-1",
      currentPassword: "current-password",
      newPassword: "new-password-123",
    });

    expect(result.ok).toBe(true);
    expect(hasher.compare).toHaveBeenCalledWith("current-password", "hash");
    expect(accounts.updatePassword).toHaveBeenCalledWith({ id: "user-1", passwordHash: "hashed-new-password-123" });
    expect(getAccount().tokenVersion).toBe(2);
  });

  it("rejects an incorrect current password", async () => {
    const { service, accounts } = makeSut({ passwordMatches: false });

    const result = await service.change({
      userId: "user-1",
      currentPassword: "wrong",
      newPassword: "new-password-123",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe("Current password is incorrect");
    expect(accounts.updatePassword).not.toHaveBeenCalled();
  });

  it("rejects a password that does not meet the policy", async () => {
    const { service, accounts } = makeSut();

    const result = await service.change({
      userId: "user-1",
      currentPassword: "current-password",
      newPassword: "short",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe("Password does not meet the policy");
    expect(accounts.updatePassword).not.toHaveBeenCalled();
  });

  it("rejects when the account has no password (OAuth-only user)", async () => {
    const { service, accounts } = makeSut();
    accounts.findById = vi.fn(async () => makeAccount({ passwordHash: null }));

    const result = await service.change({
      userId: "user-1",
      currentPassword: "current-password",
      newPassword: "new-password-123",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe("Invalid credentials");
    expect(accounts.updatePassword).not.toHaveBeenCalled();
  });
});
