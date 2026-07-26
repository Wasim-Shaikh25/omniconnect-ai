"use server";

import { env } from "@/shared/config";
import { prisma } from "@/shared/database";
import { logger } from "@/shared/observability";
import { BcryptPasswordHasher } from "./password-hasher";

export function isSuperAdmin(email: string): boolean {
  if (!env.SUPER_ADMIN_EMAIL) return false;
  return email.toLowerCase() === env.SUPER_ADMIN_EMAIL.toLowerCase();
}

export async function ensureSuperAdmin(): Promise<void> {
  if (!env.SUPER_ADMIN_EMAIL || !env.SUPER_ADMIN_PASSWORD) return;
  const email = env.SUPER_ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  const hasher = new BcryptPasswordHasher();
  const passwordHash = await hasher.hash(env.SUPER_ADMIN_PASSWORD);
  await prisma.user.create({
    data: {
      email,
      name: "Super Admin",
      phone: env.SUPER_ADMIN_PHONE ?? null,
      passwordHash,
      role: "ADMIN",
    },
  });
  logger.info("super-admin.seeded", { email });
}
