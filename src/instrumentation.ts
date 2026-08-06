import http from "node:http";
import https from "node:https";
import type { IncomingMessage, ServerResponse } from "node:http";
import { env, validateProductionSecrets } from "@/shared/config";
import {
  initSentry,
  initTelemetry,
  logger,
  logSystem,
  logSystemError,
} from "@/shared/observability";

declare global {
  var __omniconnectHttpMetricsPatched: boolean | undefined;
  var __omniconnectHttpBatchFlushTimer: ReturnType<typeof setInterval> | undefined;
}

const METRICS_EXCLUDE_PATTERN =
  /^\/(?:_next\/|favicon\.ico|.*\.(?:png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot|ico))(?:\?|$)/;

const HTTP_BATCH_INTERVAL_MS = 5_000;
const HTTP_BATCH_SIZE = 500;

interface HttpRequestMetric {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  timestamp: string;
}

const httpRequestBatch: HttpRequestMetric[] = [];
let httpBatchFlushing = false;

function redactPath(path: string): string {
  let redacted = path.replace(
    /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    "[REDACTED_EMAIL]",
  );
  // Redact high-entropy path segments that may contain one-time tokens or IDs
  // (UUIDs, base64-/hex-looking slugs, and other long random strings).
  redacted = redacted.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    "/[REDACTED_UUID]",
  );
  redacted = redacted.replace(
    /\/[A-Za-z0-9_-]{16,}/g,
    "/[REDACTED_TOKEN]",
  );
  return redacted;
}

function safePath(url: string | undefined): string {
  if (!url) return "unknown";
  try {
    const { pathname } = new URL(url, "http://localhost");
    return pathname || "/";
  } catch {
    return url.split("?")[0] || "/";
  }
}

async function flushHttpRequestBatch(): Promise<void> {
  if (httpBatchFlushing) return;
  httpBatchFlushing = true;
  const batch = httpRequestBatch.splice(0, httpRequestBatch.length);
  if (batch.length === 0) {
    httpBatchFlushing = false;
    return;
  }

  try {
    // Store one log row per chunk to bound per-request DB writes.
    const chunks: HttpRequestMetric[][] = [];
    for (let i = 0; i < batch.length; i += HTTP_BATCH_SIZE) {
      chunks.push(batch.slice(i, i + HTTP_BATCH_SIZE));
    }
    await Promise.all(
      chunks.map((requests) =>
        logSystem("INFO", "http.request", "HTTP request batch", {
          metadata: { requests },
        }),
      ),
    );
  } catch (error) {
    logger.error("http.request.batchFlushFailed", {
      error: error instanceof Error ? error.message : "unknown",
      count: batch.length,
    });
  } finally {
    httpBatchFlushing = false;
  }
}

function attachMetrics(req: IncomingMessage, res: ServerResponse): void {
  const start = process.hrtime.bigint();
  const path = redactPath(safePath(req.url));
  const method = req.method ?? "unknown";

  if (METRICS_EXCLUDE_PATTERN.test(path)) {
    return;
  }

  res.once("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const status = res.statusCode;
    httpRequestBatch.push({
      method,
      path,
      status,
      durationMs,
      timestamp: new Date().toISOString(),
    });
    if (httpRequestBatch.length >= HTTP_BATCH_SIZE) {
      void flushHttpRequestBatch();
    }
  });
}

type ServerEmitFn = (
  this: http.Server | https.Server,
  event: string,
  ...args: unknown[]
) => boolean;

function patchServerEmit(prototype: { emit: ServerEmitFn }): void {
  const originalEmit = prototype.emit;
  prototype.emit = function (this: http.Server | https.Server, event: string, ...args: unknown[]) {
    if (event === "request") {
      const req = args[0] as IncomingMessage | undefined;
      const res = args[1] as ServerResponse | undefined;
      if (req && res) attachMetrics(req, res);
    }
    return originalEmit.apply(this, [event, ...args]) as boolean;
  } as ServerEmitFn;
}

function patchHttpServers(): void {
  if (globalThis.__omniconnectHttpMetricsPatched) return;
  globalThis.__omniconnectHttpMetricsPatched = true;

  patchServerEmit(http.Server.prototype as { emit: ServerEmitFn });
  patchServerEmit(https.Server.prototype as { emit: ServerEmitFn });
}

export async function register() {
  // Avoid patching the build-time HTTP server or validating secrets during `next build`.
  if (process.env["NEXT_PHASE"] === "phase-production-build") return;

  // Sentry and OpenTelemetry must initialise in every runtime (nodejs + edge)
  // so middleware and route errors are captured.
  initSentry();
  initTelemetry();

  const isNodejs = process.env["NEXT_RUNTIME"] === "nodejs";

  if (isNodejs) {
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

    if (!globalThis.__omniconnectHttpBatchFlushTimer) {
      globalThis.__omniconnectHttpBatchFlushTimer = setInterval(() => {
        void flushHttpRequestBatch();
      }, HTTP_BATCH_INTERVAL_MS);
    }

    process.on("beforeExit", () => {
      void flushHttpRequestBatch();
    });

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
}

export async function onRequestError(
  error: Error,
  request: { path?: string; method?: string },
): Promise<void> {
  if (process.env["NEXT_RUNTIME"] !== "nodejs") return;
  await logSystemError("http.error", error, {
    metadata: { path: request.path ?? "unknown", method: request.method ?? "unknown" },
  });
}
