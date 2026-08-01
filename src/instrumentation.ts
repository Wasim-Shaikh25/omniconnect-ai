import { validateProductionSecrets } from "@/shared/config";
import { initSentry, initTelemetry, logger } from "@/shared/observability";

export async function register() {
  initSentry();
  initTelemetry();
  validateProductionSecrets();

  // Seeding is best-effort. A transient database outage must never stop the process
  // from serving traffic, including /api/health.
  try {
    const { ensureSuperAdmin, accounts, hasher } = await import(
      "@/modules/auth/infrastructure/container"
    );
    await ensureSuperAdmin({ accounts, hasher });
  } catch (error) {
    logger.error("bootstrap.ensureSuperAdmin.failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
