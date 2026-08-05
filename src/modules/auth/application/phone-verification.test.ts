import { describe, it, expect, vi, beforeEach } from "vitest";
import { makePhoneVerificationService } from "./phone-verification";
import type { AccountRecord, AccountRepository, VerificationRequestRepository, VerificationRequestRecord } from "./ports";
import type { SmsSender } from "@/modules/notifications";

const FIXED_NOW = 1_700_000_000_000;

function makeAccount(overrides?: Partial<AccountRecord>): AccountRecord {
  return {
    id: "user-1",
    email: "user@example.com",
    name: null,
    passwordHash: "hash",
    phone: null,
    emailVerified: new Date(),
    phoneVerified: null,
    role: "USER",
    isSuperAdmin: false,
    userId: "org-1",
    projectId: null,
    tokenVersion: 1,
    deletedAt: null,
    ...overrides,
  };
}

class InMemoryVerificationRequestRepository implements VerificationRequestRepository {
  records: Array<{
    id: string;
    userId: string | null;
    channel: "email" | "phone";
    purpose: "signup" | "email_change" | "phone_verify" | "mfa";
    target: string;
    tokenHash: string;
    attempts: number;
    expiresAt: Date;
    consumedAt: Date | null;
    createdAt: Date;
  }> = [];

  id = 0;

  async save(request: Omit<VerificationRequestRecord, "id" | "createdAt">) {
    const record = {
      ...request,
      id: `req-${++this.id}`,
      createdAt: new Date(FIXED_NOW),
    };
    this.records.push(record);
    return record;
  }

  async findByTokenHash(tokenHash: string) {
    return this.records.find((r) => r.tokenHash === tokenHash && r.consumedAt === null && r.expiresAt.getTime() > FIXED_NOW) ?? null;
  }

  async consume(id: string) {
    const record = this.records.find((r) => r.id === id);
    if (record) record.consumedAt = new Date(FIXED_NOW);
  }

  async incrementAttempts(id: string) {
    const record = this.records.find((r) => r.id === id);
    if (record) record.attempts += 1;
  }

  async countRecentByTarget(target: string, purpose: string, since: Date, opts?: { consumed?: "all" | "unconsumed" }) {
    return this.records.filter(
      (r) =>
        r.target === target &&
        r.purpose === purpose &&
        r.createdAt.getTime() >= since.getTime() &&
        (opts?.consumed === "all" || r.consumedAt === null),
    ).length;
  }
}

describe("phone-verification service", () => {
  let account = makeAccount();
  const accounts: AccountRepository = {
    findById: vi.fn(async () => account),
    findByEmail: vi.fn(async () => null),
    findByEmailIncludingDeleted: vi.fn(async () => null),
    restoreAccount: vi.fn(async () => null),
    reconcileSuperAdmin: vi.fn(async () => null),
    updatePassword: vi.fn(async () => null),
    updateEmail: vi.fn(async () => null),
    bumpTokenVersion: vi.fn(async () => null),
    setEmailVerified: vi.fn(async () => null),
    updatePhone: vi.fn(async (id, phone) => {
      account = { ...account, phone };
      return account;
    }),
    setPhoneVerified: vi.fn(async (id, phoneVerified) => {
      account = { ...account, phoneVerified };
      return account;
    }),
    create: vi.fn(),
  };

  const sent: { to: string; body: string }[] = [];
  const smsSender: SmsSender = {
    send: vi.fn(async (input) => {
      sent.push(input);
    }),
  };

  beforeEach(() => {
    account = makeAccount();
    sent.length = 0;
  });

  function makeSut(sms: SmsSender | null = smsSender) {
    const repository = new InMemoryVerificationRequestRepository();
    return {
      service: makePhoneVerificationService({
        accounts,
        repository,
        smsSender: sms,
        now: () => FIXED_NOW,
      }),
      repository,
    };
  }

  it("rejects an invalid phone number", async () => {
    const { service } = makeSut();
    const result = await service.request("user-1", "123");
    expect(result.success).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it("sends a 6-digit code for a valid E.164 number", async () => {
    const { service, repository } = makeSut();
    const result = await service.request("user-1", "+447700900123");
    expect(result.success).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("+447700900123");
    const code = sent[0].body.match(/\d{6}/)![0];
    expect(code).toHaveLength(6);

    const record = repository.records[0];
    expect(record.target).toBe("+447700900123");
    expect(record.purpose).toBe("phone_verify");
    expect(record.attempts).toBe(0);
    expect(record.consumedAt).toBeNull();
  });

  it("verifies the code and updates the account", async () => {
    const { service } = makeSut();
    await service.request("user-1", "+447700900123");
    const code = sent[0].body.match(/\d{6}/)![0];

    const result = await service.verify("user-1", code);
    expect(result.success).toBe(true);
    expect(account.phone).toBe("+447700900123");
    expect(account.phoneVerified).not.toBeNull();
  });

  it("rejects an incorrect code", async () => {
    const { service } = makeSut();
    await service.request("user-1", "+447700900123");
    const result = await service.verify("user-1", "000000");
    expect(result.success).toBe(false);
    expect(account.phoneVerified).toBeNull();
  });

  it("rejects an expired code", async () => {
    const { service, repository } = makeSut();
    await service.request("user-1", "+447700900123");
    const code = sent[0].body.match(/\d{6}/)![0];

    const expiredService = makePhoneVerificationService({
      accounts,
      repository,
      smsSender,
      now: () => FIXED_NOW + 11 * 60 * 1000,
    });

    const result = await expiredService.verify("user-1", code);
    expect(result.success).toBe(false);
  });

  it("rate-limits sends to three per hour per number", async () => {
    const { service } = makeSut();
    for (let i = 0; i < 3; i++) {
      const result = await service.request("user-1", "+447700900123");
      expect(result.success).toBe(true);
    }
    const result = await service.request("user-1", "+447700900123");
    expect(result.success).toBe(false);
    expect(sent).toHaveLength(3);
  });

  it("returns an error when SMS provider is not configured", async () => {
    const { service } = makeSut(null);
    const result = await service.request("user-1", "+447700900123");
    expect(result.success).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it("removes a verified phone number", async () => {
    account = makeAccount({ phone: "+447700900123", phoneVerified: new Date() });
    const { service } = makeSut();
    const result = await service.remove("user-1");
    expect(result.success).toBe(true);
    expect(account.phone).toBe("");
  });
});
