# TRACKER-0097: Observability Access & Rate Limiting Gaps

- **Status:** Implemented
- **Owner:** claude
- **Requirement:** `docs/requirements/REQ-0097-observability-rate-limiting.md`
- **Task:** `docs/tasks/TASK-0097-observability-rate-limiting.md`
- **Last updated:** 2026-08-07

## 1. Summary

`/api/metrics` is now reachable to unauthenticated Prometheus scrapers (bearer-token
auth still enforced at the route handler), `METRICS_TOKEN` is required in production,
and `/api/chat/stream` now has a per-request rate limit ahead of the AI quota guard.

## 2. Subtasks

- [x] `/api/metrics` added to public paths list (`PUBLIC_PATHS_EXACT`).
- [x] `validateProductionSecrets()` requires `METRICS_TOKEN` in production.
- [x] `/api/chat/stream` calls `rateLimit()` (15 req/min per user+IP) before the quota guard.
- [x] Tests: metrics 401 (missing/wrong token) vs 200 (correct token); chat/stream 429 on excess requests.
- [x] `npm run lint` passes.
- [x] `npx tsc --noEmit` passes.
- [x] `npm run test` passes (372 passed).
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.
