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
- [ ] `error` strings removed from the public body.
- [ ] `readiness.failed` logged server-side with detail.
- [ ] Shared Redis client reused (no per-request connection).
- [ ] `Cache-Control: no-store` set.
- [ ] Rate limiting added.
- [ ] Test: failing response contains no `error` key.

### M2 — Telemetry
- [ ] Console exporter disabled in production.
- [ ] `telemetry.disabled` logged once.
- [ ] `OTEL_EXPORTER_OTLP_ENDPOINT` documented.
- [ ] Test passes.

### M4 — Inbox query
- [ ] `DISTINCT ON` implementation landed.
- [ ] `Message(conversationId, createdAt DESC)` index migrated.
- [ ] Row-count test passes.
- [ ] Unbounded `findMany(` inventory completed.

### M5 — Shopify compliance
- [ ] `customers/data_request` implemented.
- [ ] `customers/redact` implemented with audit trail.
- [ ] `shop/redact` implemented.
- [ ] `app/uninstalled` implemented (disconnect, purge token, cancel jobs).
- [ ] All four idempotent via the shared webhook ledger.
- [ ] Tests for all four topics.
- [ ] Shopify automated compliance checks pass in a development store.

### M6 — Stripe API version
- [x] `apiVersion` pinned; `typescript: true` set.
- [x] ADR written in `docs/decisions/` (`docs/decisions/0007-stripe-api-version-pinning.md`).
- [x] `resolveSubscriptionId` verified against the pinned invoice shape (`billing.test.ts`).

### M7 — HTTP status codes
- [ ] `require-store-access` converted to a pure predicate.
- [ ] Page-body guards emit correct statuses.
- [ ] `/stores/{other-tenant}` → `404` verified.
- [ ] `/stores/does-not-exist` → `404` verified.
- [ ] `/admin/organizations` as non-admin → `307` verified.
- [ ] `scripts/check-http-status.ts` added and wired into CI.
- [ ] No data leaked on any probe.

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
- [ ] `requireSuperAdmin()` added to `/admin/page.tsx`.
- [ ] Added to `/admin/users/page.tsx`.
- [ ] Added to `/admin/organizations/page.tsx`.
- [ ] Added to `/admin/coupons/page.tsx`.
- [ ] Added to `/admin/tickets/page.tsx`.
- [ ] Added to `/admin/logs/page.tsx`.
- [ ] Guard-census test added.
- [ ] Non-admin probes (full + RSC) re-run on all six routes.

### M13 — `/help` decision
- [ ] Anonymous `GET /help` → `307` regression test added.
- [ ] Decision recorded in `docs/specs/current-state.md`.

### M14 — `/support` routing
- [ ] `/support` removed from `publicPaths`.
- [ ] Anonymous `/support` → `307` from middleware verified.
- [ ] Authenticated access verified.
- [ ] Role-to-capability matrix corrected.

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
