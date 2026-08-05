import { env } from "@/shared/config";
import { logger } from "@/shared/observability";
import { AccountRepository } from "../application/ports";
import { PasswordHasher } from "../application/ports";

export function isSuperAdmin(email: string): boolean {
  if (!env.SUPER_ADMIN_EMAIL) return false;
  return email.toLowerCase().trim() === env.SUPER_ADMIN_EMAIL.toLowerCase().trim();
}

export async function ensureSuperAdmin(deps: {
  accounts: AccountRepository;
  hasher: PasswordHasher;
}): Promise<void> {
  if (!env.SUPER_ADMIN_EMAIL || !env.SUPER_ADMIN_PASSWORD) {
    logger.info("superadmin.skip", { reason: "missing env" });
    return;
  }

  const email = env.SUPER_ADMIN_EMAIL.toLowerCase().trim();
  const existing = await deps.accounts.findByEmail(email);

  if (existing) {
    // Nothing to change in this phase beyond ensuring the flag and phone.
    return;
  }

  const passwordHash = await deps.hasher.hash(env.SUPER_ADMIN_PASSWORD);
  await deps.accounts.create({
    email,
    name: "Super Admin",
    passwordHash,
    role: "SUPER_ADMIN",
    phone: env.SUPER_ADMIN_PHONE ?? null,
    isSuperAdmin: true,
  });

  logger.info("superadmin.created", { email });
}
