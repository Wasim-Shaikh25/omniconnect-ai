import http from "http";
import https from "https";
import type { IncomingMessage, RequestListener, ServerResponse } from "http";
import { env, validateProductionSecrets } from "@/shared/config";
import { initSentry, initTelemetry, logger } from "@/shared/observability";

declare global {
  var __omniconnectHttpMetricsPatched: boolean | undefined;
}

const METRICS_EXCLUDE_PATTERN = /^\/(?:_next\/|favicon\.ico|.*\.(?:png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot|ico))(?:\?|$)/;

function redactPath(path: string): string {
  return path.replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, "[REDACTED_EMAIL]");
}

function wrapRequestListener(listener: RequestListener): RequestListener {
  return (req: IncomingMessage, res: ServerResponse) => {
    const start = process.hrtime.bigint();
    const path = redactPath(req.url ?? "unknown");
    const method = req.method ?? "unknown";

    if (METRICS_EXCLUDE_PATTERN.test(path)) {
      return listener(req, res);
    }

    res.once("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const status = res.statusCode;
      import("@/shared/observability")
        .then(({ logSystem }) =>
          logSystem("INFO", "http.request", "HTTP request", {
            metadata: { method, path, status, durationMs },
          }),
        )
        .catch(() => undefined);
    });

    return listener(req, res);
  };
}

function patchCreateServer<T extends typeof http.createServer | typeof https.createServer>(
  createServer: T,
): T {
  return function patchedCreateServer(this: unknown, ...args: unknown[]) {
    if (typeof args[0] === "function") {
      args[0] = wrapRequestListener(args[0] as RequestListener);
    } else if (args.length >= 2 && typeof args[1] === "function") {
      args[1] = wrapRequestListener(args[1] as RequestListener);
    }
    return (createServer as unknown as (...args: unknown[]) => ReturnType<T>)(...args);
  } as unknown as T;
}

function patchHttpServers(): void {
  if (globalThis.__omniconnectHttpMetricsPatched) return;
  globalThis.__omniconnectHttpMetricsPatched = true;
  http.createServer = patchCreateServer(http.createServer);
  https.createServer = patchCreateServer(https.createServer);
}

export async function register() {
  if (process.env["NEXT_RUNTIME"] !== "nodejs") return;
  // Avoid patching the build-time HTTP server or validating secrets during `next build`.
  if (process.env["NEXT_PHASE"] === "phase-production-build") return;

  initSentry();
  initTelemetry();

  // Skip production secret validation during the static build phase; env is
  // injected at runtime in the production image.
  if (process.env["NEXT_PHASE"] !== "phase-production-build") {
    validateProductionSecrets();
  }

  if (env.NODE_ENV === "production" && env.LOG_LEVEL === "debug") {
    logger.warn("bootstrap.debugLoggingEnabled", {
      message:
        "LOG_LEVEL is set to debug in production. Debug logs are not redacted beyond the standard rules; rotate the level back to info once diagnostics are complete.",
    });
  }

  patchHttpServers();

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

export async function onRequestError(
  error: Error,
  request: { path?: string; method?: string },
): Promise<void> {
  if (process.env["NEXT_RUNTIME"] !== "nodejs") return;
  const { logSystemError } = await import("@/shared/observability");
  await logSystemError("http.error", error, {
    metadata: { path: request.path ?? "unknown", method: request.method ?? "unknown" },
  });
}
