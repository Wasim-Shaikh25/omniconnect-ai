import { env } from "@/shared/config";
import * as Sentry from "@sentry/nextjs";

export function initSentry() {
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
    environment: env.NODE_ENV,
    beforeSend(event) {
      // Never forward PII or secrets to Sentry.
      if (event.request?.headers) {
        delete (event.request.headers as Record<string, unknown>)["authorization"];
        delete (event.request.headers as Record<string, unknown>)["cookie"];
      }
      return event;
    },
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export function startSpan<T>(name: string, operation: (span: { setAttribute: (key: string, value: unknown) => void; end: () => void }) => Promise<T>): Promise<T> {
  if (!env.SENTRY_DSN) return operation({ setAttribute: () => undefined, end: () => undefined });
  return Sentry.startSpan({ name, op: "http" }, (span) => {
    const wrapper = {
      setAttribute: (key: string, value: unknown) => span.setAttribute(key, String(value)),
      end: () => span.end(),
    };
    return operation(wrapper);
  });
}
