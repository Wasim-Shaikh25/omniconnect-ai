import { describe, it, expect, vi } from "vitest";
import { makeRegisterUser, registerUserSchema } from "./register-user";
import type { AccountRecord, AccountRepository, PasswordHasher } from "./ports";
import type { EventBus } from "@/shared/events";

describe("register-user use-case", () => {
  function makeSut() {
    const accounts: AccountRecord[] = [];
    const repository: AccountRepository = {
      findById: vi.fn(async () => null),
      findByEmail: vi.fn(async (email) => accounts.find((a) => a.email === email) ?? null),
      findByEmailIncludingDeleted: vi.fn(async (email) => accounts.find((a) => a.email === email && !a.deletedAt) ?? null),
      restoreAccount: vi.fn(async () => null),
      updatePassword: vi.fn(async () => null),
      updateEmail: vi.fn(async () => null),
      bumpTokenVersion: vi.fn(async () => null),
      setEmailVerified: vi.fn(async () => null),
      create: vi.fn(async (input) => {
        const account: AccountRecord = {
          id: `user-${accounts.length + 1}`,
          email: input.email,
          name: input.name,
          passwordHash: input.passwordHash,
          phone: input.phone ?? null,
          emailVerified: input.emailVerified ?? null,
          phoneVerified: null,
          role: input.role,
          isSuperAdmin: input.isSuperAdmin ?? false,
          organizationId: input.organizationId ?? null,
          storeId: input.storeId ?? null,
          tokenVersion: 0,
          deletedAt: null,
        };
        accounts.push(account);
        return account;
      }),
    };
    const hasher: PasswordHasher = {
      hash: vi.fn(async (plain) => `hashed-${plain}`),
      compare: vi.fn(async () => true),
    };
    const eventBus: EventBus = { publish: vi.fn(), subscribe: vi.fn() };
    return { accounts, repository, hasher, eventBus, registerUser: makeRegisterUser({ accounts: repository, hasher, eventBus }) };
  }

  it("creates a new user with hashed password", async () => {
    const { registerUser, repository, hasher } = makeSut();
    const result = await registerUser({
      email: "new@example.com",
      name: "New User",
      password: "password123",
      confirmPassword: "password123",
      phone: undefined,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.isExisting).toBe(false);
    expect(result.value.email).toBe("new@example.com");
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ email: "new@example.com" }));
    expect(hasher.hash).toHaveBeenCalledWith("password123");
  });

  it("returns existing user without creating a new account", async () => {
    const { registerUser, repository } = makeSut();
    await registerUser({ email: "existing@example.com", password: "password123", confirmPassword: "password123", phone: undefined });
    const result = await registerUser({ email: "existing@example.com", password: "password123", confirmPassword: "password123", phone: undefined });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.isExisting).toBe(true);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it("rejects mismatched confirm password", () => {
    const result = registerUserSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid phone number", () => {
    const result = registerUserSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
      phone: "not-a-phone",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid E.164 phone number", () => {
    const result = registerUserSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
      phone: "+447700900123",
    });
    expect(result.success).toBe(true);
  });
});
