---
description: Orders View (read-only connector orders)
---

# REQ-0019: Orders View (read-only connector orders)

- **Status:** In Progress
- **Owner:** wasim
- **Module(s):** ecommerce
- **Original spec path:** `docs/specs/0019-orders-view.md` (restructured)
- **Task:** `docs/tasks/TASK-0019-orders-view.md`
- **Tracker:** `docs/trackers/TRACKER-0019-orders-view.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0019-orders-view.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** ecommerce
- **Status:** In Progress
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-220)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
A read-only store orders page that pulls purchase records from the connected eCommerce provider (or the mock fallback). This is a lightweight first slice of the Orders module.

## 2. Goals
- Show recent orders for a store with total, currency, customer reference, and date.
- Demonstrate the `EcommerceConnector.getOrders` contract end-to-end.
- Provide a natural link from the store detail page.

## 3. Non-Goals
- Order persistence, line items, refunds, fulfillment, attribution, or mutations.
- Multi-store aggregation or search/filter.

## 4. User Stories
- As a Store Owner, I want to see recent orders so I can verify the Shopify/mock connection is returning data.

## 5. Public Contract
- `ecommerceQueries.listOrders(storeId, limit?)` returns `ConnectorOrder[]`.
- Route: `/stores/[storeId]/orders`.

## 6. Data / Persistence
- Orders are fetched live from the connector for each request.
- No Prisma schema changes.

## 7. API / UI Surface
- `/stores/[storeId]/orders` renders a table/card list.
- Store detail page links to Orders.

## 8. External Integrations
- Shopify connector or mock fallback via existing `ecommerce` connector factory.

## 9. Edge Cases & Failure Models
- Store not connected → empty state with CTA to connect.
- Connector error → error message.
- No orders → empty state.

## 10. Security & Privacy
- `requireRole("STORE_OWNER")` or authenticated org member.
- Org scoping via `organizationQueries.getOrganizationOverview`.

## 11. Testing Strategy
- Unit: listOrders aggregates by store.
- Integration: mock connector returns deterministic orders.
- UI: page renders empty and populated states.

## 12. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `ecommerceQueries.listOrders` resolves the connector and returns orders.
- [x] `/stores/[storeId]/orders` renders the order list.
- [x] Store detail page links to Orders.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 13. Open Questions
1. Should orders be synced to a local `Order` table for search/attribution?
2. Should we support order detail drill-down with line items?
