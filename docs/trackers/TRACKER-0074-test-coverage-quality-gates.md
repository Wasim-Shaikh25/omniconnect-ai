# TRACKER-0074: Test Coverage and CI Quality Gates

- **Status:** In Progress
- **Owner:** All engineering
- **Requirement:** `docs/requirements/REQ-0074-test-coverage-quality-gates.md`
- **Task:** `docs/tasks/TASK-0074-test-coverage-quality-gates.md`
- **Last updated:** 2026-08-01

## 1. Summary

Addresses H8: 43 tests / 524 source files, zero coverage of auth, tenant guard, RBAC, billing,
webhooks, event bus, encryption, rate limiting, and all 168 server actions. Also fixes the CI gap
where `REDIS_URL` is set but no Redis service exists.

**Package A is the critical path — it unblocks `REQ-0067`'s C2/H6 tests.**

## 2. Subtasks

### Planning
- [x] Requirement reviewed and approved.
- [x] Decided: separate integration Vitest project (default: yes).
- [x] Decided: secret-scanning tool (default: gitleaks).
- [x] Branch created from `main`.

### Package A — CI infrastructure *(land first, standalone)*
- [x] `redis:7-alpine` service added with a health check.
- [x] `npm audit --audit-level=moderate` added as a CI step.
- [x] Secret scanning added on pull requests.
- [x] Smoke test asserts `/api/health` 200.
- [x] Smoke test asserts `/api/auth/session` 200 (C1).
- [x] Smoke test asserts `/api/ready` 200.
- [x] Smoke test asserts `POST /api/shopify/webhooks` is not 3xx (H9).
- [x] A Redis-dependent test verified green in CI.
- [x] Smoke test stabilized: uses `127.0.0.1` and `curl -4`, prints per-endpoint status and
  response bodies on failure, and masks generated CI secrets from logs.

### Package B — Coverage tooling
- [ ] `@vitest/coverage-v8` installed.
- [ ] `test:coverage` and `test:integration` scripts added.
- [ ] Coverage provider, reporters, includes/excludes configured.
- [ ] `vitest.integration.config.ts` added.
- [ ] Baseline measured after Tiers 1–2.
- [ ] Thresholds set and failing on regression.
- [ ] Coverage summary visible in CI output.

### Package C — Test helpers
- [ ] `createTenant`, `createSuperAdmin`, `resetDatabase` implemented.
- [ ] Meta / Shopify / Stripe payload signers implemented.
- [ ] `actingAs` session helper implemented.
- [ ] Integration database setup/teardown implemented.

### Tier 1 — Regression tests (authored in `REQ-0067`, verified here)
- [ ] T1 event published once → handler runs once.
- [ ] T2 two bus instances → one handler run each.
- [ ] T3 Redis unreachable → single local dispatch.
- [ ] T4 `/api/auth/session` 200 on standalone boot.
- [ ] T5 DB down → health 200, ready 503.
- [ ] T6 duplicate Stripe event → fulfilled once.
- [ ] T7 payment failed then succeeded → `active`.
- [ ] T8 portal downgrade reflected.
- [ ] T9 stale `tokenVersion` on export → 401.
- [ ] T10 soft-deleted user on export → 401.
- [ ] T11 project archive keeps row + members.
- [ ] T12 handler throws → retries → failed queue.
- [ ] T13 one of two handlers throws → other completes.
- [ ] T14 ten cart updates → one row, zero events.
- [ ] T15 anonymous Shopify webhook POST → 401/400.
- [ ] T16 concurrent invites → seat cap held.

### Tier 2 — Security invariants
- [ ] S1 cross-tenant read isolation (6 routes).
- [ ] S2 cross-tenant write isolation (all mutating actions).
- [ ] S3 `STAFF` store pinning.
- [ ] S4 `STAFF` denied owner-only mutations.
- [ ] S5 non-super-admin denied on all admin routes and actions.
- [ ] S6 `tokenVersion` revocation at every entry point.
- [ ] S7 invalid signatures rejected for all three providers.
- [ ] S8 login rate limiting engages.
- [ ] S9 encryption round-trip and tamper rejection.
- [ ] S10 logger redaction.
- [ ] S11 prompt-injection resistance.

### Package E — Documentation
- [ ] Testing skill documentation updated with local run instructions.
- [ ] `AGENTS.md` records the "new mutating action requires a cross-tenant test row" rule.

### Verification
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [ ] `npm run test:integration` passes.
- [x] `npm audit` reports 0 vulnerabilities.
- [x] `npm run build` passes.
- [x] `npm run build:worker` passes.
- [x] No test weakened or skipped to make CI pass.
- [x] No flaky tests left failing intermittently.
- [ ] `CHANGELOG.md` updated.

## 3. Acceptance Criteria

- [ ] All `REQ-0074` acceptance criteria are met.
- [ ] All verification steps above pass.

## 4. Notes / Blockers

- **Package A blocks `REQ-0067`.** Land it first and on its own.
- Tier 1 tests are authored with their fixes in `REQ-0067`; this tracker verifies they run green in
  CI.
- S2 (cross-tenant writes) covers a residual risk the audit explicitly did not test — treat it as
  the highest-value item in Tier 2.
