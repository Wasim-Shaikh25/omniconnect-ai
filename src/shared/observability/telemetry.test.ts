import { describe, it, expect, vi, beforeEach } from "vitest";

describe("initTelemetry (M2)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("disables tracing and logs once when OTEL_EXPORTER_OTLP_ENDPOINT is unset in production", async () => {
    const loggerInfo = vi.fn();
    const setGlobalTracerProvider = vi.fn();
    const getTracer = vi.fn(() => ({}) as unknown as import("@opentelemetry/api").Tracer);

    vi.doMock("@/shared/config", () => ({
      env: {
        NODE_ENV: "production",
        OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
      },
    }));

    vi.doMock("./logger", () => ({
      logger: { info: loggerInfo, error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
    }));

    vi.doMock("@opentelemetry/api", async () => {
      const actual = await vi.importActual<typeof import("@opentelemetry/api")>("@opentelemetry/api");
      return {
        ...actual,
        trace: {
          ...actual.trace,
          setGlobalTracerProvider,
          getTracer,
        },
      };
    });

    const { initTelemetry } = await import("./telemetry");
    initTelemetry();
    initTelemetry();

    expect(loggerInfo).toHaveBeenCalledTimes(1);
    expect(loggerInfo).toHaveBeenCalledWith("telemetry.disabled", {
      reason: "OTEL_EXPORTER_OTLP_ENDPOINT is unset in production; tracing disabled",
    });
    expect(setGlobalTracerProvider).not.toHaveBeenCalled();
    expect(getTracer).toHaveBeenCalledWith("omniconnect-ai");
  });

  it("uses ConsoleSpanExporter outside production when the OTLP endpoint is unset", async () => {
    const loggerInfo = vi.fn();
    const setGlobalTracerProvider = vi.fn();

    vi.doMock("@/shared/config", () => ({
      env: {
        NODE_ENV: "development",
        OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
      },
    }));

    vi.doMock("./logger", () => ({
      logger: { info: loggerInfo, error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
    }));

    vi.doMock("@opentelemetry/api", async () => {
      const actual = await vi.importActual<typeof import("@opentelemetry/api")>("@opentelemetry/api");
      return {
        ...actual,
        trace: {
          ...actual.trace,
          setGlobalTracerProvider,
          getTracer: () => ({}) as unknown as import("@opentelemetry/api").Tracer,
        },
      };
    });

    const { initTelemetry } = await import("./telemetry");
    initTelemetry();

    expect(loggerInfo).not.toHaveBeenCalledWith("telemetry.disabled", expect.anything());
    expect(setGlobalTracerProvider).toHaveBeenCalled();
  });
});
