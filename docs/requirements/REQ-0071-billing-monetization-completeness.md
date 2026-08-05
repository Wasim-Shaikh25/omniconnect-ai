# REQ-0071: Billing and Monetization Completeness

- **Status:** Superseded — see REQ-0088
- **Owner:** Billing / Frontend
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0071-billing-monetization-completeness.md`
- **Related Tracker:** `docs/trackers/TRACKER-0071-billing-monetization-completeness.md`
- **Source audit:** `PRODUCTION_READINESS_AUDIT.md` §3.4 (usage/quota, billing history, seat view), §8.5, §8.9
- **Remediation index:** `docs/audit/2026-07-31-remediation-index.md`
- **Last updated:** 2026-07-31

> **⚠️ SUPERSEDED (Platform V2)** — replaced by:
> - `docs/requirements/REQ-0088-billing-plans.md`
> Retained for historical reference only. Do not use for new implementation.

## 1. Summary

Checkout works. Everything around it does not. A customer can upgrade but cannot downgrade or
cancel from the product — selecting a lower paid plan starts a *new* checkout instead of modifying
the existing Stripe subscription. There is no invoice list, no receipt, and no payment-method
management. A Free-plan user hits the "50 AI replies/month" ceiling with no way to see consumption
beforehand, even though the counters are already persisted. An organization pushed to `past_due` is
never told. Owners cannot see how many of their purchased seats are used.

`REQ-0067` (H2, H3) fixes the webhook correctness underneath this. This requirement builds the
customer-facing surface on top of it: self-service plan changes, billing history, usage visibility,
and dunning communication.

## 2. Verified current state (re-checked at commit `33e2e0b`, 2026-07-31)

| Capability | State | Evidence |
|---|---|---|
| Checkout creation | ✅ | `/api/stripe/checkout/route.ts` → `billingService.createCheckoutSession` |
| Successful fulfillment | ✅ | `billing.ts` handles `checkout.session.completed` with `payment_status === "paid"` |
| Upgrade plan | ✅ | `PricingCards` on `/settings/billing` |
| Downgrade / cancel | ❌ | No downgrade or cancel action; a lower plan starts a new checkout |
| Invoice / receipt history | ❌ | No invoice list, no receipts, no payment-method UI |
| `past_due` visible to the user | ❌ | Status is stored and never surfaced |
| `past_due` recovery | ❌ | `invoice.payment_succeeded` unhandled — fixed by `REQ-0067` H3 |
| Webhook idempotency | ❌ | No `event.id` dedup — fixed by `REQ-0067` H2 |
| Usage / quota dashboard | ❌ | AI reply counters persisted (`add_ai_reply_counters` migration), never displayed |
| Seat usage view | 🟡 | Invite and remove exist; no consolidated members list with seat count against the plan limit |
| Canceled-checkout feedback | 🟡 | `/settings/billing` shows a `canceled=1` alert |

## 3. Goals

- Every plan transition available at purchase is available in reverse, self-service.
- A customer can retrieve any invoice or receipt without contacting support.
- A customer always knows how much of their plan allowance they have consumed, before they hit the
  ceiling.
- A customer in `past_due` is told, told why, and given a one-click path to fix it.
- An owner can see seats used against seats purchased before inviting.
- No billing state exists in the product that the customer cannot see.

## 4. Non-Goals

- Stripe webhook correctness and idempotency — `REQ-0067` H2/H3.
- Tax, VAT/GST handling, or invoicing entity configuration (flagged as a follow-up).
- Usage-based / metered pricing.
- Multi-currency.
- Dunning email *content* design beyond a functional first version.

## 5. Product decisions required

| # | Question | Proposed default |
|---|---|---|
| Q3 | Does `past_due` restrict access? | **No** — retain the plan, show a persistent banner, restrict only on `customer.subscription.deleted`. Must match the `REQ-0067` §5 answer. |
| B1 | Downgrade timing | **At period end** (`cancel_at_period_end` / scheduled plan change), so the customer keeps what they paid for. |
| B2 | Downgrade below current usage (e.g. Pro → Starter with more seats than Starter allows) | **Block the downgrade** with a clear explanation of what must be reduced first. |
| B3 | Invoice source | **Stripe as the source of truth**, listed via the Stripe API. Do not mirror invoices into Postgres. |
| B4 | Payment-method management | **Stripe Customer Portal**, not a bespoke UI — less PCI surface, faster to ship. |

## 6. User Stories

- As a **store owner**, I downgrade or cancel my plan from settings without emailing support.
- As a **store owner**, I download any past invoice for my accountant.
- As a **store owner**, I update my card before my subscription lapses.
- As a **Free-plan user**, I see "38 of 50 AI replies used this month" so the cut-off is not a
  surprise.
- As a **store owner whose payment failed**, I see exactly what happened and can retry payment in
  one click.
- As a **store owner**, I see "4 of 5 seats used" before I invite someone.
- As a **store owner**, my plan reflects any change I make in the Stripe Customer Portal.

## 7. Acceptance Criteria

### 7.1 Plan changes (downgrade, cancel, resume)
- [ ] Selecting a lower paid plan modifies the **existing** Stripe subscription rather than
      creating a new checkout session.
- [ ] Downgrades take effect per B1 and the effective date is stated in the UI before confirming.
- [ ] Cancellation sets `cancel_at_period_end` and the UI shows the end date.
- [ ] A cancelled-but-not-yet-ended subscription can be resumed.
- [ ] Downgrading below current usage is blocked per B2 with a specific message naming what exceeds
      the target plan (seats, stores, or AI replies).
- [ ] Plan changes made in the Stripe Customer Portal are reflected in the product (depends on
      `REQ-0067` H3's `customer.subscription.updated` handler).
- [ ] Every plan change writes an `AuditLog` entry.
- [ ] Only `STORE_OWNER` and `ADMIN` can change the plan; `STAFF` cannot.

### 7.2 Billing history
- [ ] `/settings/billing` lists invoices (date, amount, status, period) fetched from Stripe.
- [ ] Each invoice links to its hosted invoice page and PDF.
- [ ] The list paginates and handles the no-invoices case.
- [ ] A Stripe API failure degrades gracefully with a retry affordance, not a crash.
- [ ] Invoice data is never cached in a way that outlives the session.

### 7.3 Payment methods
- [ ] A "Manage payment methods" action opens the Stripe Customer Portal with a correct return URL.
- [ ] The portal session is created server-side for the acting organization only.
- [ ] The default payment method's brand and last four digits are shown in-product.

### 7.4 Usage and quota visibility
- [ ] `/settings/billing` (and the dashboard) shows current-period usage against plan limits for
      AI replies, stores, and seats.
- [ ] The period boundary matches the billing period, and the reset date is shown.
- [ ] A warning appears at 80% consumption and a distinct blocking state at 100%.
- [ ] The blocked state names the limit hit and links to the upgrade path.
- [ ] Usage figures are read from the existing counters — no new counting mechanism.
- [ ] The counters' correctness is verified against `consumeAIReply` call sites.

### 7.5 Dunning and `past_due`
- [ ] A persistent banner appears for any organization not in `active`/`trialing`, naming the state.
- [ ] The banner offers a one-click "Update payment method" (portal) and "Retry payment".
- [ ] An email is sent on `invoice.payment_failed` and on recovery.
- [ ] Recovery clears the banner automatically (depends on `REQ-0067` H3).
- [ ] Access restriction follows Q3.

### 7.6 Seat management
- [ ] `/settings/team` (or the existing members surface) lists members with role, last active, and
      status.
- [ ] Seats used vs. seats purchased is displayed, counting active members plus pending invites —
      the same arithmetic the server enforces in `REQ-0067` H10.
- [ ] The invite control is disabled with an explanation when the cap is reached.
- [ ] Pending invites can be resent and revoked from this surface.

### 7.7 Cross-cutting
- [ ] All new server actions use `getCurrentUser()` and enforce RBAC.
- [ ] Stripe API calls are made server-side only; no secret key reaches the client.
- [ ] Every new Stripe read path handles the API being unavailable.
- [ ] Unit tests cover the downgrade-eligibility rules and quota arithmetic (pure domain logic).
- [ ] Integration tests cover: upgrade, downgrade at period end, cancel, resume, and the portal
      round-trip against Stripe test mode.

## 8. Scope & Dependencies

**Modules affected:** `organizations` (billing, usage, plan limits), `users` (seat view),
`notifications` (dunning emails), presentation under `src/app/settings/billing` and
`src/app/settings/team`.

**Depends on:**
- `REQ-0067` H2 (webhook idempotency) — without it, every surface here can display double-counted
  state.
- `REQ-0067` H3 (subscription lifecycle) — without it, `past_due` recovery and portal-initiated
  changes never reach the product.
- `REQ-0068` M6 (pinned Stripe API version) — invoice and subscription payload shapes.

**Blocked by nothing else.** UI work can proceed in parallel with the webhook fixes, but cannot be
verified end to end until they land.

## 9. Open Questions

1. Should annual plans exist? Not in scope, but the plan-change UI should not preclude them.
2. Should downgrade require a reason (churn analytics)? **Default: optional free-text, not
   required.**
3. Should a `past_due` organization keep receiving AI replies? Tied to Q3. **Default: yes, for the
   dunning window.**
