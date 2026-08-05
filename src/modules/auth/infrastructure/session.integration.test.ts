import { describe, expect, it, beforeAll, afterAll, vi, type Mock } from "vitest";
import { prisma } from "@/shared/database";
import { resetDatabase } from "@/test/reset";
import { getCurrentUser, requireSuperAdmin, requireVerifiedEmail } from "./session";
import { ForbiddenError } from "../domain/errors";

vi.mock("./auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "./auth";

interface MockSession {
  expires: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    isSuperAdmin: boolean;
    userId: string | null;
    projectId: string | null;
    tokenVersion: number;
  };
}

const mockAuth = auth as unknown as Mock<(...args: unknown[]) => Promise<MockSession>>;

describe("getCurrentUser", () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
  });

  it("returns null when the JWT tokenVersion is stale (T9)", async () => {
    const user = await prisma.user.create({
      data: {
        email: "stale-version@example.com",
        passwordHash: "hash",
        name: "Stale",
        role: "STORE_OWNER",
        isSuperAdmin: false,
        tokenVersion: 2,
      },
    });

    mockAuth.mockResolvedValue({
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        userId: user.userId,
        projectId: user.projectId,
        tokenVersion: 1,
      },
    });

    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it("returns null when the account is soft-deleted (T10)", async () => {
    const user = await prisma.user.create({
      data: {
        email: "deleted-user@example.com",
        passwordHash: "hash",
        name: "Deleted",
        role: "STORE_OWNER",
        isSuperAdmin: false,
        tokenVersion: 1,
        deletedAt: new Date(),
      },
    });

    mockAuth.mockResolvedValue({
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        userId: user.userId,
        projectId: user.projectId,
        tokenVersion: user.tokenVersion,
      },
    });

    const result = await getCurrentUser();
    expect(result).toBeNull();
  });
});

describe("requireSuperAdmin", () => {
  it("returns the user when they are a super admin (S5)", async () => {
    const admin = await prisma.user.create({
      data: {
        email: "super@example.com",
        passwordHash: "hash",
        name: "Super Admin",
        role: "ADMIN",
        isSuperAdmin: true,
        tokenVersion: 1,
      },
    });

    mockAuth.mockResolvedValue({
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isSuperAdmin: admin.isSuperAdmin,
        userId: admin.userId,
        projectId: admin.projectId,
        tokenVersion: admin.tokenVersion,
      },
    });

    const result = await requireSuperAdmin();
    expect(result.id).toBe(admin.id);
  });

  it("throws ForbiddenError when the user is not a super admin (S5)", async () => {
    const owner = await prisma.user.create({
      data: {
        email: "owner@example.com",
        passwordHash: "hash",
        name: "Owner",
        role: "STORE_OWNER",
        isSuperAdmin: false,
        tokenVersion: 1,
      },
    });

    mockAuth.mockResolvedValue({
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: owner.id,
        email: owner.email,
        name: owner.name,
        role: owner.role,
        isSuperAdmin: owner.isSuperAdmin,
        userId: owner.userId,
        projectId: owner.projectId,
        tokenVersion: owner.tokenVersion,
      },
    });

    await expect(requireSuperAdmin()).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("requireVerifiedEmail", () => {
  it("throws ForbiddenError when the user is not verified", async () => {
    const unverified = await prisma.user.create({
      data: {
        email: "unverified@example.com",
        passwordHash: "hash",
        name: "Unverified",
        role: "STORE_OWNER",
        isSuperAdmin: false,
        emailVerified: null,
        tokenVersion: 1,
      },
    });

    mockAuth.mockResolvedValue({
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: unverified.id,
        email: unverified.email,
        name: unverified.name,
        role: unverified.role,
        isSuperAdmin: unverified.isSuperAdmin,
        userId: unverified.userId,
        projectId: unverified.projectId,
        tokenVersion: unverified.tokenVersion,
      },
    });

    await expect(requireVerifiedEmail()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns the user when they are verified", async () => {
    const verified = await prisma.user.create({
      data: {
        email: "verified@example.com",
        passwordHash: "hash",
        name: "Verified",
        role: "STORE_OWNER",
        isSuperAdmin: false,
        emailVerified: new Date(),
        tokenVersion: 1,
      },
    });

    mockAuth.mockResolvedValue({
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: verified.id,
        email: verified.email,
        name: verified.name,
        role: verified.role,
        isSuperAdmin: verified.isSuperAdmin,
        userId: verified.userId,
        projectId: verified.projectId,
        tokenVersion: verified.tokenVersion,
      },
    });

    const result = await requireVerifiedEmail();
    expect(result.id).toBe(verified.id);
    expect(result.emailVerified).toBeInstanceOf(Date);
  });
});
