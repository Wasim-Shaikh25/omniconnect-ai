import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/shared/database";
import { PrismaOrganizationInviteRepository } from "./organization-invite.repository";

const repository = new PrismaOrganizationInviteRepository();

describe("PrismaOrganizationInviteRepository.createWithinSeatLimit", () => {
  let userId: string;
  let ownerId: string;

  beforeAll(async () => {
    const org = await prisma.user.create({
      data: { name: "Seat Limit Concurrency Test", email: `seat-limit-${Date.now()}@example.com` },
    });
    userId = org.id;

    const owner = await prisma.user.create({
      data: {
        email: "owner-concurrency@example.com",
        passwordHash: "hash",
        name: "Owner",
        role: "SUPER_ADMIN",
        isSuperAdmin: false,
        userId,
      },
    });
    ownerId = owner.id;
  });

  afterAll(async () => {
    await prisma.organizationInvite.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("does not exceed the seat limit under concurrent invites", async () => {
    const teamSeats = 3;
    const inviteCount = teamSeats + 5;

    const results = await Promise.all(
      Array.from({ length: inviteCount }).map((_, i) =>
        repository.createWithinSeatLimit(
          {
            email: `concurrent-${userId}-${i}@example.com`,
            userId,
            role: "USER",
            projectId: null,
            token: `token-${userId}-${i}`,
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
      where: { userId, status: "PENDING" },
    });

    expect(successful.length).toBeLessThanOrEqual(teamSeats);
    expect(pendingCount).toBeLessThanOrEqual(teamSeats);
    expect(successful.length + rejected.length).toBe(inviteCount);
  });
});
