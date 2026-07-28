# Task 0053: Audit Fixes — Production Readiness

- **Status:** In Progress
- **Spec:** `docs/specs/0053-audit-fixes-production-readiness.md`
- **Module(s):** Auth, Users, Organizations, eCommerce, Meta, AI, CRM, Conversations, Growth, Intelligence, Support, Shared Infrastructure
- **Owner:** Devin
- **Changelog entry:** Audit-fixes production-readiness batch (0053)

## Description

Implement all findings from `docs/audit/2026-07-26-production-readiness-audit.md`. The work is split into focused PRs so each change can be reviewed and tested in isolation.

## Subtasks / PR Plan

- [x] PR-1: Auth & Session Hardening
  - [x] OAuth onboarding: emit `UserRegistered` in `signIn` event
  - [x] Fix `/login`/`/register` redirect to `/onboarding` when no `organizationId`
  - [x] Map `NEXTAUTH_SECRET` to `authConfig.secret`
  - [x] Add `tokenVersion` to `User` and invalidate sessions on password reset
  - [x] Rate-limit MFA / reset-code requests
  - [x] Single active `VerificationToken` per email/purpose
  - [x] Console email sender masks codes/links
- [x] PR-2: RBAC & User Module
  - [x] Remove `setUserSuperAdmin` / `changeUserRole` from public barrel
  - [x] Enforce role hierarchy and self-demotion guard in `changeUserRole`
  - [x] Align `isSuperAdmin` with DB flag
  - [x] Re-validate role in `requireRole` for mutating actions
- [x] PR-3: Stripe Billing & Coupons
  - [x] Set top-level `metadata` in checkout session (plan + organizationId)
  - [x] Fulfill plan update from `session.metadata.plan`
  - [x] Move coupon usage increment to webhook fulfillment
  - [x] Handle `customer.subscription.deleted` / `invoice.payment_failed`
  - [x] Return correct webhook HTTP status codes
  - [x] Auth-gate `applyCouponToCheckoutAction` / `incrementCouponUsageAction`
- [x] PR-4: IDOR / Tenant Scoping
  - [x] Scope `conversations` repository mutations by `storeId`
  - [x] Scope `support` repository mutations by `organizationId`
  - [x] Scope `crm` repository mutations by `storeId`
  - [x] Scope `projects` archive / member removal by `organizationId`
  - [x] Scope `intelligence` `BusinessInsight`, `EntityLink`, and `DailyAction` mutations by `organizationId`
  - [x] Update presentation actions to pass `storeId`/`organizationId`
  - [ ] Remaining `growth` repository mutations (`markSent`, `markNotified`, `markReferred`, `incrementEarnings`)
  - [ ] Remaining `intelligence` repository mutations (`Recommendation`, `ActionPlan`, `Outcome`, `Goal`, `Prediction`, `Hypothesis`, `CompetitorInsight`, `DataQualityIssue`)
- [x] PR-5: External API Security
  - [x] Validate Shopify `shopDomain` and add request timeout
  - [x] Encode Meta Graph API dynamic values and add request timeout
  - [x] Add `AbortSignal` timeout and defensive system prompt to OpenAI fetch
  - [ ] Escape `commentUnlock` keyword before building regex
- [~] PR-6: In-Memory State Persistence
  - [x] Restrict `setRolloutGateAction` to `requireSuperAdmin()`
  - [ ] Replace `IntelligenceFeedbackService` with Prisma repository
  - [ ] Replace `IntelligenceFeedInteractionService` dismissal map with Prisma repository
  - [ ] Replace `GoalPlanGenerationService` map with `GoalPlanVersion` repository
  - [ ] Replace global `RolloutGate` with per-organization persisted setting
- [~] PR-7: Infrastructure & Security Hardening
  - [x] Add CSP header and `poweredByHeader: false`
  - [x] Fix header sign-out to use `signOut` action
  - [x] Enforce TLS in `SmtpEmailSender`
  - [x] Redact sensitive keys in logger
  - [ ] Add Prisma indexes migration
  - [ ] Resolve `npm audit` dev-dependency vulnerabilities
- [x] Final Verification (partial)
  - [x] `npm run lint`
  - [x] `npm run typecheck`
  - [x] `npm run test`
  - [x] `npm run build`
  - [ ] `npm audit` clean
  - [ ] Update `CHANGELOG.md`

## Acceptance Criteria

- [ ] Matches `docs/specs/0053-audit-fixes-production-readiness.md` acceptance criteria.
- [ ] All CI-quality gates pass.
- [ ] `CHANGELOG.md` updated with the completed work.

## Notes / Blockers

- PR-1 through PR-5 core fixes are implemented and pass lint/typecheck/tests/build.
- PR-6 full persistence and PR-7 Prisma indexes / `npm audit` fixes are deferred to a follow-up pass.
