import { describe, it, expect, vi } from "vitest";
import { makeEmailVerificationService } from "./email-verification";
import type { AccountRecord, AccountRepository, VerificationRequestRecord, VerificationRequestRepository } from "./ports";
import type { EmailSender } from "@/shared/email";

class InMemoryVerificationRequestRepository implements VerificationRequestRepository {
  private records: VerificationRequestRecord[] = [];

  async save(request: Omit<VerificationRequestRecord, "id" | "createdAt">): Promise<VerificationRequestRecord> {
    const record: VerificationRequestRecord = {
      ...request,
      id: `req-${this.records.length + 1}`,
      createdAt: new Date(),
    };
    this.records.push(record);
    return record;
  }

  async findByTokenHash(tokenHash: string): Promise<VerificationRequestRecord | null> {
    return this.records.find((r) => r.tokenHash === tokenHash && !r.consumedAt && r.expiresAt.getTime() > Date.now()) ?? null;
  }

  async consume(id: string): Promise<void> {
    const record = this.records.find((r) => r.id === id);
    if (record) record.consumedAt = new Date();
  }

  async incrementAttempts(id: string): Promise<void> {
    const record = this.records.find((r) => r.id === id);
    if (record) record.attempts += 1;
  }

  async countRecentByTarget(target: string, purpose: string, since: Date): Promise<number> {
    return this.records.filter(
      (r) => r.target === target && r.purpose === purpose && !r.consumedAt && r.createdAt.getTime() >= since.getTime(),
    ).length;
  }

  get recordsSnapshot() {
    return this.records;
  }
}

describe("email-verification service", () => {
  function makeSut() {
    const repository = new InMemoryVerificationRequestRepository();
    let account: AccountRecord | null = null;
    const accounts: AccountRepository = {
      findById: vi.fn(async () => account),
      findByEmail: vi.fn(async (email) => (account?.email === email ? account : null)),
      findByEmailIncludingDeleted: vi.fn(async () => null),
      restoreAccount: vi.fn(async () => null),
      updatePassword: vi.fn(async () => null),
      updateEmail: vi.fn(async () => null),
      bumpTokenVersion: vi.fn(async () => null),
      setEmailVerified: vi.fn(async (id, emailVerified) => {
        if (account) account = { ...account, emailVerified };
        return account;
      }),
      create: vi.fn(),
    };
    const sent: { to: string; subject: string }[] = [];
    const emailSender: EmailSender = {
      send: vi.fn(async (to, subject) => {
        sent.push({ to, subject });
      }),
    };
    const service = makeEmailVerificationService({ accounts, repository, emailSender });
    return { repository, accounts, emailSender, sent, service, setAccount: (a: AccountRecord) => (account = a) };
  }

  it("issues a verification token and sends an email", async () => {
    const { service, sent, setAccount } = makeSut();
    setAccount({
      id: "user-1",
      email: "test@example.com",
      name: null,
      passwordHash: "hash",
      phone: null,
      emailVerified: null,
      phoneVerified: null,
      role: "STORE_OWNER",
      isSuperAdmin: false,
      userId: null,
      projectId: null,
      tokenVersion: 0,
      deletedAt: null,
    });

    const token = await service.issue("user-1", "test@example.com", "signup");
    expect(token.length).toBeGreaterThan(0);
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("Verify your OmniConnect account");
  });

  it("inspects a valid token without consuming it", async () => {
    const { service, setAccount } = makeSut();
    setAccount({
      id: "user-1",
      email: "test@example.com",
      name: null,
      passwordHash: "hash",
      phone: null,
      emailVerified: null,
      phoneVerified: null,
      role: "STORE_OWNER",
      isSuperAdmin: false,
      userId: null,
      projectId: null,
      tokenVersion: 0,
      deletedAt: null,
    });

    const token = await service.issue("user-1", "test@example.com", "signup");
    const result = await service.inspect(token);

    expect(result).toEqual({ userId: "user-1", target: "test@example.com", purpose: "signup" });

    const consumed = await service.consume(token);
    expect(consumed).not.toBeNull();
  });

  it("verifies a signup token and marks the account verified", async () => {
    const { service, accounts, setAccount } = makeSut();
    setAccount({
      id: "user-1",
      email: "test@example.com",
      name: null,
      passwordHash: "hash",
      phone: null,
      emailVerified: null,
      phoneVerified: null,
      role: "STORE_OWNER",
      isSuperAdmin: false,
      userId: null,
      projectId: null,
      tokenVersion: 0,
      deletedAt: null,
    });

    const token = await service.issue("user-1", "test@example.com", "signup");
    const result = await service.verifySignupEmail(token);

    expect(result).not.toBeNull();
    expect(accounts.setEmailVerified).toHaveBeenCalledWith("user-1", expect.any(Date));
  });

  it("returns null for an expired token", async () => {
    const { service, repository, setAccount } = makeSut();
    setAccount({
      id: "user-1",
      email: "test@example.com",
      name: null,
      passwordHash: "hash",
      phone: null,
      emailVerified: null,
      phoneVerified: null,
      role: "STORE_OWNER",
      isSuperAdmin: false,
      userId: null,
      projectId: null,
      tokenVersion: 0,
      deletedAt: null,
    });

    const token = await service.issue("user-1", "test@example.com", "signup");
    const record = repository.recordsSnapshot[0];
    record.expiresAt = new Date(Date.now() - 1000);

    const result = await service.consume(token);
    expect(result).toBeNull();
  });

  it("rate-limits resend to 3 per hour per address", async () => {
    const { service, repository, setAccount } = makeSut();
    setAccount({
      id: "user-1",
      email: "test@example.com",
      name: null,
      passwordHash: "hash",
      phone: null,
      emailVerified: null,
      phoneVerified: null,
      role: "STORE_OWNER",
      isSuperAdmin: false,
      userId: null,
      projectId: null,
      tokenVersion: 0,
      deletedAt: null,
    });

    await service.resend("test@example.com");
    await service.resend("test@example.com");
    await service.resend("test@example.com");
    await service.resend("test@example.com");

    expect(repository.recordsSnapshot.filter((r) => r.purpose === "signup").length).toBe(3);
  });
});
