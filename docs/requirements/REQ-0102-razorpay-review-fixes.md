---
description: Address Razorpay review findings from PR #194
---

# REQ-0102: Address Razorpay review findings from PR #194

- **Status:** Implemented
- **Owner:** Devin
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0102-razorpay-review-fixes.md`
- **Related Tracker:** `docs/trackers/TRACKER-0102-razorpay-review-fixes.md`
- **Last updated:** 2026-08-12

## 1. Summary

PR #194 introduced the Razorpay billing integration. A follow-up review identified three concrete issues that must be fixed before the integration is production-ready: webhook event deduplication can collide on a 32-bit hash, the past-due backfill script downgrades customers whose payments are still retrying, and checkout accepts SaaS coupon codes without applying any discount.

## 2. Goals

- Use a collision-resistant webhook event identifier for Razorpay deduplication.
- Make the past-due backfill script respect retry states and use normalized subscription statuses.
- Stop accepting/consuming coupon codes at Razorpay checkout until a real discount path exists.

## 3. Non-Goals

- Full Razorpay Offers integration for percentage coupons.
- New subscription lifecycle events beyond those already handled.

## 4. User Stories

- As an operator, I can trust that every Razorpay webhook is processed exactly once without hash collisions.
- As a customer, my plan is not downgraded while Razorpay is still retrying a failed payment.
- As a customer, I am not charged full price and told my coupon was applied when it was not.

## 5. Acceptance Criteria

- [ ] Razorpay webhook deduplication uses the `x-razorpay-event-id` header or a SHA-256 of the raw body.
- [ ] `scripts/backfill-past-due.ts` retains the current plan for `created`, `authenticated`, `active`, `pending`, and `halted` Razorpay subscription statuses.
- [ ] `scripts/backfill-past-due.ts` normalizes Razorpay statuses to `active`, `past_due`, `canceled`, or `completed`.
- [ ] Checkout UI and API no longer accept or consume SaaS coupon codes.
- [ ] Help page billing copy no longer claims coupons are applied at Razorpay Checkout.
- [ ] All quality gates pass.

## 6. Scope & Dependencies

- Modules: `workspaces`, `app`.
- Files: `src/modules/workspaces/application/billing.ts`, `src/app/api/razorpay/webhook/route.ts`, `src/app/api/razorpay/checkout/route.ts`, `src/modules/workspaces/infrastructure/razorpay-payment-gateway.ts`, `src/components/pricing-cards.tsx`, `src/app/help/page.tsx`, `scripts/backfill-past-due.ts`, `src/modules/workspaces/application/billing.test.ts`.

## 7. Open Questions

- Should SaaS coupons be re-enabled at checkout once Razorpay Offers are integrated? (Deferred.)
