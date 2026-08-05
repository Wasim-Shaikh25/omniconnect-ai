import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/shared/database";

export interface TenantFixture {
  organization: { id: string; name: string; plan: string };
  store: { id: string; name: string; organizationId: string };
  owner: { id: string; email: string; name: string | null; role: string; isSuperAdmin: boolean; emailVerified: Date | null; organizationId: string | null; storeId: string | null; tokenVersion: number };
  staff: { id: string; email: string; name: string | null; role: string; isSuperAdmin: boolean; emailVerified: Date | null; organizationId: string | null; storeId: string | null; tokenVersion: number };
}

export interface SuperAdminFixture {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isSuperAdmin: boolean;
  tokenVersion: number;
}

const SALT_ROUNDS = 12;

export async function createTenant(label: string, password = "password"): Promise<TenantFixture> {
  const suffix = `${label}-${randomUUID()}`;
  const organization = await prisma.organization.create({
    data: { name: `Tenant ${label}`, plan: "FREE" },
  });

  const store = await prisma.store.create({
    data: { name: `Store ${label}`, organizationId: organization.id, provider: "SHOPIFY" },
  });

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [owner, staff] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: `owner-${suffix}@example.com`,
        name: `Owner ${label}`,
        role: "STORE_OWNER",
        isSuperAdmin: false,
        emailVerified: new Date(),
        organizationId: organization.id,
        storeId: null,
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: `staff-${suffix}@example.com`,
        name: `Staff ${label}`,
        role: "STAFF",
        isSuperAdmin: false,
        emailVerified: new Date(),
        organizationId: organization.id,
        storeId: store.id,
        passwordHash,
      },
    }),
  ]);

  return {
    organization,
    store,
    owner,
    staff,
  };
}

export async function createSuperAdmin(password = "password"): Promise<SuperAdminFixture> {
  const suffix = randomUUID();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return prisma.user.create({
    data: {
      email: `superadmin-${suffix}@example.com`,
      name: "Super Admin",
      role: "ADMIN",
      isSuperAdmin: true,
      emailVerified: new Date(),
      organizationId: null,
      storeId: null,
      passwordHash,
    },
  });
}
