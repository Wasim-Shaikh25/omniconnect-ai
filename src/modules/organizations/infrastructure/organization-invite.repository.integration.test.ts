import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/shared/database";
import { PrismaOrganizationInviteRepository } from "./organization-invite.repository";

const repository = new PrismaOrganizationInviteRepository();

describe("PrismaOrganizationInviteRepository.createWithinSeatLimit", () => {
  let organizationId: string;
  let ownerId: string;

  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: "Seat Limit Concurrency Test" },
    });
    organizationId = org.id;

    const owner = await prisma.user.create({
      data: {
        email: "owner-concurrency@example.com",
        passwordHash: "hash",
        name: "Owner",
        role: "ADMIN",
        isSuperAdmin: false,
        organizationId,
      },
    });
    ownerId = owner.id;
  });

  afterAll(async () => {
    await prisma.organizationInvite.deleteMany({ where: { organizationId } });
    await prisma.user.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
  });

  it("does not exceed the seat limit under concurrent invites", async () => {
    const teamSeats = 3;
    const inviteCount = teamSeats + 5;

    const results = await Promise.all(
      Array.from({ length: inviteCount }).map((_, i) =>
        repository.createWithinSeatLimit(
          {
            email: `concurrent-${organizationId}-${i}@example.com`,
            organizationId,
            role: "STAFF",
            storeId: null,
            token: `token-${organizationId}-${i}`,
            createdByUserId: ownerId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          teamSeats,
        ),
      ),
    );

    const successful = results.filter((r) => r.ok);
    const rejected = results.filter((r) => !r.ok && r.reason === "seat_limit");

    const pendingCount = await prisma.organizationInvite.count({
      where: { organizationId, status: "PENDING" },
    });

    expect(successful.length).toBeLessThanOrEqual(teamSeats);
    expect(pendingCount).toBeLessThanOrEqual(teamSeats);
    expect(successful.length + rejected.length).toBe(inviteCount);
  });
});
