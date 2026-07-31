# TASK-0071: Implement Billing and Monetization Completeness

- **Status:** Todo
- **Owner:** Billing / Frontend
- **Requirement:** `docs/requirements/REQ-0071-billing-monetization-completeness.md`
- **Tracker:** `docs/trackers/TRACKER-0071-billing-monetization-completeness.md`
- **Module(s):** `organizations`, `users`, `notifications`
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Self-service downgrade/cancel, invoice history, payment-method portal, usage/quota visibility, dunning banner, seat management.
- **Last updated:** 2026-07-31

## 1. Summary

Six work packages built on the payment gateway port. Package A extends the gateway contract;
everything else consumes it. All Stripe calls stay in `infrastructure`; the application layer sees
only the port, per `AGENTS.md` §1.

## 2. References

- Audit: `PRODUCTION_READINESS_AUDIT.md` §3.4, §8.5, §8.9
- Requirement: `docs/requirements/REQ-0071-billing-monetization-completeness.md`
- Depends on: `docs/tasks/TASK-0067-release-blockers-critical-high.md` (H2, H3),
  `docs/tasks/TASK-0068-medium-severity-hardening.md` (M6)
- Existing code: `src/modules/organizations/application/billing.ts`,
  `src/modules/organizations/infrastructure/stripe-payment-gateway.ts`,
  `src/app/settings/billing/`, `src/modules/organizations/domain/plan-limits.ts`

## 3. Implementation Plan

---

### Package A — Extend the payment gateway port

**Files:** `src/modules/organizations/domain/payment-gateway.ts` (port),
`src/modules/organizations/infrastructure/stripe-payment-gateway.ts`

```typescript
export interface PaymentGateway {
  createCheckoutSession(input: CreateCheckoutInput): Promise<{ url: string }>;

  // New:
  changeSubscriptionPlan(input: {
    subscriptionId: string;
    priceId: string;
    effective: "immediate" | "period_end";
  }): Promise<{ effectiveAt: Date }>;

  cancelSubscription(input: { subscriptionId: string; atPeriodEnd: boolean }): Promise<{ endsAt: Date }>;
  resumeSubscription(input: { subscriptionId: string }): Promise<void>;

  listInvoices(input: { customerId: string; limit: number; startingAfter?: string }): Promise<InvoiceSummary[]>;
  createPortalSession(input: { customerId: string; returnUrl: string }): Promise<{ url: string }>;
  getDefaultPaymentMethod(input: { customerId: string }): Promise<{ brand: string; last4: string } | null>;
}
```

Stripe implementation notes:

```typescript
async changeSubscriptionPlan({ subscriptionId, priceId, effective }) {
  const subscription = await this.client.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) throw new PaymentGatewayError("subscription has no items");

  const updated = await this.client.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: priceId }],
    // Downgrades take effect at period end so the customer keeps what they paid for (B1).
    proration_behavior: effective === "immediate" ? "create_prorations" : "none",
    billing_cycle_anchor: "unchanged",
  });
  return { effectiveAt: new Date(updated.current_period_end * 1000) };
}
```

For a true scheduled downgrade, prefer a Stripe **subscription schedule** over an immediate item
swap with `proration_behavior: "none"` — the schedule expresses "switch at period end" natively.
Record the chosen mechanism in §6.

`Organization` must store `stripeCustomerId` for the portal and invoice list. Confirm the column
exists; if not, add it in this package's migration and backfill from the subscription.

---

### Package B — Downgrade, cancel, resume

**Files:** `src/modules/organizations/application/change-plan.ts` (new),
`src/modules/organizations/domain/plan-transition.ts` (new, pure),
`src/app/settings/billing/page.tsx`, `PricingCards`

Eligibility is pure domain logic and must be unit-testable without Stripe:

```typescript
// src/modules/organizations/domain/plan-transition.ts
export type BlockedReason =
  | { kind: "seats"; used: number; allowed: number }
  | { kind: "stores"; used: number; allowed: number }
  | { kind: "ai_replies"; used: number; allowed: number };

export function canDowngrade(
  target: Plan,
  usage: { seats: number; stores: number; aiReplies: number },
): { ok: true } | { ok: false; reasons: BlockedReason[] } {
  const limits = planLimits(target);
  const reasons: BlockedReason[] = [];
  if (limits.teamSeats !== null && usage.seats > limits.teamSeats) {
    reasons.push({ kind: "seats", used: usage.seats, allowed: limits.teamSeats });
  }
  if (limits.maxStores !== null && usage.stores > limits.maxStores) {
    reasons.push({ kind: "stores", used: usage.stores, allowed: limits.maxStores });
  }
  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}
```

UI: the plan card for a lower tier becomes "Downgrade", opens a confirmation dialog stating the
effective date, and — when blocked — lists exactly what must be reduced ("You have 7 members;
Starter allows 3. Remove 4 members to downgrade.").

Cancel: `cancelSubscription({ atPeriodEnd: true })`, show the end date, offer "Resume".

Every transition writes an `AuditLog` entry and is restricted to `STORE_OWNER`/`ADMIN`.

---

### Package C — Invoice history

**Files:** `src/modules/organizations/application/queries.ts`,
`src/app/settings/billing/invoices/` (or a section of the billing page)

```typescript
const invoices = await deps.payments.listInvoices({
  customerId: organization.stripeCustomerId,
  limit: 12,
});
```

Render date, description/period, amount with currency, status badge, and links to
`hosted_invoice_url` and `invoice_pdf`. Stripe is the source of truth (B3) — do **not** mirror
invoices into Postgres.

Failure handling: catch gateway errors, render "Billing history is temporarily unavailable" with a
retry, and log `billing.invoices.fetchFailed`. Never render a stack trace.

Add `Cache-Control: no-store` on any route that returns invoice data.

---

### Package D — Payment methods via the Customer Portal

**Files:** `src/app/api/stripe/portal/route.ts` (new), billing page

```typescript
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  await requireRole(user, "STORE_OWNER");

  const organization = await organizationsService.findById(user.organizationId);
  if (!organization?.stripeCustomerId) {
    return NextResponse.json({ error: "no_subscription" }, { status: 400 });
  }

  const { url } = await payments.createPortalSession({
    customerId: organization.stripeCustomerId,
    returnUrl: `${env.APP_URL}/settings/billing`,
  });
  return NextResponse.json({ url });
}
```

Show the default payment method's brand and last four digits in-product via
`getDefaultPaymentMethod`. Never handle raw card data.

---

### Package E — Usage and quota visibility

**Files:** `src/modules/organizations/application/usage.ts`,
`src/components/usage-meter.tsx` (new), `/settings/billing`, `/dashboard`

Read the existing counters (from the `add_ai_reply_counters` migration) — do not introduce a second
counting mechanism. First, verify correctness:

```bash
grep -rn "consumeAIReply\|aiReplyCount" src/modules
```

Confirm every AI generation path increments exactly once, that the period boundary matches the
billing period, and that the reset is driven by a scheduled job or computed from the period start.
Record findings in §6.

```typescript
export interface UsageSnapshot {
  aiReplies: { used: number; limit: number | null; resetsAt: Date };
  stores: { used: number; limit: number | null };
  seats: { used: number; limit: number | null }; // active members + pending invites
}
```

`UsageMeter` renders a labelled bar with three states: normal, warning (≥80%), blocked (100%). The
blocked state names the limit and links to upgrade. `limit: null` renders "Unlimited" with no bar.

---

### Package F — Dunning banner and emails

**Files:** `src/components/billing-banner.tsx` (new), app shell,
`src/modules/notifications/` templates

```tsx
// Rendered in the authenticated shell for any non-active status.
if (organization.subscriptionStatus === "past_due") {
  return (
    <Banner variant="warning">
      We could not charge your card. Your plan stays active while we retry.
      <Button onClick={openPortal}>Update payment method</Button>
    </Banner>
  );
}
```

Emails: one on `invoice.payment_failed` and one on recovery, both triggered from the webhook
handlers in `REQ-0067` H3. Neither may include card details.

Recovery clears the banner automatically because `invoice.payment_succeeded` restores `active`.

---

### Package G — Seat management view

**Files:** `src/app/settings/team/page.tsx` (new or extend the existing members surface),
`src/modules/organizations/application/queries.ts`

List active members (name, email, role, store, last active) and pending invites (email, role, sent,
expires) with resend/revoke actions. Header shows `seatsUsed / teamSeats`, computed with **the same
arithmetic the server enforces** in `REQ-0067` H10 (active users + pending invites) — extract it
into one shared domain function so the two cannot diverge.

Disable the invite control at the cap with an explanatory message and an upgrade link.

---

## 4. Subtasks

- [ ] **A.1** Extend the `PaymentGateway` port with plan change, cancel, resume, invoices, portal, and payment method.
- [ ] **A.2** Implement all new methods in `StripePaymentGateway`.
- [ ] **A.3** Confirm/add `Organization.stripeCustomerId`; backfill if added.
- [ ] **A.4** Decide subscription-schedule vs item-swap for scheduled downgrades; record it.
- [ ] **B.1** Add pure `canDowngrade` / `planTransition` domain logic with unit tests.
- [ ] **B.2** Implement `changePlan` application service.
- [ ] **B.3** Convert lower-tier plan cards to a downgrade flow with a confirmation dialog and effective date.
- [ ] **B.4** Block ineligible downgrades with a specific, actionable message.
- [ ] **B.5** Implement cancel (`cancel_at_period_end`) with the end date shown.
- [ ] **B.6** Implement resume for a cancelled-but-active subscription.
- [ ] **B.7** Restrict all transitions to `STORE_OWNER`/`ADMIN`; write audit entries.
- [ ] **C.1** Implement `listInvoices` and the billing-history UI.
- [ ] **C.2** Link hosted invoice pages and PDFs.
- [ ] **C.3** Handle pagination and the empty state.
- [ ] **C.4** Degrade gracefully on Stripe API failure; log `billing.invoices.fetchFailed`.
- [ ] **C.5** Set `Cache-Control: no-store` on invoice routes.
- [ ] **D.1** Add the portal session route with RBAC.
- [ ] **D.2** Add the "Manage payment methods" action with a correct return URL.
- [ ] **D.3** Display the default payment method brand and last four.
- [ ] **E.1** Audit `consumeAIReply` call sites for exactly-once counting; record findings.
- [ ] **E.2** Implement the `UsageSnapshot` query.
- [ ] **E.3** Build `UsageMeter` with normal / warning / blocked states.
- [ ] **E.4** Surface usage on `/settings/billing` and `/dashboard`.
- [ ] **E.5** Show the reset date matching the billing period.
- [ ] **E.6** Unit-test the quota arithmetic including `limit: null`.
- [ ] **F.1** Build the dunning banner for non-active statuses.
- [ ] **F.2** Wire "Update payment method" and "Retry payment".
- [ ] **F.3** Add payment-failed and recovery email templates.
- [ ] **F.4** Trigger the emails from the H3 webhook handlers.
- [ ] **F.5** Verify the banner clears on recovery.
- [ ] **G.1** Build the team/seat management view.
- [ ] **G.2** Extract the shared seats-used domain function used by both UI and server enforcement.
- [ ] **G.3** Add resend and revoke to the members surface.
- [ ] **G.4** Disable the invite control at the cap with an upgrade link.
- [ ] **H.1** Integration tests in Stripe test mode: upgrade, downgrade at period end, cancel, resume, portal round-trip.

## 5. Acceptance Criteria

- [ ] All `REQ-0071` acceptance criteria are met.
- [ ] No Stripe secret reaches the client; all gateway calls are server-side.
- [ ] The domain layer contains no Stripe imports.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run build:worker` pass.
- [ ] `docs/specs/current-state.md` updated (plan transitions, usage contract, billing surfaces).
- [ ] `CHANGELOG.md` updated last.

## 6. Notes / Blockers

- **Blocked for end-to-end verification** by `REQ-0067` H2/H3. Build in parallel; verify after.
- **Depends on** the Stripe API version pinned in `REQ-0068` M6 — invoice and subscription payload
  shapes differ across versions.
- **Record here during implementation:**
  - Subscription-schedule vs item-swap decision (A.4).
  - `consumeAIReply` exactly-once audit results (E.1).
  - Whether `Organization.stripeCustomerId` already existed (A.3).
- **Risk:** the seats-used arithmetic must be identical in the UI and the server-side enforcement
  from `REQ-0067` H10, or the UI will allow an invite the server rejects. One shared function is the
  mitigation.
