# TRACKER-0068: Medium-Severity Hardening

- **Status:** Todo
- **Owner:** Backend / Security / Frontend
- **Requirement:** `docs/requirements/REQ-0068-medium-severity-hardening.md`
- **Task:** `docs/tasks/TASK-0068-medium-severity-hardening.md`
- **Last updated:** 2026-07-31

## 1. Summary

Thirteen medium-severity findings (M1–M2, M4–M15) from `PRODUCTION_READINESS_AUDIT.md` §4. All
re-verified as open at `33e2e0b`. M11 is worse than the audit recorded — **no** admin page has a
page-level guard. M5 blocks a public Shopify App Store listing.

## 2. Subtasks

### Planning
- [ ] Requirement reviewed and approved.
- [ ] Q5 (Shopify App Store listing) confirmed — determines whether M5 is mandatory.
- [ ] Moderation provider chosen for M15.
- [ ] Global login-attempt budget confirmed for M10.
- [ ] Branch created from `main`.

### M1 — Readiness endpoint
- [x] `error` strings removed from the public body.
- [x] `readiness.failed` logged server-side with detail.
- [x] Shared Redis client `getSharedRedis()` reused.
- [x] `Cache-Control: no-store` set.
- [x] Per-IP rate limiting added.
- [x] Test: failing response contains no `error` key.

### M2 — Telemetry
- [x] Console exporter disabled in production when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset.
- [x] `telemetry.disabled` logged exactly once.
- [x] `OTEL_EXPORTER_OTLP_ENDPOINT` documented in `docs/deployment.md`.
- [x] Test passes.

### M4 — Inbox query
- [x] `listLatestByConversationIds` returns at most one row per conversation from the database.
- [x] `Message(conversationId, createdAt DESC)` index migrated.
- [x] Integration test asserts 3 conversations × 50 messages → 3 rows.
- [x] Unbounded `findMany(` inventory complete; all list-view methods now bound by `take`/pagination. Exceptions (`OrderRepository.sync`/`upsertMany` diff load, `data-export.ts` full workspace export) documented in `TASK-0068` M4.4.

### M5 — Shopify compliance
- [x] `customers/data_request` implemented (`src/modules/ecommerce/application/apply-shopify-webhook.ts:132-148`; `src/modules/ecommerce/infrastructure/shopify-compliance.repository.ts:10-68`).
- [x] `customers/redact` implemented with audit trail (`src/modules/ecommerce/application/apply-shopify-webhook.ts:150-173`; `src/modules/ecommerce/infrastructure/shopify-compliance.repository.ts:71-113`).
- [x] `shop/redact` implemented (`src/modules/ecommerce/application/apply-shopify-webhook.ts:155-167`; `src/modules/ecommerce/infrastructure/shopify-compliance.repository.ts:115-174`).
- [x] `app/uninstalled` implemented (disconnect, purge token, cancel jobs) (`src/modules/ecommerce/application/apply-shopify-webhook.ts:176-198`; `src/modules/ecommerce/infrastructure/shopify-compliance.repository.ts:176-192`).
- [x] All four idempotent via the shared webhook ledger (`src/modules/ecommerce/application/apply-shopify-webhook.ts:40-49`).
- [x] Tests for all four topics (`src/modules/ecommerce/application/apply-shopify-webhook.test.ts:174-239`; `src/modules/ecommerce/infrastructure/shopify-compliance.integration.test.ts`).
- [ ] Shopify automated compliance checks pass in a development store (requires a live development store and `SHOPIFY_API_SECRET`).

### M6 — Stripe API version
- [x] `apiVersion` pinned; `typescript: true` set.
- [x] ADR written in `docs/decisions/` (`docs/decisions/0007-stripe-api-version-pinning.md`).
- [x] `resolveSubscriptionId` verified against the pinned invoice shape (`billing.test.ts`).

### M7 — HTTP status codes
- [x] `require-store-access` converted to a pure predicate (`src/modules/organizations/presentation/require-store-access.ts`).
- [x] Page-body guards emit correct statuses; 24 `src/app/stores/[storeId]/**/page.tsx` files call `checkStoreAccess` and `notFound()`/`redirect("/login")` directly in the page body.
- [x] `/stores/{other-tenant}` → `404` verified by `scripts/check-http-status.ts`.
- [x] `/stores/does-not-exist` → `404` verified by `scripts/check-http-status.ts`.
- [x] `/admin/organizations` as non-admin → `307` verified by `scripts/check-http-status.ts`.
- [x] `scripts/check-http-status.ts` added and wired into CI smoke test (`.github/workflows/ci.yml`).
- [x] No data leaked on any probe; script asserts 404 bodies do not contain tenant/store names.

### M8 — Accessibility
- [ ] Skip link added as the first focusable element.
- [ ] `<main id="main-content" tabIndex={-1}>` added.
- [ ] Collapsed nav links have accessible names; icons `aria-hidden`.
- [ ] Mobile drawer uses a focus-trapping primitive with `Escape` and focus restore.
- [ ] Manual keyboard traversal verified and recorded.
- [ ] Colour contrast spot-checked.

### M9 — Encryption
- [ ] HKDF derivation implemented.
- [ ] `enc:v2:` versioned prefix implemented.
- [ ] `ENCRYPTION_KEY_PREVIOUS` dual-key decryption implemented.
- [ ] `scripts/reencrypt-credentials.ts` written and dry-run.
- [ ] Rotation procedure documented in `docs/operations.md`.
- [ ] `.env.example` placeholder replaced with a generation command.
- [ ] Plaintext-passthrough removal date recorded.
- [ ] Tests: v2 round-trip, legacy decrypt, previous-key decrypt, tampered ciphertext rejected.

### M10 — Login throttling
- [ ] Global per-account counter added.
- [ ] `RateLimitError` surfaced distinguishably in the UI.
- [ ] Message identical for existing and non-existing accounts.
- [ ] `RATE_LIMIT_IP_HEADER` required in production and documented.
- [ ] Tests: per-IP, global across rotating IPs, correct password during lockout.

### M11 — Admin guards
- [x] `requireSuperAdmin()` added to all six `/admin/**/page.tsx` files.
- [x] Layout guard retained in `src/app/admin/layout.tsx`.
- [x] `src/app/admin/admin-guards.test.ts` verifies every admin page calls `requireSuperAdmin` before any admin action.
- [x] Non-admin probes cannot reach admin data because the guard throws first.

### M13 — `/help` decision
- [x] `src/modules/auth/infrastructure/public-paths.test.ts` asserts `/help` is not public and anonymous requests redirect to `/login?callbackUrl=%2Fhelp`.
- [x] Decision recorded in `docs/specs/current-state.md`.

### M14 — `/support` routing
- [x] `/support` removed from `publicPaths`; the list is extracted to `src/modules/auth/infrastructure/public-paths.ts`.
- [x] Anonymous `/support` → `/login?callbackUrl=%2Fsupport` verified in `public-paths.test.ts`.
- [x] Authenticated `/support` access verified.
- [x] `docs/specs/current-state.md` corrected to note `/support` is authenticated-only.

### M15 — AI prompt safety
- [ ] `sanitizePromptFragment` added to the domain layer.
- [ ] Reply prompt rebuilt with labelled untrusted regions.
- [ ] Welcome prompt rebuilt.
- [ ] Moderation port + provider implemented.
- [ ] Flagged output withheld and escalated; logging carries no PII.
- [ ] Adversarial suite covers instruction override, delimiter injection, prompt exfiltration,
      unauthorised discount, abusive output.

### Verification
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm audit` reports 0 vulnerabilities.
- [ ] `npm run build` passes.
- [ ] `npm run build:worker` passes.
- [ ] Migrations apply cleanly with no drift.
- [ ] `CHANGELOG.md` updated.
- [ ] `docs/specs/current-state.md` updated.

## 3. Acceptance Criteria

- [ ] All `REQ-0068` acceptance criteria are met.
- [ ] All verification steps above pass.

## 4. Notes / Blockers

- M14 and `REQ-0067` H9 edit the same `publicPaths` array — sequence the commits.
- M6's pinned API version must match what `REQ-0067` H3 parses from `Invoice`.
- Removing `/support` from `publicPaths` (M14) without adding it to the sidebar (`REQ-0072`) makes
  the ticket flow undiscoverable — land them in the same release.
- M15 prompt changes alter AI behaviour; A/B against existing expected responses before rollout.
