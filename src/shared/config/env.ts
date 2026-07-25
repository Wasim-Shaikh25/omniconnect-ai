import { z } from "zod";

/**
 * Single validated entry point for environment configuration.
 * Never read `process.env` directly elsewhere — import `env` from here.
 * Values are optional at scaffold stage; individual modules tighten requirements
 * as they are implemented.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),

  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),

  SHOPIFY_API_KEY: z.string().optional(),
  SHOPIFY_API_SECRET: z.string().optional(),

  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),

  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),

  ENCRYPTION_KEY: z.string().min(32).optional(),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment configuration:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment configuration");
}

export const env: Env = parsed.data;

const PRODUCTION_REQUIRED: Array<keyof Env> = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "ENCRYPTION_KEY",
  "META_APP_SECRET",
  "OPENAI_API_KEY",
];

/**
 * Validate required production secrets. Call this once at runtime startup
 * (instrumentation.ts / root layout), not at module load, so `next build` does
 * not fail when env is not yet injected.
 */
export function validateProductionSecrets(): void {
  if (env.NODE_ENV !== "production") return;
  const missing = PRODUCTION_REQUIRED.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(", ")}`,
    );
  }
}

// Top-level validation is skipped during `next build` because env is not
// injected at compile time. Run `validateProductionSecrets()` at runtime.
if (
  env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  validateProductionSecrets();
}
