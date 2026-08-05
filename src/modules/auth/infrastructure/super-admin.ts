import { env } from "@/shared/config";
import { logger } from "@/shared/observability";
import { auditCommands } from "@/modules/users";
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
  const existing = await deps.accounts.findByEmailIncludingDeleted(email);

  if (!existing) {
    const passwordHash = await deps.hasher.hash(env.SUPER_ADMIN_PASSWORD);
    const user = await deps.accounts.create({
      email,
      name: "Super Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      phone: env.SUPER_ADMIN_PHONE ?? null,
      isSuperAdmin: true,
    });
    await auditCommands.create({
      userId: user.id,
      action: "SUPER_ADMIN_CREATED",
      resource: "User",
      resourceId: user.id,
      details: JSON.stringify({ reason: "env bootstrap" }),
    });
    logger.info("superadmin.created", { email });
    return;
  }

  if (!env.SUPER_ADMIN_RECONCILE) {
    logger.info("superadmin.skip", { reason: "reconcile disabled", userId: existing.id });
    return;
  }

  const passwordHash = await deps.hasher.hash(env.SUPER_ADMIN_PASSWORD);
  const reconciled = await deps.accounts.reconcileSuperAdmin(existing.id, {
    passwordHash,
    isSuperAdmin: true,
    phone: env.SUPER_ADMIN_PHONE ?? undefined,
  });

  if (reconciled) {
    await auditCommands.create({
      userId: reconciled.id,
      action: "SUPER_ADMIN_RECONCILED",
      resource: "User",
      resourceId: reconciled.id,
      details: JSON.stringify({ passwordChanged: true }),
    });
    logger.warn("superAdmin.reconciled", { userId: reconciled.id });
  }
}
