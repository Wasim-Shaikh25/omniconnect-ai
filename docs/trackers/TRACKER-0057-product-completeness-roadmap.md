# TRACKER-0057: Product Completeness Roadmap

- **Status:** In Progress
- **Requirement:** `docs/requirements/REQ-0057-product-completeness-roadmap.md`
- **Task:** `docs/tasks/TASK-0057-product-completeness-roadmap.md`
- **Module(s):** auth, organizations, ecommerce, meta, ai, coupons, crm, conversations, analytics, reports, notifications, shared/operations
- **Owner:** Devin
- **Changelog entry:** Closes product-completeness and operational-readiness gaps from `PRODUCTION_READINESS_AUDIT.md`.

## Description

Implement the full product-completeness roadmap derived from `PRODUCTION_READINESS_AUDIT.md` §4 and the residual-risk checklist. Work is phased so critical tenant-isolation fixes ship first, followed by entity lifecycles, data/analytics, and operations readiness.

## Subtasks

### Phase 1 — Critical staff and tenant isolation (8–12h)

- [x] **P1-1** — Add `storeId` to invite flow and user settings for `STAFF`/`ADMIN` users.
- [x] **P1-2** — Implement `requireStoreAccess` helper and apply to every `app/stores/[storeId]/**/page.tsx` and server action.
- [x] **P1-3** — Update `unifiedInboxQueries` and `listCustomersByOrganization` to accept `storeId` filter for staff.
- [x] **P1-4** — Add integration/E2E test proving a staff user cannot read another store's data.

### Phase 2 — Core entity lifecycle (12–18h)

- [x] **P2-1** — Store lifecycle: update, archive, restore, (soft) delete; add `archivedAt`/`deletedAt` migrations. Transfer deferred.
- [x] **P2-2** — Product lifecycle: edit product metadata, resync from Shopify, mark deleted products.
- [x] **P2-3** — Coupon lifecycle: edit discount/message, delete/disable with audit event.
- [x] **P2-4** — Organization-level dashboard for owners with multiple stores.
- [x] **P2-5** — Audit log entries for store/product/coupon lifecycle mutations.

### Phase 3 — Data, analytics, and AI hardening (18–26h)

- [x] **P3-1** — Implement `AIUsageGuard` and route all AI calls through it; add "quota exceeded" UX.
- [x] **P3-2** — Build Shopify order/customer/product sync worker with idempotency and `lastSyncedAt`.
- [x] **P3-3** — Fetch Meta page/audience/post insights and merge into `getMarketingPerformance`.
- [x] **P3-4** — Mark simulated analytics metrics with a data-quality badge until real data backs them.
- [x] **P3-5** — Add server-side pagination, search, and bulk actions to orders, customers, inbox, followers, products, notifications.

### Phase 4 — Platform, privacy, and operations (16–24h)

- [x] **P4-1** — GDPR/CCPA: request data export, generate JSON archive, soft-delete account with 30-day grace period and `/settings/account` UI.
- [x] **P4-2** — Team/invite lifecycle: revoke, resend invite, reassign store, seat-limit enforcement.
- [x] **P4-3** — Notification preferences and notification history UI.
- [x] **P4-4** — Encrypt `Integration.accessToken`/`refreshToken` at rest with backwards-compatible migration.
- [x] **P4-5** — Separate MFA and password-reset code storage/purposes.
- [x] **P4-6** — CI: add `npm run build`, `npm run build:worker`, and a `/api/health` smoke step.
- [x] **P4-7** — Add `/api/health` and `/api/ready`; initialize Sentry and OpenTelemetry at startup and in worker; wrap AI, Meta, and Shopify calls with spans.
- [x] **P4-8** — Write backup/DR runbook in `docs/operations.md`.

## Acceptance Criteria

- [x] Phase 1 acceptance: staff assignment and scoping tests pass.
- [x] Phase 2 acceptance: store/product/coupon lifecycle works end-to-end.
- [x] Phase 3 acceptance: AI guard, paginated lists, and analytics data sources functional.
- [x] Phase 4 acceptance: privacy features, CI changes, and observability routes in place.
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm audit` reports 0 vulnerabilities.
- [x] `npm run build` and `npm run build:worker` pass.
- [x] `CHANGELOG.md` updated.
- [x] `PRODUCTION_READINESS_AUDIT.md` residual risks and final recommendation updated.

## Notes / Blockers

- Phase 3 Meta/Shopify connectors depend on valid dev/prod credentials and rate-limit understanding.
- Phase 4 encryption migration needs a safe path for existing plaintext `Integration` tokens.
- Several `/stores/[storeId]/*` pages (affiliates, media kit, growth, UGC) are placeholders; the spec leaves the decision to implement vs. hide behind a feature flag as an open question.
