---
description: Implementation plan for replacing Stripe with Razorpay
---

# TASK-0101: Replace Stripe with Razorpay

- **Status:** In Progress
- **Owner:** Devin
- **Requirement:** `docs/requirements/REQ-0101-razorpay-replacement.md`
- **Tracker:** `docs/trackers/TRACKER-0101-razorpay-replacement.md`
- **Module(s):** `workspaces`, `auth`, `app`
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — `REQ-0101`: Replace Stripe with Razorpay subscriptions, checkout, webhooks, and refunds.
- **Last updated:** 2026-08-12

## 1. Summary

Remove the `stripe` Node SDK and all Stripe-specific code. Add `razorpay` and implement `RazorpayPaymentGateway` behind the existing `PaymentGateway` port. Update billing use-cases, repositories, API routes, UI, tests, env config, and docs.

## 2. References

- Requirement: `docs/requirements/REQ-0101-razorpay-replacement.md`
- Architecture: `docs/specs/current-state.md` §4 (Payments)
- Payment port: `src/modules/workspaces/application/payment-gateway.ts`
- Billing service: `src/modules/workspaces/application/billing.ts`
- Coupon use-case: `src/modules/workspaces/application/saas-coupon.ts`
- Env config: `src/shared/config/env.ts`
- Schema: `prisma/schema.prisma`
- API routes: `src/app/api/stripe/*` → `src/app/api/razorpay/*`
- UI: `src/app/settings/billing/page.tsx`, `src/app/pricing/page.tsx`, `src/app/admin/payments/page.tsx`, `src/components/pricing-cards.tsx`
- Tests: `src/modules/workspaces/application/billing.test.ts`

## 3. Implementation Plan

### Step 1 — Schema and env migration

- Rename `User.stripeCustomerId` → `paymentCustomerId` in `prisma/schema.prisma`.
- Create Prisma migration `20260812161000_rename_stripe_customer_id`.
- Replace `STRIPE_*` env vars in `src/shared/config/env.ts` with `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_PRO`, `RAZORPAY_PLAN_BUSINESS`.
- Update `.env.example` and remove Stripe keys from CI workflow and `PRODUCTION_REQUIRED`.

### Step 2 — Payment gateway adapter

- Delete `src/modules/workspaces/infrastructure/stripe-payment-gateway.ts`.
- Add `src/modules/workspaces/infrastructure/razorpay-payment-gateway.ts`.
- Implement `PaymentGateway` with Razorpay Subscriptions + Checkout links:
  - `createCheckoutSession` creates a Razorpay subscription and returns `short_url`.
  - `createPortalSession` returns the Razorpay dashboard link for the customer.
  - `listInvoices` lists invoices/payments for a customer.
  - `createRefund` creates a Razorpay refund for a payment.
  - `constructWebhookEvent` validates HMAC-SHA256 signature and returns JSON body.

### Step 3 — Billing service rewrite

- Rewrite `src/modules/workspaces/application/billing.ts` to consume Razorpay webhook events.
- Map `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.pending`, `payment.failed` to plan changes.
- Remove Stripe-specific types (`Stripe.Event`, `Stripe.Subscription.Status`) and use string statuses.

### Step 4 — Repository and coupon updates

- Update `OrganizationRecord`/`OrganizationRepository` to use `paymentCustomerId`.
- Update `PrismaOrganizationRepository` mapping and `updatePlan` input.
- Update `OrganizationOverview` and `PrismaSaaSCouponRepository` to remove `stripeCouponId`/`stripePromotionCodeId`.
- Simplify `saas-coupon.ts`: local coupon validation only; stop creating Stripe coupons.

### Step 5 — API routes and public paths

- Move/rename `src/app/api/stripe/*` to `src/app/api/razorpay/*`.
- Update route handlers to call `billingService` with Razorpay-style headers (`x-razorpay-signature`).
- Update `PUBLIC_PATHS_EXACT` to include `/api/razorpay/webhook`.

### Step 6 — UI updates

- Update `/pricing`, `/settings/billing`, `/admin/payments`, `/admin/coupons` copy and links.
- Update `pricing-cards.tsx` and `manage-subscription-button.tsx`.
- Rename `manage-subscription-button.tsx` / keep it but link to Razorpay checkout.

### Step 7 — Tests and cleanup

- Rewrite `billing.test.ts` fake gateway to return Razorpay-shaped payloads.
- Update `invite-member.test.ts` and `public-paths.test.ts` if needed.
- Remove `scripts/backfill-past-due.ts` Stripe references or rewrite for Razorpay.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run build:worker`.

## 4. Subtasks

- [x] Schema + env migration.
- [x] Razorpay payment gateway adapter.
- [x] Billing service rewrite.
- [x] Repository and coupon cleanup.
- [x] API routes rename/update.
- [x] UI copy and link updates.
- [x] Tests and scripts cleanup.
- [x] Lint, typecheck, tests, build.

## 5. Acceptance Criteria

- [x] Matches `REQ-0101` acceptance criteria.
- [x] No `stripe` imports or `STRIPE_` env vars remain.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` and `docs/specs/current-state.md` updated.

## 6. Notes / Blockers

- Razorpay does not provide a self-service customer billing portal like Stripe; the settings page will redirect to the Razorpay dashboard or re-run checkout for plan changes.
- Coupon synchronization with Razorpay offers is out of scope for this iteration.
