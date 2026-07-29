---
description: Product Completeness Roadmap
---

# REQ-0057: Product Completeness Roadmap

- **Status:** Approved
- **Owner:** Devin
- **Module(s):** auth, organizations, ecommerce, meta, ai, coupons, crm, conversations, analytics, reports, notifications, shared/operations
- **Original spec path:** `docs/specs/0057-product-completeness-roadmap.md` (restructured)
- **Task:** `docs/tasks/TASK-0057-product-completeness-roadmap.md`
- **Tracker:** `docs/trackers/TRACKER-0057-product-completeness-roadmap.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0057-product-completeness-roadmap.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** auth, organizations, ecommerce, meta, ai, coupons, crm, conversations, analytics, reports, notifications, shared/operations
- **Status:** Approved
- **Owner:** Devin
- **Related task(s):** `docs/trackers/TRACKER-0057-product-completeness-roadmap.md`
- **Related ADR(s):** —
- **Last updated:** 2026-07-29

## 1. Summary

Close the product-completeness and operational-readiness gaps surfaced in `PRODUCTION_READINESS_AUDIT.md` so OmniConnect AI can move from a **CONDITIONAL GO** to a clear **GO** recommendation. The work is organized into four phases: (1) critical staff/tenant isolation fixes, (2) core entity lifecycle completion, (3) data/analytics/AI hardening, and (4) platform/operations readiness.

## 2. Goals

1. **Staff assignment and scoping** — make `STAFF` users assignable to a store and enforce that scoping on every store-scoped read and write path.
2. **Organization-level multi-store experience** — add an org dashboard for owners with multiple stores and an aggregated "all stores" view.
3. **Store / product / coupon lifecycle** — support update, soft-delete, archive, and (future) transfer for stores; enable product edit/resync and coupon edit/delete.
4. **Real analytics data** — replace synthesized `getMarketingPerformance` values with real Shopify order and Meta insights connectors, or clearly mark simulated metrics.
5. **AI usage hard cap** — centralize all AI paths behind an `AIUsageGuard` so plan limits cannot be exceeded.
6. **Scalable list views** — add server-side pagination, search, and bulk operations to orders, customers, conversations, followers, products, and notifications.
7. **Data rights** — implement user account deletion (soft-delete + grace period) and a JSON data export under `/settings`.
8. **Team/invite lifecycle** — allow owners to revoke, reassign store, and manage seats; add notification preferences and history.
9. **CI/CD and operations** — run `npm run build` + `build:worker` in CI, add `/health` and `/ready` routes, wire Sentry/OpenTelemetry, and document backups/DR.
10. **Security hardening** — encrypt `Integration.accessToken`/`refreshToken` at rest, separate MFA/reset code storage, and complete audit logging.

## 3. Non-Goals

- No new AI model, platform pivot, or mobile native app.
- No redesign of the NextAuth.js session or RBAC model.
- No live load/penetration testing; validation is functional only.
- No implementation of speculative features without a clear product signal (e.g., competitor benchmarking, brand-deals marketplace, UGC collection) unless explicitly promoted in scope.

## 4. User Stories

- As a **store owner**, I can add a staff member, assign them to a store, reassign them later, and revoke access so my team is scoped correctly.
- As a **staff member**, I only see the store I am assigned to and cannot view another store's customers, orders, or conversations.
- As a **store owner**, I can update, archive, or transfer a store and edit/resync products or coupons without filing a support ticket.
- As a **customer**, I can delete my account and export my data so the product meets GDPR/CCPA expectations.
- As a **platform owner**, CI builds the app and worker and runs smoke tests before any deployment.
- As an **operator**, I can see which analytics metrics are real versus simulated and trust the numbers for business decisions.

## 5. Domain Model

This spec introduces or extends the following concepts:

- `Store` — adds `archivedAt`, `deletedAt`, `transferredToOrganizationId` for soft lifecycle.
- `User` — adds `deletedAt`, `dataExportRequestedAt`, `dataExportExpiresAt`.
- `ExportRequest` (new) — tracks GDPR data-export jobs and result URLs.
- `AuditLog` (new) — append-only record of security-relevant actions (`store.transfer`, `user.delete`, `role.change`, `ai.quota.exceeded`).
- `NotificationPreference` (new) — per-user/email/channel preferences.
- Domain events:
  - `StoreArchived`, `StoreDeleted`, `StoreTransferred`
  - `UserAccountDeleted`, `DataExportRequested`, `DataExportReady`
  - `AIQuotaExceeded`, `StoreAssignedToUser`
  - `CouponUpdated`, `CouponDeleted`

## 6. Public Contract

- `organizations` module exposes:
  - `archiveStore(storeId)` / `restoreStore(storeId)`
  - `deleteStore(storeId)` (soft-delete)
  - `updateStore(storeId, { name, provider, domain })`
  - (future) `assignUserToStore(userId, storeId)` and `transferStore(storeId, targetOrganizationId)`
- `users` module exposes:
  - `changeUserStoreAction` / `setUserStore(userId, storeId)` for assigning staff to a store
- `ecommerce` module exposes:
  - `updateProduct(storeId, productId, patch)`
  - `resyncProducts(storeId)`
  - `getOrderAggregates(storeId, dateRange)`
  - `listOrdersPaginated(storeId, pagination, search?)` — fetches up to 250 orders from the connector, filters/search in memory, and returns `PaginatedResult<ConnectorOrder>`; used by `/stores/[storeId]/orders`.
- `coupons` module exposes:
  - `updateCoupon(couponId, patch)`
  - `deleteCoupon(couponId)`
- `ai` module exposes:
  - `AIUsageGuard.consume(token)` / `assertAvailable(organizationId)`
- `meta` module exposes:
  - `MetaService.getPageInsights(storeId, days?)` — page-level reach/impressions/profile views and account `followers_count`/`media_count` over the last N days.
  - `MetaService.getAudienceInsights(storeId)` — lifetime audience demographics (`audience_gender_age`, `audience_city`, `audience_country`, `audience_locale`).
  - `MetaService.getAccountMedia(storeId, limit?)` enriches each media object with `insights` (`engagement`, `impressions`, `reach`, `saved`, `profile_views`, `video_views`) where available.
- `analytics` module exposes:
  - `getMarketingPerformance(storeId, dateRange?)` merges Shopify order data, Meta page/audience insights, and media insights; surfaces `dataQuality` (`live`/`partial`/`simulated`).
- `ecommerce` / `crm` / `conversations` / `notifications` list queries accept `PaginationInput` and an optional `search` term; return `PaginatedResult<T>`.
  - `CustomerDirectory.listCustomersByOrganizationPaginated(...)` performs in-memory filtering and slicing for the customer directory.
  - `getUnifiedInboxAction(filter?, pagination?)` returns `PaginatedResult<InboxItem>`.
  - `EcommerceQueries.listProductsPaginated` / `listCouponsPaginated` use Prisma `skip`/`take` + `count`.
  - `FollowerRepository.listByStore` accepts `{ limit, offset?, search? }`.
  - `NotificationRepository.listForUser` accepts `{ limit, offset?, unreadOnly? }`.
- Bulk actions (`delete`, `archive`, `status`) are exposed as server actions over a list of IDs and write audit log entries.
- `shared/kernel` exposes:
  - `PaginationInput`, `PaginatedResult<T>`, `toSkip`, `paginatedResult` — reusable server-side pagination primitives.
- `users` module exposes:
  - `requestDataExport(userId)`
  - `deleteAccount(userId)` (soft-delete)
- `shared/operations` exposes:
  - `healthCheck()` / `readinessCheck()`

No other module may import these modules' internals; all cross-module access goes through the public barrels above or domain events.

## 7. Data / Persistence

- Add `archivedAt`, `deletedAt` nullable timestamps to `Store` and `User`.
  - `Store.listByOrganization` and `Store.findById` filter out soft-deleted records by default.
  - Store transfer is deferred until multi-organization billing is supported.
- Add `dataExportRequestedAt`, `dataExportExpiresAt`, `deletedReason` to `User`.
- Create `ExportRequest` table: `id`, `userId`, `status`, `expiresAt`, `downloadUrl`, `createdAt`, `completedAt`.
- `AuditLog` already exists; it records `USER_STORE_CHANGED`, `USER_ROLE_CHANGED`, store lifecycle actions.
- Create `NotificationPreference` table: `id`, `userId`, `channel`, `eventType`, `enabled`.
- Add index `@@index([storeId])` on `User` to speed up staff queries.
- Encrypt `Integration.accessToken` and `refreshToken` using the existing `encryptString`/`decryptString` helpers; migration must decrypt/re-encrypt existing rows or store plaintext behind a compatibility flag.

## 8. API / UI Surface

- `/settings` — add "Store assignment" dropdown when editing a `STAFF` member; add "Revoke access" and "Resend invite" actions.
- `/stores/[storeId]/settings` — new page for update, archive, transfer, delete store.
- `/stores/[storeId]/products/[productId]/edit` — product edit/resync UI.
- `/stores/[storeId]/coupons` — add edit/delete actions and status filters.
- `/settings/account` — "Export my data" and "Delete account" buttons with confirmation modals.
- `/settings/notifications` — notification preference toggles.
- `/admin/audit-logs` and `/admin/organizations` — paginated audit log and admin list views.
- `/api/health` and `/api/ready` — public health/readiness route handlers.
- Store-scoped pages (`/stores/[storeId]/**`) must call `requireStoreAccess(user, storeId)` and respect staff scope.

## 9. External Integrations

- **Shopify**: add background sync for orders, products, and customers using the Admin GraphQL/REST API; store `lastSyncedAt` per `Store`/`Integration`.
- **Meta**: fetch page/insights metrics for posts and audiences; handle rate limits and token refresh.
  - Page insights: `/{ig_user_id}?fields=followers_count,media_count` plus `/{ig_user_id}/insights?metric=impressions,reach,profile_views&period=day` summed over the requested window.
  - Audience insights: `/{ig_user_id}/insights?metric=audience_gender_age,audience_city,audience_country,audience_locale&period=lifetime`.
  - Post insights: `/{media_id}/insights?metric=engagement,impressions,reach,saved,profile_views,video_views&period=lifetime` merged into `MetaMediaItem.metrics`.
  - All calls are gated by token availability, bounded by `REQUEST_TIMEOUT_MS`, and log failures without exposing tokens.
- **OpenAI**: no new endpoints; all calls go through `AIUsageGuard`.
- **Sentry/OpenTelemetry**: initialize in `instrumentation.ts` and worker boot; no PII in events.

## 10. Edge Cases & Failure Modes

- Staff member with `storeId = null` is denied store-scoped access until assigned.
- Store archive must not delete data; archived stores are hidden from dashboards but remain in reports.
- Store transfer must move data to the target organization and invalidate old user sessions/tokens.
- Account deletion must soft-delete first with a 30-day grace period; hard-delete runs via a worker job after expiry.
- Export request must expire the download URL after 7 days and redact other users' PII from the JSON.
- AI quota exhaustion must return a clear user-facing error and not call OpenAI.
- Meta/Shopify sync failures must be retryable and logged; partial sync must not overwrite good data with empty data.
- Encrypted `Integration` tokens must be decryptable for existing rows after migration.

## 11. Security & Privacy

- Every store-scoped action and page revalidates `tenantGuard.assertStoreAccess(user, storeId)`.
- Staff read queries filter by `user.storeId` or use `tenantGuard` helpers.
- Audit log entries redact secrets/PII using `redactValue`.
- `Integration` tokens encrypted at rest; keys in environment, not in DB.
- Account deletion and data export require re-authentication and email confirmation.
- CSP and rate limits remain unchanged unless required by new client bundles.

## 12. Testing Strategy

- Domain unit tests for store lifecycle invariants and `AIUsageGuard`.
- Integration tests for repository pagination, staff scoping, and soft-delete behavior.
- E2E smoke tests for:
  - invite staff → assign store → staff only sees assigned store
  - owner archives a store
  - user exports data and deletes account
  - CI build + `/api/ready` returns 200
- Vitest/Playwright as used by the existing testing skill.

## 13. Acceptance Criteria (Definition of Done)

- [x] All store-scoped pages and server actions enforce staff `storeId` scoping.
- [x] Staff can be invited and assigned to a store from `/settings`.
- [x] Store, product, and coupon lifecycle mutations are functional and audited.
- [x] Analytics metrics are either backed by real Shopify/Meta data or explicitly marked simulated.
- [x] All AI entry points call `AIUsageGuard` and stop on quota exhaustion.
- [x] Orders, customers, conversations, followers, products, and notifications paginate and search server-side.
- [ ] Account deletion and data export are implemented and tested.
- [ ] GitHub Actions runs `npm run build`, `npm run build:worker`, and a smoke step.
- [x] `/api/health` and `/api/ready` exist; Sentry/OpenTelemetry not yet initialized.
- [ ] `Integration.accessToken`/`refreshToken` encrypted at rest.
- [x] `CHANGELOG.md` updated and `PRODUCTION_READINESS_AUDIT.md` residual risks revised (Phase 4 pending).

## 15. Phase 4 Implementation Notes

This section turns the open operational/privacy items into concrete, shippable changes.

- **P4-1 GDPR:** Add `deletedAt`, `dataExportRequestedAt`, `dataExportExpiresAt`, and `deletedReason` to `User`; create an `ExportRequest` table. Provide `requestDataExport(userId)` and `deleteAccount(userId)` (soft-delete with 30-day `DELETED_AT_GRACE_DAYS`) through the public `users` barrel. Add `/settings/account` UI with "Export my data" and "Delete account" flows that require re-authentication. The export JSON redacts other users' PII.
- **P4-2 Team lifecycle:** Add server actions to `revokeMember(userId)` (soft-delete user or set `organizationId`/`storeId` to null), `resendInvite(inviteId)` (refresh token and expiry), and enforce `planLimits(...).teamSeats` when inviting. Surface these actions on `/settings`.
- **P4-3 Notifications:** Create a `NotificationPreference` table (per user: `channel`, `eventType`, `enabled`) and expose `getNotificationPreferences` / `updateNotificationPreference` actions. Add `/settings/notifications` toggles and keep `/notifications` as the history view with "Mark all as read".
- **P4-4 Integration token encryption:** The existing `PrismaMetaIntegrationRepository` and `PrismaEcommerceIntegrationRepository` already `encryptString`/`decryptString` the `accessToken`. This item is satisfied; `refreshToken` will also be encrypted if/when a provider begins storing it.
- **P4-5 Code storage separation:** Add a `purpose` enum column to `VerificationToken` (or migrate to dedicated `MfaCode`/`PasswordResetToken` models) so MFA and password-reset codes are explicitly partitioned. Keep `identifier` as `purpose:email` and add `@@index([identifier, purpose])`.
- **P4-6 CI:** Extend `.github/workflows/ci.yml` with `npm run build` and `npm run build:worker` after tests, and a smoke step that starts the server and curls `/api/health`.
- **P4-7 Observability:** Install `@sentry/nextjs` and `@opentelemetry/api`, initialize Sentry in `instrumentation.ts` and the worker boot when `SENTRY_DSN` is present, and record OpenTelemetry traces around key AI/meta/ecommerce calls.
- **P4-8 Runbook:** Write `docs/operations.md` covering backups (PostgreSQL `pg_dump`, Redis `BGSAVE`), restore, rollback, dependency failure runbooks, and on-call escalation.

## 16. Open Questions

- Which currently linked `/stores/[storeId]/*` pages (affiliates, media kit, growth, UGC) should be implemented vs. removed/hidden behind feature flags?
- Should account deletion be a self-serve 30-day grace period, or require admin approval for organizations with active billing?
- Do we want real-time Shopify webhooks for order sync, or scheduled polling, or both?
