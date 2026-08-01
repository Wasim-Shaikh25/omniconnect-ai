import { env } from "@/shared/config";
import {
  trace,
  context as otelContext,
  SpanStatusCode,
  type Tracer,
  type Span,
} from "@opentelemetry/api";
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { logger } from "./logger";

let tracer: Tracer | null = null;
let disabledLogged = false;

export function initTelemetry() {
  if (tracer) return;

  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT && env.NODE_ENV === "production") {
    if (!disabledLogged) {
      logger.info("telemetry.disabled", {
        reason: "OTEL_EXPORTER_OTLP_ENDPOINT is unset in production; tracing disabled",
      });
      disabledLogged = true;
    }
    tracer = trace.getTracer("omniconnect-ai");
    return;
  }

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "omniconnect-ai",
  });

  const exporter = env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPTraceExporter({ url: env.OTEL_EXPORTER_OTLP_ENDPOINT })
    : new ConsoleSpanExporter();

  const provider = new BasicTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });

  trace.setGlobalTracerProvider(provider);
  tracer = trace.getTracer("omniconnect-ai");
}

export async function withSpan<T>(
  name: string,
  operation: (span: Span) => Promise<T>,
  options?: { attributes?: Record<string, unknown> },
): Promise<T> {
  initTelemetry();
  const activeTracer = tracer ?? trace.getTracer("omniconnect-ai");
  return activeTracer.startActiveSpan(name, async (span) => {
    if (options?.attributes) {
      for (const [key, value] of Object.entries(options.attributes)) {
        if (value !== undefined && value !== null) {
          span.setAttribute(key, String(value));
        }
      }
    }
    try {
      const result = await operation(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

export function getActiveSpan(): Span | undefined {
  return trace.getSpan(otelContext.active());
}
