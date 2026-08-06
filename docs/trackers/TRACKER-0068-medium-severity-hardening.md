# TRACKER-0068: Medium-Severity Hardening

- **Status:** Implemented
- **Owner:** Backend / Security / Frontend
- **Requirement:** `docs/requirements/REQ-0068-medium-severity-hardening.md`
- **Task:** `docs/tasks/TASK-0068-medium-severity-hardening.md`
- **Last updated:** 2026-08-06 (M5.7 deferred to production Shopify App Store submission)

## 1. Summary

Thirteen medium-severity findings (M1–M2, M4–M15) from `PRODUCTION_READINESS_AUDIT.md` §4. All
re-verified as open at `33e2e0b`. M11 is worse than the audit recorded — **no** admin page has a
page-level guard. M5 blocks a public Shopify App Store listing.

## 2. Subtasks

### Planning
- [x] Requirement reviewed and approved.
- [x] Q5 (Shopify App Store listing) confirmed — default: assume listing is intended; M5.7 deferred to app-store submission.
- [x] Moderation provider chosen for M15: OpenAI `text-moderation-latest` via `OpenAIProvider`.
- [x] Global login-attempt budget confirmed for M10: 20/hour per account.
- [x] Branch created from `main`.

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
- [d] Shopify automated compliance checks pass in a development store. — **Deferred**: requires a live Shopify development store, `SHOPIFY_API_SECRET`, and app review; recorded as a release-readiness task in `docs/operations.md`.

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
- [x] Skip link added as the first focusable element (`src/app/layout.tsx:40-45`).
- [x] `<main id="main-content" tabIndex={-1}>` added (`src/components/app-shell.tsx:76,277-278`).
- [x] Collapsed nav links have accessible names; icons `aria-hidden` (`src/components/app-shell.tsx:152-155`).
- [x] Mobile drawer uses a Radix `Dialog` primitive with `Escape` close and trigger focus restore (`src/components/app-shell.tsx:238-273`).
- [x] Manual keyboard traversal verified and recorded.
- [x] Colour contrast spot-checked.

### M9 — Encryption
- [x] HKDF derivation implemented (`src/shared/security/encryption.ts:20-41`).
- [x] `enc:v2:` versioned prefix implemented; legacy `enc:` still decrypts.
- [x] `ENCRYPTION_KEY_PREVIOUS` dual-key decryption implemented.
- [x] `scripts/reencrypt-credentials.ts` written.
- [x] Rotation procedure documented in `docs/operations.md`.
- [x] `.env.example` placeholder replaced with `openssl rand -base64 48`.
- [x] Plaintext-passthrough removal date recorded: **2026-09-01**.
- [x] Tests: v2 round-trip, legacy decrypt, previous-key decrypt, tampered ciphertext rejected.

### M10 — Login throttling
- [x] Global per-account counter (20/hour) added alongside per-IP limit (5/15min) (`src/modules/auth/infrastructure/login-rate-limit.ts`).
- [x] `RateLimitError` (code `rateLimit`) thrown from `authorize` and surfaced as "Too many attempts. Try again in N minutes." in `loginAction`.
- [x] Rate-limit message identical for existing and non-existing accounts; invalid credentials return the same generic message.
- [x] `RATE_LIMIT_IP_HEADER` added to `env.ts` `PRODUCTION_REQUIRED`, `.env.example`, and `docs/deployment.md`.
- [x] Tests cover per-IP engagement, global engagement across rotating IPs, and refusal of correct passwords during lockout.

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
- [x] `sanitizePromptFragment` / `escapePromptDelimiters` / `wrapUserMessage` / `wrapExternalData`
      added to the domain layer (`src/modules/ai/domain/prompt-safety.ts`).
- [x] Reply prompt rebuilt with labelled untrusted regions
      (`src/modules/ai/application/generate-reply.ts:146-172`).
- [x] Welcome prompt rebuilt (`src/modules/ai/application/generate-welcome.ts:33-43`).
- [x] `ContentModerator` port + `OpenAIProvider` moderation implementation
      (`src/modules/ai/application/content-moderation.ts`,
      `src/modules/ai/infrastructure/openai.provider.ts:159-208`).
- [x] Flagged output withheld and escalated; logging carries no PII
      (`src/modules/ai/application/generate-reply.ts:372-408`).
- [x] Adversarial suite covers instruction override, delimiter injection, prompt exfiltration,
      unauthorised discount, and abusive output (unit tests in `prompt-safety.test.ts`,
      `generate-reply.injection.test.ts`, `openai.provider.test.ts`).

### Verification
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm audit` reports 0 vulnerabilities.
- [x] `npm run build` passes.
- [x] `npm run build:worker` passes.
- [x] Migrations apply cleanly with no drift.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.

## 3. Acceptance Criteria

- [x] All `REQ-0068` acceptance criteria are met.
- [x] All verification steps above pass.

## 4. Notes / Blockers

- M14 and `REQ-0067` H9 edit the same `publicPaths` array — sequence the commits.
- M6's pinned API version must match what `REQ-0067` H3 parses from `Invoice`.
- Removing `/support` from `publicPaths` (M14) without adding it to the sidebar (`REQ-0072`) makes
  the ticket flow undiscoverable — land them in the same release.
- M15 prompt changes alter AI behaviour; A/B against existing expected responses before rollout.
