# TRACKER-0071: Billing and Monetization Completeness

- **Status:** Superseded — see REQ-0088
- **Owner:** Billing / Frontend
- **Requirement:** `docs/requirements/REQ-0071-billing-monetization-completeness.md`
- **Task:** `docs/tasks/TASK-0071-billing-monetization-completeness.md`
- **Last updated:** 2026-07-31

> **⚠️ SUPERSEDED (Platform V2)** — replaced by:
> - `docs/trackers/TRACKER-0088-billing-plans.md`
> Retained for historical reference only. Do not use for new implementation.

## 1. Summary

Builds the customer-facing billing surface missing per `PRODUCTION_READINESS_AUDIT.md` §3.4 and
§8.5: downgrade/cancel/resume, invoice history, payment-method management, usage and quota
visibility, dunning communication, and seat management.

## 2. Subtasks

### Planning
- [ ] Requirement reviewed and approved.
- [ ] Q3 (`past_due` access policy) confirmed and consistent with `REQ-0067` §5.
- [ ] B1 (downgrade timing) confirmed.
- [ ] B2 (downgrade below usage) confirmed.
- [ ] B3/B4 (Stripe as invoice source, portal for payment methods) confirmed.
- [ ] Branch created from `main`.

### Package A — Gateway port
- [ ] Port extended with plan change, cancel, resume, invoices, portal, payment method.
- [ ] Stripe implementation complete.
- [ ] `Organization.stripeCustomerId` confirmed or added and backfilled.
- [ ] Subscription-schedule vs item-swap decision recorded.

### Package B — Plan transitions
- [ ] `canDowngrade` domain logic implemented and unit-tested.
- [ ] `changePlan` application service implemented.
- [ ] Downgrade UI with confirmation and effective date.
- [ ] Ineligible downgrades blocked with an actionable message.
- [ ] Cancel at period end implemented with the end date shown.
- [ ] Resume implemented.
- [ ] RBAC enforced; audit entries written.

### Package C — Invoice history
- [ ] Invoice list implemented from Stripe.
- [ ] Hosted invoice page and PDF links present.
- [ ] Pagination and empty state handled.
- [ ] Stripe failure degrades gracefully and is logged.
- [ ] `Cache-Control: no-store` set on invoice routes.

### Package D — Payment methods
- [ ] Portal session route added with RBAC.
- [ ] "Manage payment methods" action wired with a correct return URL.
- [ ] Default payment method brand + last four displayed.

### Package E — Usage and quota
- [ ] `consumeAIReply` exactly-once audit completed and recorded.
- [ ] `UsageSnapshot` query implemented.
- [ ] `UsageMeter` built with normal / warning / blocked states.
- [ ] Usage surfaced on `/settings/billing` and `/dashboard`.
- [ ] Reset date matches the billing period.
- [ ] Quota arithmetic unit-tested including unlimited plans.

### Package F — Dunning
- [ ] Banner rendered for any non-active subscription status.
- [ ] "Update payment method" and "Retry payment" wired.
- [ ] Payment-failed and recovery emails added.
- [ ] Emails triggered from the H3 webhook handlers.
- [ ] Banner clears automatically on recovery.

### Package G — Seat management
- [ ] Team/seat view built with members and pending invites.
- [ ] Shared seats-used domain function used by both UI and server enforcement.
- [ ] Resend and revoke available from the members surface.
- [ ] Invite control disabled at the cap with an upgrade link.

### Verification
- [ ] Stripe test-mode integration: upgrade passes.
- [ ] Stripe test-mode integration: downgrade at period end passes.
- [ ] Stripe test-mode integration: cancel and resume pass.
- [ ] Stripe test-mode integration: portal round-trip passes.
- [ ] Failed-then-recovered payment clears the banner end to end.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm audit` reports 0 vulnerabilities.
- [ ] `npm run build` passes.
- [ ] `npm run build:worker` passes.
- [ ] `CHANGELOG.md` updated.
- [ ] `docs/specs/current-state.md` updated.

## 3. Acceptance Criteria

- [ ] All `REQ-0071` acceptance criteria are met.
- [ ] All verification steps above pass.

## 4. Notes / Blockers

- **Blocked for end-to-end verification** by `REQ-0067` H2 (idempotency) and H3 (lifecycle).
- **Depends on** `REQ-0068` M6 (pinned Stripe API version).
- The seats-used arithmetic must be shared with `REQ-0067` H10's server-side enforcement, or the
  UI will offer invites the server rejects.
