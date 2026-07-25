# Task 362: Next Best Action for Inbox, Orders, and CRM

- **Status:** Done
- **Spec:** `docs/specs/0038-next-best-action-inbox-orders-crm.md`
- **Module(s):** `intelligence`, `conversations`, `ecommerce`, `crm`, `analytics`, `automation`
- **Owner:** wasim
- **Changelog entry:** Adds per-module Next Best Action for Inbox, Orders, and CRM, cross-module wiring, and a proactive notification policy.

## Description

Implement the first per-module Next Best Action batch from TASK-350: Inbox, Orders, and CRM surfaces with cross-module wiring and proactive notification delivery.

## Subtasks (10)

- [x] 78. **Orders NBA:** resolve stock/fulfillment exceptions first; contact high-value at-risk customers; recommend complementary items post-delivery; suppress during unresolved support.
- [x] 79. **Inbox NBA:** prioritize high-intent or high-value conversations; suggest evidence-based reply + relevant product; escalate risk/uncertainty; suppress sales during sensitive support.
- [x] 80. **CRM NBA:** retain at-risk valuable customers; invite advocates; use early access/education/service over unnecessary discounting.
- [x] 85. **Inbox ↔ CRM:** resolve participant to contact, write intents/product mentions/assignments/resolution to timeline, read lifecycle/orders/consent/issues, hide internal notes from replies.
- [x] 86. **Inbox ↔ Orders/Products:** detect product/order references, show order state in conversation, attribute assisted conversion, suppress automation on refund/fraud/support exceptions.
- [x] 91. **Analytics ↔ Every module:** shared metric IDs/filters/attribution/timezone/currency, deep links, annotations for operational actions, consistent freshness/quality warnings.
- [x] 92. **Automation ↔ Every module:** execute through domain APIs, respect module validation/audit/idempotency, subscribe to canonical events, return status/outcome refs to learning service.
- [x] 127. **Customer 360 header** on `/customers/[customerId]` (relationship summary, lifecycle/value band, current intent, risks/opportunities, consent, preferred channel, best next action).
- [x] 128. **Proactive notification policy:** delivery tiers (critical interrupt, action required, Today feed, digest, on-demand), interruption score, cooldown windows, user tuning (topics, channels, quiet hours, thresholds), and deduplication.
- [~] 137. **Brand-deal follow-up next-best action** and CRM advocate/early-access/suppression recommendations (CRM advocate candidates implemented; brand-deal surface deferred to a later task).

## Acceptance Criteria

- [x] Inbox NBA server action and UI panel render for high-intent conversations.
- [x] Orders NBA server action returns at-risk high-value and post-delivery upsell lists.
- [x] CRM NBA server action returns retention and advocate candidates.
- [x] Cross-module wiring resolves Inbox ↔ CRM and Inbox ↔ Orders/Products references.
- [x] Proactive notification policy model/service with delivery tiers, dedup, cooldown, and user tuning.
- [x] End-to-end script exercises at least Inbox, Orders, and CRM NBA.
- [x] Lint + typecheck + build pass.
