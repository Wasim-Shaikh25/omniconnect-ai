type LogLevel = "debug" | "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
}

/**
 * Minimal structured logger. Wire Sentry + OpenTelemetry exporters here as the
 * observability stack is implemented. Never log secrets, tokens, or PII.
 */
function log(level: LogLevel, message: string, fields: LogFields = {}): void {
  const entry = { level, message, ...fields, timestamp: new Date().toISOString() };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, fields?: LogFields) => log("debug", message, fields),
  info: (message: string, fields?: LogFields) => log("info", message, fields),
  warn: (message: string, fields?: LogFields) => log("warn", message, fields),
  error: (message: string, fields?: LogFields) => log("error", message, fields),
};
