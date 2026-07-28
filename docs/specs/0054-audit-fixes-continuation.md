# Spec 0054: Audit Fixes Continuation — Ship-Blocking Security & Correctness

- **Module(s):** Auth, Users, Organizations, eCommerce, Meta, Shared Infrastructure
- **Status:** Draft
- **Owner:** Devin
- **Related:** `docs/specs/0053-audit-fixes-production-readiness.md`, `docs/audit/2026-07-26-production-readiness-audit.md` (created by prior audit session)
- **Related task(s):** `docs/tasks/0054-audit-fixes-continuation-progress.md`

## 1. Summary

The prior audit (`docs/audit/2026-07-26-production-readiness-audit.md`) identified critical security, authorization, and business-logic issues. Spec `0053` described the intended fixes, but the repository still contains several unimplemented or partially implemented items that must be resolved before the application can safely serve production traffic. This spec records the remaining work in focused, reviewable PRs.

## 2. Goals

- Invalidate JWT sessions when passwords, roles, or super-admin status changes (`tokenVersion` verification).
- Ensure every server-side user object is fresh (DB-backed) so demotions and tenant changes take effect immediately.
- Store eCommerce and Meta integration access/refresh tokens encrypted at rest.
- Send Meta Graph API tokens in `Authorization` headers, not URL query strings.
- Tighten the Content-Security-Policy and other security headers.
- Correct NextAuth encrypted adapter coverage for `updateAccount`/`getUserByAccount`.
- Enforce SaaS plan limits (`monthlyAiReplies`, `teamSeats`) and make quota counters atomic.
- Scope staff users to their assigned store and prevent cross-store access.
- Add global route protection and user-facing error/loading/not-found boundaries.

## 3. Non-Goals

- No new product features or AI capabilities.
- No redesign of the in-memory event bus to a distributed broker (Redis-backed event bus is out of scope for this continuation; tracked separately).
- No migration away from NextAuth v5 beta.

## 4. User Stories

- As a user, when I reset my password or am demoted, my existing sessions become invalid.
- As a staff member, I can only see data for the store I am assigned to.
- As a paying customer, my workspace cannot exceed the AI reply and team-seat limits of my plan.
- As an operator, a database backup leak does not expose live Shopify/Meta tokens.

## 5. Domain Model / Schema

- `User.tokenVersion` already exists; `next-auth` `Session` and `JWT` already expose `tokenVersion`.
- `Integration.accessToken`/`refreshToken` remain string fields; encryption/decryption moves into the repository/connector layer.
- Add `Organization.aiRepliesUsed` and `Organization.aiRepliesResetAt` (or a dedicated `MonthlyAiUsage` aggregate) to enforce `monthlyAiReplies`.
- `User.storeId` already exists; `SessionUser` must carry it so staff scoping can be enforced.

## 6. Public Contract

- `auth.getCurrentUser()` returns a **fresh** `SessionUser` or `null`; callers may not assume the JWT role is current.
- `auth.requireRole(role)` and `auth.requireSuperAdmin()` continue to throw `ForbiddenError`/`UnauthorizedError` but internally use the fresh user.
- `ecommerce` public barrel continues to expose `connectStoreAction`, `syncProductsAction`, `generateCouponAction`; no breaking changes to signatures.
- `meta` public barrel continues to expose `processMetaWebhook`, `metaService`, `metaQueries`; no breaking changes to call sites.

## 7. API / UI Surface

### PR-1: Session invalidation & authorization freshness

- `getCurrentUser()` loads the canonical user record and verifies `tokenVersion` against the JWT.
- `requireRole()` and `requireSuperAdmin()` use the fresh user returned by `getCurrentUser()`.
- `resetPasswordAction` bumps `tokenVersion` (already done in `updatePassword`; ensure the action path uses it).
- `changeUserRole` and `toggleUserSuperAdmin` increment `tokenVersion`.
- Add `storeId` to `SessionUser` / `next-auth` JWT/session types.
- Update `tenantGuard.assertStoreAccess()` to enforce `storeId` when `role === 'STAFF'`.

### PR-2: Integration token encryption & external API security

- `IntegrationRepository` encrypts `accessToken`/`refreshToken` on write and decrypts on read.
- Connector factories receive plaintext tokens; they never persist them.
- Meta `GraphApiMetaService` moves `access_token` to the `Authorization` header and uses `URL` objects for all Graph API calls.
- `src/middleware.ts` generates a per-request nonce and sets the `Content-Security-Policy` header with `script-src 'self' 'nonce-<nonce>' 'strict-dynamic'` (plus `unsafe-eval` in dev only). `next.config.ts` removes the static CSP so the nonce-based version is the only one. The nonce is forwarded in an `x-nonce` request header and read by `src/app/layout.tsx` so Next.js can stamp its internal scripts/styles with the matching nonce. Static assets are excluded from middleware.
- `EncryptedPrismaAdapter` overrides `updateAccount`, `unlinkAccount`, and `getUserByAccount` to encrypt/decrypt token fields consistently.

### PR-3: Plan limits & atomic counters

- `createStore` plan-limit check becomes atomic (transaction with row lock or unique assertion).
- Add `Organization.aiRepliesThisMonth` and `Organization.aiRepliesResetAt` to the schema.
- Add `OrganizationRepository.incrementAIReplies(id, limit)` to atomically reset/verify/increment the monthly AI reply counter using a serializable transaction.
- Add `organizationUsage.incrementAIReplies(organizationId)` to the public `organizations` barrel; the `ai` generate-reply flow calls it before invoking the LLM and fails closed when the limit is reached.
- Add `teamSeats` enforcement when a user is added to an organization (requires an invite/add-member flow that does not yet exist; tracked as future work).
- `saas-coupon` usage becomes an atomic guarded update in `fulfillCheckout`.
- `VerificationToken.consume` becomes a single atomic `delete` returning the row.

### PR-4: Global guards & UX resilience

- Add `src/middleware.ts` enforcing authentication for protected route prefixes.
- Add `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`, `src/app/loading.tsx`.
- Add per-route skeleton/empty/error states for the highest-traffic paths.
- Add accessible form error associations and `aria-live` regions.

## 8. Security & Privacy

- No token, secret, or PII logging; redact all `logger`/`SystemLog` metadata values and messages.
- Encrypt all tokens at rest.
- Verify every session on every request; reject stale JWTs.

## 9. Testing Strategy

- Unit tests for `getCurrentUser`/`requireRole` with stale `tokenVersion` and changed role.
- Unit tests for `IntegrationRepository` encryption/decryption round-trip and legacy plaintext fallback.
- Integration tests for Meta/Shopify connector request headers and URL construction.
- E2E for password reset → old session rejected; role demotion → UI no longer shows admin controls.
- `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test` must pass.

## 10. Acceptance Criteria

- [ ] `getCurrentUser()` returns `null` after `tokenVersion` is bumped in the DB.
- [ ] Demoted user cannot call `requireRole('ADMIN')` or `requireRole('STORE_OWNER')` with an old session.
- [ ] `Integration.accessToken`/`refreshToken` values in the DB are prefixed/encrypted; connectors still work.
- [ ] Outbound Meta requests do not contain `access_token` in the URL.
- [x] CSP `script-src` uses per-request nonces and does not contain `unsafe-inline` or `unsafe-eval` (dev-only `unsafe-eval` is allowed).
- [ ] `monthlyAiReplies` is enforced for Free/Starter plans.
- [ ] `teamSeats` is enforced when adding members to an organization (pending invite flow).
- [ ] Staff users cannot access stores they are not assigned to.
- [ ] All CI-quality gates pass.
