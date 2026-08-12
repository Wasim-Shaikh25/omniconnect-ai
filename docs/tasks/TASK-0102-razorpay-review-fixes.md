---
description: Implementation plan for Razorpay review fixes
---

# TASK-0102: Razorpay review fixes

- **Status:** Done
- **Owner:** Devin
- **Requirement:** `docs/requirements/REQ-0102-razorpay-review-fixes.md`
- **Tracker:** `docs/trackers/TRACKER-0102-razorpay-review-fixes.md`
- **Module(s):** `workspaces`, `app`
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — `REQ-0102`: Fix Razorpay webhook deduplication, backfill status handling, and checkout coupon bug from PR #194 review.
- **Last updated:** 2026-08-12

## 1. Summary

Apply the three review findings from PR #194: replace the 32-bit webhook event fingerprint, correct the backfill script's retry-state handling and status normalization, and remove the checkout coupon flow that does not actually discount the Razorpay subscription.

## 2. References

- Requirement: `docs/requirements/REQ-0102-razorpay-review-fixes.md`
- Architecture: `docs/specs/current-state.md`
- Payment port: `src/modules/workspaces/application/payment-gateway.ts`
- Billing service: `src/modules/workspaces/application/billing.ts`
- Webhook route: `src/app/api/razorpay/webhook/route.ts`
- Checkout route: `src/app/api/razorpay/checkout/route.ts`
- Gateway: `src/modules/workspaces/infrastructure/razorpay-payment-gateway.ts`
- Backfill script: `scripts/backfill-past-due.ts`
- Pricing UI: `src/components/pricing-cards.tsx`
- Help copy: `src/app/help/page.tsx`
- Tests: `src/modules/workspaces/application/billing.test.ts`

## 3. Implementation Plan

### Step 1 — Webhook deduplication

Replace `computeEventId` in `billing.ts` with SHA-256 of the raw webhook body or thread `x-razorpay-event-id` from the route. Keep the `BillingService.fulfillCheckout` signature unchanged for consumers by hashing the payload inside the method.

### Step 2 — Backfill script

- Update `scripts/backfill-past-due.ts` `RETAINED_STATUSES` to include `created`, `authenticated`, `active`, `pending`, and `halted`.
- Add `normalizeSubscriptionStatus(razorpayStatus)` mapping to `active`, `past_due`, `canceled`, `completed`, and `unknown`.
- Write the normalized status instead of the raw provider status.

### Step 3 — Checkout coupon removal

- Remove `couponCode` from `CheckoutSessionInput` and `RazorpayPaymentGateway` notes/offer logic.
- Update `src/app/api/razorpay/checkout/route.ts` to reject/ignore `couponCode`.
- Remove the coupon input from `src/components/pricing-cards.tsx`.
- Remove `incrementCouponUsage` call from `billing.ts` and the related tests in `billing.test.ts`.
- Update `src/app/help/page.tsx` billing copy so it no longer says coupons are applied at Razorpay Checkout.

## 4. Subtasks

- [ ] Fix webhook deduplication.
- [ ] Fix backfill script statuses.
- [ ] Remove checkout coupon handling.
- [ ] Update help copy.
- [ ] Run lint/typecheck/tests/build.
- [ ] Update CHANGELOG.md.

## 5. Acceptance Criteria

- [ ] Matches `REQ-0102` acceptance criteria.
- [ ] No `stripe` imports or `STRIPE_` env vars reintroduced.
- [ ] Lint + typecheck + tests pass.
- [ ] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- Razorpay Offers API is not exposed through the Node SDK resource list, so applying real discounts is out of scope for this fix.
