# 0038 — Next Best Action for Inbox, Orders, and CRM

## 1. Purpose

Deliver per-module Next Best Action (NBA) surfaces for Inbox, Orders, and CRM, plus the cross-module wiring and proactive notification policy that make the intelligence layer actionable across the product.

## 2. Scope

- Inbox: show priority, suggested reply, relevant product, risk flags, and suppress sales during support.
- Orders: surface high-value at-risk customers, complementary-product recommendations post-delivery, and suppress actions during unresolved support.
- CRM: identify at-risk valuable customers and advocate candidates; recommend retention or invitation actions.
- Cross-module: Inbox ↔ CRM identity resolution, Inbox ↔ Orders/Products product/order mention detection, Analytics metric sharing, Automation outcome refs.
- Proactive notification policy: delivery tiers, cooldown/dedup, and user tuning.

## 3. Requirements

### Inbox NBA

- `GET /v2/conversations/{id}/next-best-action` returns:
  - `priorityScore`: high/medium/low based on intent signals and customer value.
  - `suggestedReply`: evidence-based template.
  - `relevantProducts`: products matching message content.
  - `risks`: list of risk/uncertainty flags.
  - `suppressSales`: true if conversation contains support/refund/fraud keywords or unresolved DataQualityIssue.
- UI `ConversationContext` displays the above in a compact panel.

### Orders NBA

- `GET /v2/orders/next-best-action` returns for a store:
  - `atRiskHighValueCustomers`: customers with churn risk and above-median lifetime value.
  - `postDeliveryUpsells`: recent completed orders with in-stock complementary products.
  - `suppressed`: orders with active support/refund signals.

### CRM NBA

- `GET /v2/customers/next-best-action` returns:
  - `retentionCandidates`: at-risk high-value customers.
  - `advocateCandidates`: high-engagement, positive-outcome customers eligible for ambassador/early-access invites.
  - `suppressed`: customers in unresolved support or who declined promo consent.

### Cross-module contracts

- Inbox ↔ CRM: `onNewMessage` resolves participant to `Customer` and writes message content/intent to the unified timeline.
- Inbox ↔ Orders/Products: detect product/order mentions in `NewMessage` signals and expose `getOrderForConversation` / `getProductMentions`.
- Analytics ↔ Every module: `MetricSnapshot` computed by `MetricService` is shared via `getStoreMetricsAction` and shown on Dashboard, Store detail, and Intelligence Panel.
- Automation ↔ Every module: `ActionPlanExecuted` event is persisted as an `Outcome` and fed to `BusinessLearningService`.

### Proactive notification policy

- `NotificationPolicy` concept with delivery tiers: `CRITICAL_INTERRUPT`, `ACTION_REQUIRED`, `TODAY_FEED`, `DIGEST`, `ON_DEMAND`.
- Deduplication by insight/recommendation id + 24h window.
- Cooldown buckets per topic.
- User tuning: topics, channels, quiet hours, thresholds (minimal: preferences stored on `User` metadata).

## 4. Edge Cases

- Customer not found in CRM: create a `LEAD` record with external id from message.
- No matching products: return empty `relevantProducts`.
- No completed orders: no post-delivery upsells.
- Support keyword detection uses a small allowlist (`return`, `refund`, `broken`, `issue`, `complaint`, `support`).
- Consent `DECLINED` suppresses all promo NBA.

## 5. Acceptance Criteria

- [x] Inbox NBA server action and UI panel render for high-intent conversations.
- [x] Orders NBA server action returns at-risk high-value and post-delivery upsell lists.
- [x] CRM NBA server action returns retention and advocate candidates.
- [x] Cross-module wiring resolves Inbox ↔ CRM and Inbox ↔ Orders/Products references.
- [x] Proactive notification policy model/service with delivery tiers, dedup, cooldown, and user tuning.
- [x] End-to-end script exercises at least Inbox, Orders, and CRM NBA.
- [x] Lint + typecheck + build pass.
