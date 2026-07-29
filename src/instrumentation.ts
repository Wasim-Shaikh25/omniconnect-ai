import { validateProductionSecrets } from "@/shared/config";
import { initSentry, initTelemetry } from "@/shared/observability";

export async function register() {
  initSentry();
  initTelemetry();
  validateProductionSecrets();

  // Seed the hardcoded super-admin user when env is configured.
  const { ensureSuperAdmin, accounts, hasher } = await import(
    "@/modules/auth/infrastructure/container"
  );
  await ensureSuperAdmin({ accounts, hasher });
}
