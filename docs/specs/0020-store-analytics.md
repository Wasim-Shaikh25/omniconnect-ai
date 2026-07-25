# Spec 0020: Store Analytics Page

- **Module(s):** analytics (presentation of ecommerce + crm + conversations)
- **Status:** In Progress
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-230)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
A lightweight per-store analytics page that surfaces KPIs and recent activity by composing existing ecommerce, CRM, and conversations queries. No new data model in this slice.

## 2. Goals
- Show a store's product, order, customer, and conversation counts.
- Display recent activity (orders, conversations, followers).
- Provide a quick health snapshot and a link to the store's content/orders pages.

## 3. Non-Goals
- Charts, time-series, comparison filters, exports, or report scheduling.
- New analytics schema or background aggregations.

## 4. User Stories
- As a Store Owner, I want to see how my store is performing in one view.
- As a Manager, I want to spot recent customer activity and orders.

## 5. Public Contract
- New route: `/stores/[storeId]/analytics`.
- Composes public queries from `ecommerceQueries`, `crmQueries`, and `conversationQueries`.

## 6. Data / Persistence
- None new; all data read from existing modules.

## 7. API / UI Surface
- KPI cards: products, orders, customers, followers, conversations.
- Recent lists: orders, conversations.
- Store detail page links to **Analytics**.

## 8. External Integrations
- Shopify/mock connector for orders and products.
- Meta/webhook data for conversations and followers.

## 9. Edge Cases & Failure Models
- Store not connected → show zero/empty states.
- Partial data → show available cards, hide missing ones.

## 10. Security & Privacy
- `getCurrentUser` with org scoping.

## 11. Testing Strategy
- Integration: page renders for a permitted store.
- UI: empty and populated states.

## 12. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `/stores/[storeId]/analytics` renders KPI cards and recent activity.
- [x] Store detail page links to Analytics.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 13. Open Questions
1. Should this page support date-range filters?
2. Should it reuse the dashboard aggregation service or stay query-on-demand?
