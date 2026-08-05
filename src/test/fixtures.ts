import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/shared/database";

export interface TenantFixture {
  organization: { id: string; name: string; plan: string };
  store: { id: string; name: string; userId: string };
  owner: { id: string; email: string; name: string | null; role: string; isSuperAdmin: boolean; emailVerified: Date | null; userId: string | null; projectId: string | null; tokenVersion: number };
  staff: { id: string; email: string; name: string | null; role: string; isSuperAdmin: boolean; emailVerified: Date | null; userId: string | null; projectId: string | null; tokenVersion: number };
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
  const organization = await prisma.user.create({
    data: { name: `Tenant ${label}`, plan: "FREE" },
  });

  const store = await prisma.project.create({
    data: { name: `Store ${label}`, userId: organization.id, provider: "SHOPIFY" },
  });

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [owner, staff] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: `owner-${suffix}@example.com`,
        name: `Owner ${label}`,
        role: "USER",
        isSuperAdmin: false,
        emailVerified: new Date(),
        userId: organization.id,
        projectId: null,
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: `staff-${suffix}@example.com`,
        name: `Staff ${label}`,
        role: "USER",
        isSuperAdmin: false,
        emailVerified: new Date(),
        userId: organization.id,
        projectId: store.id,
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
      role: "SUPER_ADMIN",
      isSuperAdmin: true,
      emailVerified: new Date(),
      userId: null,
      projectId: null,
      passwordHash,
    },
  });
}
