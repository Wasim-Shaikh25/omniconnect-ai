# TRACKER-0054: Audit Fixes Continuation — Ship-Blocking Security & Correctness

- **Status:** In Progress
- **Requirement:** `docs/requirements/REQ-0054-audit-fixes-continuation.md`
- **Task:** `docs/tasks/TASK-0054-audit-fixes-continuation.md`
- **Module(s):** Auth, Users, Organizations, eCommerce, Meta, Shared Infrastructure
- **Owner:** Devin
- **Changelog entry:** Audit fixes continuation — session/token/CSP/plan-limit hardening (0054)

## Description

Implement the remaining ship-blocking issues identified in the 2026-07-26 production-readiness audit and described in `docs/requirements/REQ-0054-audit-fixes-continuation.md`. Work is split into small, focused PRs so each can be reviewed and tested independently.

## Subtasks / PR Plan

- [x] **PR-1: Session invalidation & authorization freshness**
  - [x] `getCurrentUser()` loads fresh DB record and verifies `tokenVersion`
  - [x] `requireUser()`/`requireRole()`/`requireSuperAdmin()` use fresh user
  - [x] `resetPasswordAction` bumps `tokenVersion` (via `updatePassword`)
  - [x] `changeUserRole` and `toggleUserSuperAdmin` increment `tokenVersion`
  - [x] Add `storeId` to `SessionUser` and next-auth JWT/session types
  - [x] `tenantGuard.assertStoreAccess()` enforces staff store scoping
  - [x] `getCurrentUser()` now returns fresh canonical user; call sites receive current role/storeId

- [x] **PR-2: Integration token encryption & external API security**
  - [x] Encrypt `Integration.accessToken`/`refreshToken` at rest in repository (already implemented in eCommerce/Meta integration repositories)
  - [x] Decrypt tokens when constructing connectors
  - [x] Meta Graph API uses `Authorization: Bearer <token>` header, not query string
  - [x] Shopify connector uses `URL` object and validates `*.myshopify.com` hostnames
  - [x] `EncryptedPrismaAdapter` covers `linkAccount`/`getAccount`; `updateAccount`/`unlinkAccount`/`getUserByAccount` are not part of the Auth.js `Adapter` interface and are not required

- [x] **PR-3: Plan limits & atomic counters**
  - [x] Atomic `createStore` plan-limit check (serializable transaction)
  - [x] Add `Organization` monthly AI reply counter + atomic increment/reset
  - [x] Enforce `monthlyAiReplies` in `ai` generate-reply flow
  - [ ] Enforce `teamSeats` in role-change/invite flows (blocked: no invite/add-member flow exists yet)
  - [x] Make `saas-coupon` usage increment atomic and guarded in `fulfillCheckout`
  - [x] Make `VerificationToken.consume` a single atomic `delete`

- [~] **PR-5: CSP nonce & final cleanup**
  - [x] Generate per-request nonce in `src/middleware.ts`
  - [x] Remove static CSP from `next.config.ts` and set `Content-Security-Policy` via middleware
  - [x] Forward `x-nonce` to `src/app/layout.tsx` and make root layout read `headers()` for dynamic rendering
  - [x] `script-src` uses `'nonce-...'` and `'strict-dynamic'`; `style-src` uses `'nonce-...'`; no `unsafe-inline`/`unsafe-eval` in production
  - [ ] `npm run lint/typecheck/test/build`

- [x] **PR-4: Global guards & UX resilience**
  - [x] Add `src/middleware.ts` for protected route prefixes
  - [x] Add `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx`
  - [x] Add skeleton/empty/error states for key dynamic routes
  - [x] Add accessible form error associations and `aria-live` regions

- [x] **Final Verification (PR-1/2 batch)**
  - [x] `npm run lint`
  - [x] `npm run typecheck`
  - [x] `npm run test`
  - [x] `npm run build`
  - [x] Update `CHANGELOG.md`

## Acceptance Criteria

- Matches `docs/requirements/REQ-0054-audit-fixes-continuation.md` acceptance criteria.
- All CI-quality gates pass.
- `CHANGELOG.md` updated with the completed work.

## Notes / Blockers

- The existing `docs/trackers/TRACKER-0053-audit-fixes.md` claimed completion, but the codebase was verified to still be missing several items (tokenVersion enforcement, integration token encryption, CSP hardening, Meta header usage, plan limits). This continuation task supersedes that stale tracker for the unimplemented items.
