import { validateProductionSecrets } from "@/shared/config";

export async function register() {
  validateProductionSecrets();

  // Seed the hardcoded super-admin user when env is configured.
  const { ensureSuperAdmin, accounts, hasher } = await import(
    "@/modules/auth/infrastructure/container"
  );
  await ensureSuperAdmin({ accounts, hasher });
}
