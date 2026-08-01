import { env, validateProductionSecrets } from "@/shared/config";
import { initSentry, initTelemetry, logger } from "@/shared/observability";

export async function register() {
  initSentry();
  initTelemetry();

  // Skip production secret validation during the static build phase; env is
  // injected at runtime in the production image.
  if (process.env.NEXT_PHASE !== "phase-production-build") {
    validateProductionSecrets();
  }

  if (env.NODE_ENV === "production" && env.LOG_LEVEL === "debug") {
    logger.warn("bootstrap.debugLoggingEnabled", {
      message:
        "LOG_LEVEL is set to debug in production. Debug logs are not redacted beyond the standard rules; rotate the level back to info once diagnostics are complete.",
    });
  }

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
