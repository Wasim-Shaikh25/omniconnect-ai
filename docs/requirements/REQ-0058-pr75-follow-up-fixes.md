---
description: PR #75 Follow-up Blockers
---

# REQ-0058: PR #75 Follow-up Blockers

- **Status:** Implemented
- **Owner:** devin
- **Module(s):** auth, ecommerce, ui/settings
- **Original spec path:** `docs/specs/0058-pr75-follow-up-fixes.md` (restructured)
- **Task:** `docs/tasks/TASK-0058-pr75-follow-up-fixes.md`
- **Tracker:** `docs/trackers/TRACKER-0058-pr75-follow-up-fixes.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0058-pr75-follow-up-fixes.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** auth, ecommerce, ui/settings
- **Status:** Implemented
- **Owner:** devin
- **Related task(s):** [docs/trackers/TRACKER-0058-pr75-follow-up-fixes.md](../trackers/TRACKER-0058-pr75-follow-up-fixes.md)
- **Related PR:** [#75](https://github.com/Wasim-Shaikh25/omniconnect-ai/pull/75)
- **Last updated:** 2026-07-29

## 1. Summary

End-to-end testing of PR #75 surfaced four blockers that must be resolved before merge:
1. CI `quality` smoke step could not start the standalone server due to missing production env vars.
2. `syncProducts` intermittently soft-deleted all products it had just synced.
3. Account restoration during the 30-day deletion grace period was not implemented in the credentials sign-in path.
4. `/settings/account` rendered `<AccountActions />` twice and bulk-delete toolbars cleared selection before success feedback.

## 2. Goals

- Make the CI `quality` job green by providing the required production env vars and running the standalone server for the smoke test.
- Harden `syncProducts` so it never soft-deletes products that were just upserted in the same run.
- Allow a soft-deleted user to sign in within 30 days and have their account restored automatically.
- Show the `/settings/account` export and delete flows in separate cards, and keep the bulk-delete toolbar mounted long enough to display success feedback.

## 3. Non-Goals

- Re-architecting the full product sync or the grace-period cleanup scheduler.
- OAuth provider restoration (credentials path only).
- Hard-deleting accounts at the end of the grace period automatically in this change.

## 4. User Stories

- As a CI maintainer, I want the `quality` job to build the app and verify `/api/health` so the branch is green.
- As a store owner, I want to sync products without all of them disappearing.
- As a user who deleted their account by mistake, I want to sign back in within 30 days and restore my account.
- As a user, I want clear export and delete sections on `/settings/account`.
- As a user, I want to see a confirmation message after bulk-deleting products or coupons.

## 5. Domain Model

No schema changes. Reuses existing `User.deletedAt`, `User.tokenVersion`, `Product.deletedAt`, `Product.storeId_externalId` unique index.

## 6. Public Contract

- `auth/application/ports.ts`: `AccountRecord` includes `deletedAt`; `AccountRepository` adds `findByEmailIncludingDeleted` and `restoreAccount`.
- `ecommerce/application/ports.ts`: `ProductRepository` adds `sync(storeId, products)` which atomically upserts and soft-deletes stale products.
- UI: `AccountActions` accepts `mode?: "export" | "delete"`.

## 7. Data / Persistence

- `PrismaAccountRepository`: returns `deletedAt` on `AccountRecord`; `restoreAccount` sets `deletedAt: null` and increments `tokenVersion`.
- `PrismaProductRepository`: new `sync` method wraps `product.upsert` for each connector product and `product.updateMany` for stale products inside a single interactive transaction. Returns `{ upserted, removed }`.

## 8. API / UI Surface

- `auth/infrastructure/auth.ts` `authorize()` restores soft-deleted accounts within 30 days before issuing the session.
- `auth/presentation/actions.ts` `loginAction` uses `findByEmailIncludingDeleted` so deleted users are not rejected before NextAuth can restore them.
- `app/settings/account/page.tsx` renders one `<AccountActions mode="export" exports={exports} />` card and one `<AccountActions mode="delete" />` card.
- `components/account-actions.tsx` conditionally renders the export or delete UI based on `mode`.
- `components/product-list.tsx` and `components/coupon-list.tsx` `BulkDeleteToolbar` now uses `setTimeout(onClear, 3000)` after success so the success message is visible before the toolbar unmounts.

## 9. External Integrations

No external integration changes.

## 10. Edge Cases & Failure Modes

- `syncProducts` with an empty product list returns `0` upserted and `0` removed; stale products are not touched to avoid wiping a catalog.
- Concurrent `syncProducts` calls are isolated by the per-transaction `updateMany` against `externalId: { notIn: [...] }`.
- Credentials login for a deleted account past the 30-day grace period returns `null` from `authorize()`, appearing as an invalid password.
- Restoring an account invalidates existing sessions because `tokenVersion` is incremented.

## 11. Security & Privacy

- Restoration requires valid password and passes the same rate-limit/MFA gates as any credentials login.
- `tokenVersion` bump prevents session replay after restoration.
- No PII is logged in the new flows.

## 12. Testing Strategy

- Unit: existing domain tests; repository contract tests should be added for `sync` and `restoreAccount`.
- Integration: run `npm run lint`, `DATABASE_URL=... npm run typecheck`, `npm run test`, `npm audit`, `npm run build`, `npm run build:worker`.
- E2E: hand off to `testing_agent` after local quality gates pass.

## 13. Acceptance Criteria

- [x] CI `.github/workflows/ci.yml` includes all production env vars and runs `node .next/standalone/server.js` for the smoke test.
- [x] `ProductRepository.sync` performs upserts and stale deletion inside one Prisma transaction.
- [x] `syncProducts` returns `deleted: 0` for a fresh store with 6 mock products and the products remain `deletedAt: null`.
- [x] `authorize` restores a soft-deleted user within 30 days, increments `tokenVersion`, and issues a session.
- [x] `loginAction` allows deleted users to reach `authorize`.
- [x] `/settings/account` only shows one export card and one delete card.
- [x] Bulk-delete toolbar for products and coupons displays success feedback before clearing selection.
- [x] All quality gates pass: lint, typecheck, tests, audit, build, build:worker, smoke.

## 14. Open Questions

- Should we add a dedicated `/api/account/restore` endpoint or keep restoration through credentials sign-in? (Decision: credentials sign-in for now to match the existing UX.)
