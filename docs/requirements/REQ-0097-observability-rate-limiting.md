# REQ-0097 — Observability Access & Rate Limiting Gaps

## Status: Proposed

## Problem

### Bug 1 — `/api/metrics` inaccessible to unauthenticated Prometheus scrapers

The NextAuth v5 middleware (`src/modules/auth/infrastructure/auth.ts`) runs on every
request including API routes. Its `authorized` callback redirects unauthenticated
requests to `/login` with a 302, including requests from the Prometheus scraper which
sends a `Bearer` token but no session cookie.

`/api/metrics` is NOT listed in `PUBLIC_PATHS_EXACT` or `PUBLIC_PATHS_PREFIX` in
`src/modules/auth/infrastructure/public-paths.ts`. As a result, the metrics endpoint
is permanently unreachable for Prometheus — the bearer-token auth added in REQ-0093
never runs because the middleware redirects before the route handler executes.

Secondary concern: if `METRICS_TOKEN` is unset in production the endpoint is wide open
once the middleware redirect is bypassed (e.g. via `x-forwarded-proto` manipulation).
`validateProductionSecrets()` should enforce that `METRICS_TOKEN` is set when
`NODE_ENV === "production"`.

### Bug 2 — `/api/chat/stream` has no per-request rate limit

All other sensitive endpoints (`/api/export/[id]`, `/api/ai/usage`, etc.) call
`rateLimit()` from `src/shared/security/rate-limiter.ts`. `/api/chat/stream`
(`src/app/api/chat/stream/route.ts`) calls only `aiUsageGuard.assertAvailable()`
which is a monthly quota guard, not a rate limiter. A single user can fire many
concurrent requests within quota, triggering expensive LLM calls and upstream cost
spikes before the quota is exhausted.

## Acceptance Criteria

1. Add `/api/metrics` to `PUBLIC_PATHS_PREFIX` in
   `src/modules/auth/infrastructure/public-paths.ts` so the middleware passes
   unauthenticated requests through to the route handler.
2. The route handler in `src/app/api/metrics/route.ts` continues to enforce
   `METRICS_TOKEN` bearer auth (the REQ-0093 implementation stays intact).
3. `validateProductionSecrets()` in `src/shared/config/env.ts` (or equivalent
   startup check) throws when `NODE_ENV === "production"` and `METRICS_TOKEN`
   is not set.
4. `src/app/api/chat/stream/route.ts` calls `rateLimit(request)` before the
   `aiUsageGuard.assertAvailable()` call, with limits appropriate for an AI
   streaming endpoint (e.g. 10 req/min per user, or aligned with the project
   rate-limit configuration).
5. Existing `/api/metrics` integration test (if any) passes; a new test asserts
   that a request without a Bearer token gets 401 (not 302).
6. Lint, typecheck, build pass.

## Affected Files

- `src/modules/auth/infrastructure/public-paths.ts`
- `src/shared/config/env.ts` (or startup validation file)
- `src/app/api/chat/stream/route.ts`
- `src/app/api/metrics/route.ts` (no change needed, verify)

## Priority: High

Bug 1 renders the entire observability stack non-functional in production. Bug 2 is
a cost and availability risk for any user who discovers the streaming endpoint.
