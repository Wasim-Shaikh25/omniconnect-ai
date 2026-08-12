---
description: Replace Stripe with Razorpay for billing and subscriptions
---

# REQ-0101: Replace Stripe with Razorpay

- **Status:** Done
- **Owner:** Devin
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0101-razorpay-replacement.md`
- **Related Tracker:** `docs/trackers/TRACKER-0101-razorpay-replacement.md`
- **Last updated:** 2026-08-12

## 1. Summary

Replace the existing Stripe subscription billing integration with Razorpay. Remove all Stripe SDK usage, environment variables, API routes, and UI copy. Keep plan lifecycle (upgrade/downgrade/cancel/refund/invoice) working through Razorpay Subscriptions, Checkout, Webhooks, and Refunds APIs.

## 2. Goals

- Remove `stripe` dependency and replace it with `razorpay`.
- Rename `stripeCustomerId` → `paymentCustomerId` (provider-neutral payment-provider customer id).
- Implement `RazorpayPaymentGateway` behind the existing `PaymentGateway` port.
- Map Razorpay webhook events to plan updates (`subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.pending`, `payment.failed`).
- Update checkout, portal, invoices, and webhook routes to use Razorpay.
- Keep the public `BillingService` contract unchanged so callers (settings page, admin refunds) continue to work.
- Preserve SaaS coupon validation; stop syncing coupons to a payment provider (Razorpay coupons/offers will be configured in Razorpay dashboard and referenced by env/plan config if needed in a follow-up).

## 3. Non-Goals

- One-time checkout Razorpay Orders (we keep subscription-first billing).
- Razorpay customer portal self-service UI (Stripe-style portal does not exist; settings page will offer upgrade/cancel via Razorpay checkout links and dashboard links).
- Full migration of historical Stripe data (only new subscriptions via Razorpay).

## 4. User Stories

- As a user, I can upgrade my workspace plan through a Razorpay checkout link.
- As a user, my plan is updated automatically when Razorpay confirms payment.
- As a super admin, I can view paid invoices and issue refunds from `/admin/payments`.
- As an operator, I can remove all Stripe keys from my environment.

## 5. Acceptance Criteria

- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` + `npm run build:worker` pass.
- [x] No `stripe` imports or `STRIPE_` env vars remain in source code.
- [x] `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_PRO`, `RAZORPAY_PLAN_BUSINESS` are documented in `.env.example` and read by `env.ts`.
- [x] Billing settings page and admin payments page still render and link to Razorpay checkout/dashboard.

## 6. Scope & Dependencies

- Modules: `workspaces` (billing, coupons), `auth` (public paths), `app` (pages/api routes).
- External APIs: Razorpay Subscriptions, Checkout, Webhooks, Refunds, Invoices.
- Supersedes Stripe-related config in `REQ-0049`, `REQ-0088`.

## 7. Open Questions

- Should `stripeCustomerId` be renamed to `razorpayCustomerId` or generic `paymentCustomerId`? Decision: use `paymentCustomerId` for provider neutrality.
