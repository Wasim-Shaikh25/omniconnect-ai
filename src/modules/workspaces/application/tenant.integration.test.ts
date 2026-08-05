import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { SessionUser } from "@/modules/auth";

const { ForbiddenError } = vi.hoisted(() => {
  class ForbiddenError extends Error {
    constructor(message = "Forbidden") {
      super(message);
      this.name = "ForbiddenError";
    }
  }
  return { ForbiddenError };
});

vi.mock("@/modules/auth", () => ({
  ForbiddenError,
}));

import { prisma } from "@/shared/database";
import { resetDatabase } from "@/test/reset";
import { createTenant } from "@/test/fixtures";
import { makeTenantGuard } from "./tenant";
import { PrismaStoreRepository } from "../infrastructure/store.repository";

describe("makeTenantGuard", () => {
  const stores = new PrismaStoreRepository();
  const tenantGuard = makeTenantGuard({
    queries: {
      async getOrganizationIdByStoreId(projectId: string) {
        const store = await stores.findById(projectId);
        return store?.userId ?? null;
      },
    },
  });

  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
  });

  it("allows an owner to access a store in their own organization", async () => {
    const tenantA = await createTenant("A");

    await expect(
      tenantGuard.assertStoreAccess(tenantA.owner as SessionUser, tenantA.store.id),
    ).resolves.toBeUndefined();
  });

  it("denies an owner access to a store in another organization (S2)", async () => {
    const [tenantA, tenantB] = await Promise.all([
      createTenant("A-Cross"),
      createTenant("B-Cross"),
    ]);

    await expect(
      tenantGuard.assertStoreAccess(tenantA.owner as SessionUser, tenantB.store.id),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows STAFF to access their assigned store (S3)", async () => {
    const tenantA = await createTenant("A-Staff");

    await expect(
      tenantGuard.assertStoreAccess(tenantA.staff as SessionUser, tenantA.store.id),
    ).resolves.toBeUndefined();
  });

  it("denies STAFF access to another store in the same organization (S3/S4)", async () => {
    const tenantA = await createTenant("A-Staff-Bound");
    const otherStore = await prisma.project.create({
      data: {
        name: "Other Store",
        userId: tenantA.organization.id,
        provider: "SHOPIFY",
      },
    });

    await expect(
      tenantGuard.assertStoreAccess(tenantA.staff as SessionUser, otherStore.id),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("denies a user with no organization any store access", async () => {
    const orphan = {
      ...(await prisma.user.create({
        data: {
          email: "orphan@example.com",
          passwordHash: "hash",
          role: "STORE_OWNER",
          isSuperAdmin: false,
          userId: null,
        },
      })),
      tokenVersion: 0,
      projectId: null,
      name: null,
      emailVerified: new Date(),
    } as unknown as SessionUser;

    const tenantA = await createTenant("A-Orphan");

    await expect(
      tenantGuard.assertStoreAccess(orphan, tenantA.store.id),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("asserts organization access across tenants (S1)", async () => {
    const [tenantA, tenantB] = await Promise.all([
      createTenant("A-Org"),
      createTenant("B-Org"),
    ]);

    expect(() =>
      tenantGuard.assertOrganizationAccess(tenantA.owner as SessionUser, tenantA.organization.id),
    ).not.toThrow();

    expect(() =>
      tenantGuard.assertOrganizationAccess(tenantA.owner as SessionUser, tenantB.organization.id),
    ).toThrow(ForbiddenError);
  });
});
