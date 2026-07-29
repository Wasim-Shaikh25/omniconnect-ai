# TRACKER-0053: Audit Fixes — Production Readiness

- **Status:** Done
- **Requirement:** `docs/requirements/REQ-0053-audit-fixes-production-readiness.md`
- **Task:** `docs/tasks/TASK-0053-audit-fixes-production-readiness.md`
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
  - [x] Scope `growth` repository mutations (`updateRights`, `markSent`, `markNotified`, `markReferred`, `incrementEarnings`) by `storeId`
  - [x] Scope `intelligence` `BusinessInsight`, `EntityLink`, and `DailyAction` mutations by `organizationId`
  - [x] Update presentation actions to pass `storeId`/`organizationId`
  - [x] Scope `intelligence` `Recommendation` and `ActionPlan` mutations by `organizationId`
  - [x] Scope remaining `intelligence` repository mutations (`Outcome`, `Goal`, `Prediction`, `Hypothesis`, `BusinessLearning`, `CompetitorInsight`, `DataQualityIssue`, `ActionOutcome`, `Journey`) by `organizationId`
- [x] PR-5: External API Security
  - [x] Validate Shopify `shopDomain` and add request timeout
  - [x] Encode Meta Graph API dynamic values and add request timeout
  - [x] Add `AbortSignal` timeout and defensive system prompt to OpenAI fetch
  - [x] Escape `commentUnlock` keyword before building regex
- [x] PR-6: In-Memory State Persistence
  - [x] Restrict `setRolloutGateAction` to `requireSuperAdmin()`
  - [x] Replace `IntelligenceFeedbackService` with Prisma repository
  - [x] Replace `IntelligenceFeedInteractionService` dismissal map with Prisma repository
  - [x] Replace `GoalPlanGenerationService` map with `GoalPlanVersion` repository
  - [x] Replace global `RolloutGate` with per-organization persisted setting
- [x] PR-7: Infrastructure & Security Hardening
  - [x] Add CSP header and `poweredByHeader: false`
  - [x] Fix header sign-out to use `signOut` action
  - [x] Enforce TLS in `SmtpEmailSender`
  - [x] Redact sensitive keys in logger
  - [x] Add Prisma indexes migration (core high-cardinality foreign keys)
  - [x] Resolve `npm audit` dev-dependency vulnerabilities
- [x] Final Verification
  - [x] `npm run lint`
  - [x] `npm run typecheck`
  - [x] `npm run test`
  - [x] `npm run build`
  - [x] `npm audit` clean
  - [x] Update `CHANGELOG.md`

## Acceptance Criteria

- [x] Matches `docs/requirements/REQ-0053-audit-fixes-production-readiness.md` acceptance criteria.
- [x] All CI-quality gates pass.
- [x] `CHANGELOG.md` updated with the completed work.

## Notes / Blockers

- PR-1 through PR-6 core fixes are implemented and pass lint/typecheck/tests/build.
- Growth tenant scoping and core Prisma indexes added in PR #60.
- Remaining `npm audit` cleanup is tracked in PR #61.
