import { describe, it, expect } from "vitest";
import type {
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

  findBySubscriptionId(): Promise<OrganizationRecord | null> {
    return Promise.resolve(null);
  }

  listAll(): Promise<import("@/shared/kernel").PaginatedResult<OrganizationRecord>> {
    throw new Error("not implemented");
  }

  updatePlan(): Promise<OrganizationRecord | null> {
    throw new Error("not implemented");
  }

  incrementAIReplies(): Promise<boolean> {
    throw new Error("not implemented");
  }
}

class InMemoryInvites implements OrganizationInviteRepository {
  private invites: OrganizationInviteRecord[] = [];

  findByToken(token: string): Promise<OrganizationInviteRecord | null> {
    return Promise.resolve(this.invites.find((i) => i.token === token) ?? null);
  }

  findPendingByEmail(
    organizationId: string,
    email: string,
  ): Promise<OrganizationInviteRecord | null> {
    return Promise.resolve(
      this.invites.find(
        (i) => i.organizationId === organizationId && i.email === email && i.status === "PENDING",
      ) ?? null,
    );
  }

  create(
    input: Omit<OrganizationInviteRecord, "id" | "createdAt" | "status"> & { status?: InviteStatus },
  ): Promise<OrganizationInviteRecord> {
    const invite: OrganizationInviteRecord = {
      ...input,
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

  countPendingByOrganization(organizationId: string): Promise<number> {
    return Promise.resolve(
      this.invites.filter((i) => i.organizationId === organizationId && i.status === "PENDING")
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
  const emails: { email: string; token: string }[] = [];
  const emailInputs: Parameters<Parameters<typeof makeInviteMember>[0]["sendInviteEmail"]>[0][] = [];
  let now = new Date("2026-07-28T00:00:00.000Z");
  let tokenCounter = 0;

  const inviteMember = makeInviteMember({
    organizations,
    invites,
    countOrganizationUsers: () => Promise.resolve(userCount),
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
      role: "STAFF",
      organizationId: org.id,
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
      role: "STAFF",
      organizationId: org.id,
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
      role: "STAFF",
      organizationId: org.id,
      createdByUserId: "owner-1",
    });
    expect(first.ok).toBe(true);

    const second = await inviteMember({
      email: "two@example.com",
      role: "STAFF",
      organizationId: org.id,
      createdByUserId: "owner-1",
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error.message).toContain("Team seat limit reached");
    expect(emails).toHaveLength(1);
  });

  it("includes the selected storeId in the invite email", async () => {
    const { organizations, inviteMember, emailInputs } = makeSut(0);
    const org = await organizations.create({ name: "Test Org" });

    const result = await inviteMember({
      email: "staff@example.com",
      role: "STAFF",
      storeId: "store-a",
      organizationId: org.id,
      createdByUserId: "owner-1",
    });

    expect(result.ok).toBe(true);
    expect(emailInputs).toHaveLength(1);
    expect(emailInputs[0]?.storeId).toBe("store-a");
  });

  it("rejects duplicate pending invite for the same email", async () => {
    const { organizations, inviteMember } = makeSut(0);
    const org = await organizations.create({ name: "Test Org" });

    const first = await inviteMember({
      email: "staff@example.com",
      role: "STAFF",
      organizationId: org.id,
      createdByUserId: "owner-1",
    });
    expect(first.ok).toBe(true);

    const second = await inviteMember({
      email: "staff@example.com",
      role: "STAFF",
      organizationId: org.id,
      createdByUserId: "owner-1",
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error.message).toContain("already pending");
  });
});
