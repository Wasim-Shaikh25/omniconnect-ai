# REQ-0074: Test Coverage and CI Quality Gates

- **Status:** Approved
- **Owner:** All engineering
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0074-test-coverage-quality-gates.md`
- **Related Tracker:** `docs/trackers/TRACKER-0074-test-coverage-quality-gates.md`
- **Source audit:** `PRODUCTION_READINESS_AUDIT.md` §4 H8, §6.1 (residual risks), §5 Phase 1 item 9
- **Remediation index:** `docs/audit/2026-07-31-remediation-index.md`
- **Last updated:** 2026-07-31

## 1. Summary

There are 43 tests across 9 files covering 524 source files, with **zero** coverage of
authentication, the tenant guard, RBAC, billing fulfillment, the event bus, any webhook route,
encryption, rate limiting, or any of the 168 server actions. Every Critical and High finding in the
audit sits in code with no test. A single "publish one event, assert the handler ran once" test
would have caught C2; a CI smoke test hitting `/api/auth/session` would have caught C1.

CI also provisions PostgreSQL but **no Redis**, while setting `REDIS_URL=redis://localhost:6379` —
so any Redis-dependent test added today fails against a non-existent server. There is no coverage
reporting, no coverage threshold, no `npm audit`, and no secret scanning.

This requirement establishes the safety net that makes every other requirement's fixes durable.

## 2. Verified current state (re-checked after `REQ-0067` H6/H7, 2026-08-01)

| Item | State | Evidence |
|---|---|---|
| Test files | 14+ | `find src -name "*.test.ts"` |
| Source files | 524 | `find src -name '*.ts' -o -name '*.tsx' \| wc -l` |
| Coverage tooling | ✅ | `@vitest/coverage-v8` in `package.json`; `coverage` block in `vitest.config.ts` |
| CI Redis service | ✅ | `.github/workflows/ci.yml` provisions `redis:7-alpine` with health check |
| `npm audit` in CI | ✅ | Runs `npm audit --audit-level=moderate` |
| Secret scanning in CI | ✅ | `gitleaks/gitleaks-action@v2` on pull requests |
| Smoke test depth | ✅ | Asserts `/api/health`, `/api/auth/session`, `/api/ready`, and `POST /api/shopify/webhooks` not `3xx` |
| Tested modules | `organizations` (billing, invite, queries), `intelligence` (journey, daily-action, objective), `ecommerce` (connectors, apply-shopify-webhook, abandoned-cart-sweep), `shared/events` | — |
| Untested | auth, tenant guard, RBAC, most webhook routes, encryption, rate limiting, most server actions | — |

## 3. Goals

- Every Critical and High fix from `REQ-0067` is protected by a test that fails without it.
- The security invariants the audit verified by hand (tenant isolation, admin authorization,
  session revocation, webhook signatures) are verified automatically on every push.
- CI can run Redis-dependent tests.
- Coverage is measured, reported, and ratcheted — never allowed to regress.
- Supply-chain and secret-leak checks run on every pull request.

## 4. Non-Goals

- A coverage percentage target for its own sake. Priority is risk, not percentage.
- Full end-to-end browser testing (Playwright) — recorded as a follow-up; the CI environment has a
  pre-installed Chromium if this is picked up later.
- Load and performance testing — `REQ-0075`.

## 5. Test tiers

### Tier 1 — Must exist before release (one per Critical/High finding)

| # | Test | Guards |
|---|---|---|
| T1 | Publish one event with one subscriber → handler runs exactly once | C2 |
| T2 | Two bus instances on one Redis → each handles once | C2 |
| T3 | Redis unreachable → local fallback dispatches exactly once | C2 |
| T4 | `/api/auth/session` returns 200 on a standalone production boot | C1 |
| T5 | Boot with an unreachable database → `/api/health` 200, `/api/ready` 503 | H1 |
| T6 | Duplicate Stripe `event.id` → fulfilled once, `usedCount` +1 once | H2 |
| T7 | `invoice.payment_failed` then `invoice.payment_succeeded` → status back to `active` | H3 |
| T8 | `customer.subscription.updated` with a Starter price on a Pro org → downgraded | H3 |
| T9 | Export route with a stale `tokenVersion` → 401 | H4 |
| T10 | Export route as a soft-deleted user → 401 | H4 |
| T11 | Archive keeps the project row and its members; archived excluded from lists | H5 |
| T12 | Handler throws → retried per policy → lands in the failed queue | H6 |
| T13 | Two handlers, one throws → the other still completes | H6 |
| T14 | Ten `checkouts/update` for one token → one cart row, zero events | H7 |
| T15 | Anonymous `POST /api/shopify/webhooks` → 401/400, never 3xx | H9 |
| T16 | `teamSeats + 5` concurrent invites → at most `teamSeats` pending | H10 |

### Tier 2 — Security invariants (automate what the audit did by hand)

| # | Test | Guards |
|---|---|---|
| S1 | Tenant A cannot **read** tenant B's store, products, analytics, conversations, coupons, settings | Verified control |
| S2 | Tenant A cannot **write** to tenant B's entities — every mutating action | Residual risk §6.1 |
| S3 | `STAFF` cannot access a store other than their pinned one | RBAC |
| S4 | `STAFF` cannot perform `STORE_OWNER`-only mutations | RBAC |
| S5 | Non-super-admin is denied on every admin route and every admin action | M11 |
| S6 | `tokenVersion` bump invalidates sessions at every entry point | Verified control |
| S7 | Invalid Meta / Shopify / Stripe signatures are rejected before any side effect | Verified control |
| S8 | Login rate limiting engages and blocks a correct password during the window | M10 |
| S9 | Encryption round-trips; a tampered ciphertext is rejected | M9 |
| S10 | Logger redacts tokens, passwords, secrets, cookies, emails, phone numbers | Verified control |
| S11 | Prompt-injection payloads do not alter AI system behaviour | M15 |

### Tier 3 — CI enforcement

- Coverage reporting with a threshold starting at the post-Tier-1/2 baseline, ratcheting upward.
- `npm audit --audit-level=moderate` as a build step.
- Secret scanning on every pull request.
- Redis service available to the test job.
- The smoke test asserts auth, readiness, and webhook reachability — not only `/api/health`.

## 6. Acceptance Criteria

- [x] `.github/workflows/ci.yml` provisions `redis:7-alpine` with a health check, alongside
      PostgreSQL.
- [x] `@vitest/coverage-v8` is installed and `vitest.config.ts` declares a coverage provider,
      reporters (`text`, `lcov`), and thresholds.
- [ ] Coverage thresholds are set to the measured baseline after Tiers 1 and 2 land, and CI fails
      on regression.
- [x] The coverage summary is visible in the CI job output.
- [ ] All 16 Tier 1 tests exist and pass; each was observed **failing** against pre-fix code.
- [ ] All 11 Tier 2 tests exist and pass.
- [x] `npm audit --audit-level=moderate` runs in CI and fails the build on a finding.
- [x] Secret scanning runs on every pull request.
- [x] The CI smoke test asserts: `/api/health` 200, `/api/auth/session` 200,
      `POST /api/shopify/webhooks` not 3xx, `/api/ready` 200.
- [x] Integration tests that need a database run against the CI PostgreSQL service with migrations
      applied.
- [x] A documented way to run the full suite locally exists in `AGENTS.md` or
      `.agents/skills/testing-omniconnect-ai/SKILL.md`, including the Docker commands for Postgres
      and Redis.
- [ ] Test helpers exist for the repeated setup: two isolated tenants, a super admin, an
      authenticated request, and a signed webhook payload per provider.
- [x] No test is weakened or skipped to make CI pass (`AGENTS.md` §3).
- [x] Flaky tests are fixed or quarantined with a linked issue, never left failing intermittently.

## 7. Scope & Dependencies

**Files:** `.github/workflows/ci.yml`, `vitest.config.ts`, `package.json`,
`src/**/*.test.ts` (new), `src/test/` helpers (new), `.agents/skills/testing-omniconnect-ai/SKILL.md`.

**Dependency direction:** the CI Redis service **blocks** `REQ-0067`'s C2/H6 tests. Land the CI
change first; it is a 15-minute edit that unblocks days of work.

Tier 1 tests are written as part of `REQ-0067` (each fix ships with its test). This requirement
owns the infrastructure, the Tier 2 security suite, and the enforcement.

## 8. Open Questions

1. Should integration tests run in the same Vitest project as unit tests, or a separate
   `vitest.integration.config.ts`? **Default: separate config and a separate CI step, so the fast
   unit suite stays fast.**
2. What initial coverage threshold? **Default: measure after Tiers 1–2, set the threshold at that
   number minus 2 points, then ratchet.**
3. Secret scanning tool? **Default: `gitleaks` as a GitHub Action — free, no external service.**
