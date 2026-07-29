---
description: Store Coupons Page
---

# REQ-0023: Store Coupons Page

- **Status:** In Progress
- **Owner:** wasim
- **Module(s):** ecommerce (presentation)
- **Original spec path:** `docs/specs/0023-coupons-page.md` (restructured)
- **Task:** `docs/tasks/TASK-0023-coupons-page.md`
- **Tracker:** `docs/trackers/TRACKER-0023-coupons-page.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0023-coupons-page.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** ecommerce (presentation)
- **Status:** In Progress
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-260)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
A store-scoped coupons page that lists generated/discount codes from the connected eCommerce provider.

## 2. Goals
- Surface all coupons for a store in one place.
- Show code, discount percentage, status, and expiration.
- Provide a link to generate new coupons from the store detail page.

## 3. Non-Goals
- Coupon editing, deletion, or redemption tracking.
- New provider APIs beyond `listCoupons`.

## 4. User Stories
- As a Store Owner, I want to see my active coupons so I can verify welcome/follower codes are available.

## 5. Public Contract
- Route: `/stores/[storeId]/coupons`.
- Uses `ecommerceQueries.listCoupons(storeId, limit?)`.

## 6. Data / Persistence
- Reads existing `Coupon` records.
- No writes from this page.

## 7. API / UI Surface
- Coupon cards/table with code, discount %, status, expires at.
- Empty state when no coupons exist.
- Store detail page links to **Coupons**.

## 8. External Integrations
- Shopify/mock connector for coupon list via repository.

## 9. Edge Cases & Failure Models
- No coupons → empty state CTA to store detail (generate coupon).

## 10. Security & Privacy
- `getCurrentUser` + org scoping.

## 11. Testing Strategy
- Integration: page renders for permitted store.
- UI: empty and populated states.

## 12. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `/stores/[storeId]/coupons` lists coupons.
- [x] Store detail page links to Coupons.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 13. Open Questions
1. Should coupons be grouped by campaign/source?
2. Should redemptions/usage counts be displayed?
