import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/shared/database";
import { resetDatabase } from "@/test/reset";
import { PrismaUserProfileRepository } from "./user.repository";

const repository = new PrismaUserProfileRepository();

describe("PrismaUserProfileRepository.deleteAccount", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
  });

  it("erases PII and preserves deletion metadata", async () => {
    const originalEmail = "privacy-test@example.com";
    const created = await prisma.user.create({
      data: {
        email: originalEmail,
        name: "Privacy Test",
        phone: "+447700900123",
        mobile: "+447700900123",
        image: "https://example.com/avatar.png",
        passwordHash: "hashed",
      },
    });

    const deleted = await repository.deleteAccount(created.id, "user request");
    expect(deleted).not.toBeNull();
    expect(deleted?.email).toBe(originalEmail);
    expect(deleted?.name).toBe("Deleted User");

    const raw = await prisma.user.findUnique({ where: { id: created.id } });
    expect(raw).not.toBeNull();
    expect(raw?.email).toBe(originalEmail);
    expect(raw?.name).toBe("Deleted User");
    expect(raw?.phone).toBeNull();
    expect(raw?.phoneVerified).toBeNull();
    expect(raw?.mobile).toBeNull();
    expect(raw?.mobileVerified).toBeNull();
    expect(raw?.image).toBeNull();
    expect(raw?.deletedAt).not.toBeNull();
    expect(raw?.deletedReason).toBe("user request");
    expect(raw?.tokenVersion).toBe(created.tokenVersion + 1);

    const foundByOriginalEmail = await prisma.user.findUnique({
      where: { email: originalEmail },
    });
    expect(foundByOriginalEmail).toBeNull();
  });
});
