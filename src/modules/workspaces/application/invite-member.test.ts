/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect } from "vitest";
import type { Prisma } from "@prisma/client";
import type {
  CreateInviteInput,
  CreateInviteResult,
  OrganizationInviteRecord,
  OrganizationInviteRepository,
  OrganizationRecord,
  OrganizationRepository,
} from "./ports";
import type { InviteStatus } from "../domain/invite";
import { makeInviteMember } from "./invite-member";
import { Plan } from "../domain/plan";

class InMemoryOrganizations implements OrganizationRepository {
  private orgs: Map<string, OrganizationRecord> = new Map();

  create(input: { name: string }): Promise<OrganizationRecord> {
    const org: OrganizationRecord = {
      id: `org-${this.orgs.size + 1}`,
      name: input.name,
      plan: Plan.FREE,
      subscriptionId: null,
      subscriptionStatus: null,
      createdAt: new Date(),
    };
    this.orgs.set(org.id, org);
    return Promise.resolve(org);
  }

  findById(id: string): Promise<OrganizationRecord | null> {
    return Promise.resolve(this.orgs.get(id) ?? null);
  }

  findBySubscriptionId(
    _subscriptionId?: string,
    _tx?: Prisma.TransactionClient,
  ): Promise<OrganizationRecord | null> {
    return Promise.resolve(null);
  }

  listAll(): Promise<import("@/shared/kernel").PaginatedResult<OrganizationRecord>> {
    throw new Error("not implemented");
  }

  updatePlan(
    _id?: string,
    _input?: { plan: Plan; subscriptionId?: string | null; subscriptionStatus?: string | null },
    _tx?: Prisma.TransactionClient,
  ): Promise<OrganizationRecord | null> {
    throw new Error("not implemented");
  }

  incrementAIReplies(): Promise<boolean> {
    throw new Error("not implemented");
  }

  incrementProfileInspections(): Promise<boolean> {
    throw new Error("not implemented");
  }
}

class InMemoryInvites implements OrganizationInviteRepository {
  private invites: OrganizationInviteRecord[] = [];
  userCount = 0;

  findByToken(token: string): Promise<OrganizationInviteRecord | null> {
    return Promise.resolve(this.invites.find((i) => i.token === token) ?? null);
  }

  findPendingByEmail(
    userId: string,
    email: string,
  ): Promise<OrganizationInviteRecord | null> {
    return Promise.resolve(
      this.invites.find(
        (i) => i.userId === userId && i.email === email && i.status === "PENDING",
      ) ?? null,
    );
  }

  findById(id: string, userId: string): Promise<OrganizationInviteRecord | null> {
    return Promise.resolve(
      this.invites.find((i) => i.id === id && i.userId === userId) ?? null,
    );
  }

  create(input: CreateInviteInput): Promise<OrganizationInviteRecord> {
    const invite: OrganizationInviteRecord = {
      ...input,
      projectId: input.projectId ?? null,
      status: input.status ?? "PENDING",
      id: `invite-${this.invites.length + 1}`,
      createdAt: new Date(),
    };
    this.invites.push(invite);
    return Promise.resolve(invite);
  }

  updateStatus(id: string, status: InviteStatus): Promise<OrganizationInviteRecord> {
    const invite = this.invites.find((i) => i.id === id);
    if (!invite) throw new Error("Invite not found");
    invite.status = status;
    return Promise.resolve(invite);
  }

  updateToken(
    id: string,
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<OrganizationInviteRecord | null> {
    const invite = this.invites.find((i) => i.id === id && i.userId === userId);
    if (!invite) return Promise.resolve(null);
    invite.token = token;
    invite.expiresAt = expiresAt;
    return Promise.resolve(invite);
  }

  createWithinSeatLimit(
    input: CreateInviteInput,
    teamSeats: number | null,
    now?: Date,
  ): Promise<CreateInviteResult> {
    const cutoff = now ?? new Date();
    const pendingCount = this.invites.filter(
      (i) =>
        i.userId === input.userId &&
        i.status === "PENDING" &&
        i.expiresAt > cutoff,
    ).length;

    if (teamSeats !== null && this.userCount + pendingCount >= teamSeats) {
      return Promise.resolve({ ok: false as const, reason: "seat_limit" as const, limit: teamSeats });
    }

    const invite: OrganizationInviteRecord = {
      ...input,
      projectId: input.projectId ?? null,
      status: input.status ?? "PENDING",
      id: `invite-${this.invites.length + 1}`,
      createdAt: cutoff,
    };
    this.invites.push(invite);
    return Promise.resolve({ ok: true as const, invite });
  }

  deleteInvite(id: string, userId: string): Promise<void> {
    this.invites = this.invites.filter(
      (i) => !(i.id === id && i.userId === userId),
    );
    return Promise.resolve();
  }

  countPendingByOrganization(userId: string): Promise<number> {
    return Promise.resolve(
      this.invites.filter((i) => i.userId === userId && i.status === "PENDING")
        .length,
    );
  }

  listPendingByOrganization(): Promise<OrganizationInviteRecord[]> {
    throw new Error("not implemented");
  }
}

function makeSut(userCount = 0) {
  const organizations = new InMemoryOrganizations();
  const invites = new InMemoryInvites();
  invites.userCount = userCount;
  const emails: { email: string; token: string }[] = [];
  const emailInputs: Parameters<Parameters<typeof makeInviteMember>[0]["sendInviteEmail"]>[0][] = [];
  let now = new Date("2026-07-28T00:00:00.000Z");
  let tokenCounter = 0;

  const inviteMember = makeInviteMember({
    organizations,
    invites,
    sendInviteEmail: (input) => {
      emails.push({ email: input.email, token: input.token });
      emailInputs.push(input);
      return Promise.resolve();
    },
    generateToken: () => {
      tokenCounter += 1;
      return `token-${tokenCounter}`;
    },
    now: () => now,
  });

  return { organizations, invites, emails, emailInputs, inviteMember, getNow: () => now, setNow: (d: Date) => { now = d; } };
}

describe("makeInviteMember", () => {
  it("creates an invite when seats are available", async () => {
    const { organizations, inviteMember, emails } = makeSut(0);
    const org = await organizations.create({ name: "Test Org" });

    const result = await inviteMember({
      email: "staff@example.com",
      role: "USER",
      userId: org.id,
      createdByUserId: "owner-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.invite.email).toBe("staff@example.com");
    expect(emails).toHaveLength(1);
  });

  it("rejects invite when team seat limit is reached", async () => {
    const { organizations, inviteMember } = makeSut(1);
    const org = await organizations.create({ name: "Test Org" });

    const result = await inviteMember({
      email: "staff@example.com",
      role: "USER",
      userId: org.id,
      createdByUserId: "owner-1",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("Team seat limit reached");
  });

  it("counts pending invites against the seat limit", async () => {
    const { organizations, inviteMember, emails } = makeSut(0);
    const org = await organizations.create({ name: "Test Org" });

    const first = await inviteMember({
      email: "one@example.com",
      role: "USER",
      userId: org.id,
      createdByUserId: "owner-1",
    });
    expect(first.ok).toBe(true);

    const second = await inviteMember({
      email: "two@example.com",
      role: "USER",
      userId: org.id,
      createdByUserId: "owner-1",
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error.message).toContain("Team seat limit reached");
    expect(emails).toHaveLength(1);
  });

  it("includes the selected projectId in the invite email", async () => {
    const { organizations, inviteMember, emailInputs } = makeSut(0);
    const org = await organizations.create({ name: "Test Org" });

    const result = await inviteMember({
      email: "staff@example.com",
      role: "USER",
      projectId: "store-a",
      userId: org.id,
      createdByUserId: "owner-1",
    });

    expect(result.ok).toBe(true);
    expect(emailInputs).toHaveLength(1);
    expect(emailInputs[0]?.projectId).toBe("store-a");
  });

  it("rejects duplicate pending invite for the same email", async () => {
    const { organizations, inviteMember } = makeSut(0);
    const org = await organizations.create({ name: "Test Org" });

    const first = await inviteMember({
      email: "staff@example.com",
      role: "USER",
      userId: org.id,
      createdByUserId: "owner-1",
    });
    expect(first.ok).toBe(true);

    const second = await inviteMember({
      email: "staff@example.com",
      role: "USER",
      userId: org.id,
      createdByUserId: "owner-1",
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error.message).toContain("already pending");
  });

  it("does not send an invite email when the seat limit is reached (H10)", async () => {
    const { organizations, inviteMember, emails } = makeSut(1);
    const org = await organizations.create({ name: "Test Org" });

    const result = await inviteMember({
      email: "staff@example.com",
      role: "USER",
      userId: org.id,
      createdByUserId: "owner-1",
    });

    expect(result.ok).toBe(false);
    expect(emails).toHaveLength(0);
  });
});
