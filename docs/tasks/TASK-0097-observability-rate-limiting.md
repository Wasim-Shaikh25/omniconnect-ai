# TASK-0097 — Observability Access & Rate Limiting Gaps

## Requirement: REQ-0097

## Steps

### 1. Make `/api/metrics` reachable for unauthenticated scrapers

`src/modules/auth/infrastructure/public-paths.ts`: add `/api/metrics` to
`PUBLIC_PATHS_PREFIX` (or `PUBLIC_PATHS_EXACT`, exact match is sufficient since
there are no sub-paths).

### 2. Enforce METRICS_TOKEN in production

In `src/shared/config/env.ts` (`validateProductionSecrets()` or equivalent
startup validation), add: throw if `process.env.NODE_ENV === "production"` and
`METRICS_TOKEN` is unset/empty.

### 3. Add rate limiting to `/api/chat/stream`

`src/app/api/chat/stream/route.ts`: import `rateLimit` from
`src/shared/security/rate-limiter.ts` and call it before
`aiUsageGuard.assertAvailable()`, matching the pattern used in
`src/app/api/export/[id]/route.ts`. Use a limit appropriate for a streaming chat
endpoint (e.g. 10-20 requests/minute per user).

### 4. Tests

- `/api/metrics` without Bearer token → 401 (not 302 redirect)
- `/api/metrics` with correct Bearer token → 200
- `/api/chat/stream` exceeding rate limit → 429

## References

- `src/modules/auth/infrastructure/public-paths.ts`
- `src/shared/config/env.ts`
- `src/app/api/chat/stream/route.ts`
- `src/app/api/metrics/route.ts`
- `src/shared/security/rate-limiter.ts`
