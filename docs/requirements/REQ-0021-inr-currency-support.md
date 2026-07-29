---
description: INR Currency Support
---

# REQ-0021: INR Currency Support

- **Status:** Implemented
- **Owner:** wasim
- **Module(s):** shared, ecommerce, ai
- **Original spec path:** `docs/specs/0021-inr-currency-support.md` (restructured)
- **Task:** `docs/tasks/TASK-0021-inr-currency-support.md`
- **Tracker:** `docs/trackers/TRACKER-0021-inr-currency-support.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0021-inr-currency-support.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** shared, ecommerce, ai
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-240)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
Add first-class Indian Rupee (INR) support across the OmniConnect AI commerce surfaces. India is the initial launch market, so the app defaults to INR formatting when no currency is specified and the mock connector now returns INR prices.

## 2. Goals
- Introduce a shared `formatCurrency` utility that uses Indian numbering (`en-IN`) for INR and localized formatting for USD.
- Default to INR when a product/order has no currency code.
- Update the store detail page and AI reply context to use the formatter.
- Update the mock eCommerce connector to return INR prices and order totals.
- Ensure Shopify product sync falls back to the store's currency when a variant has none.

## 3. Non-Goals
- Full multi-currency checkout or conversion rates.
- Schema changes to add a `Store.currency` column (out of scope for this slice).
- Updating already-open feature branches (orders/analytics) beyond main-branch surfaces.

## 4. User Stories
- As a merchant in India, I want product prices and order totals to display in ₹ with Indian grouping so I can read them naturally.

## 5. Public Contract
- `formatCurrency(value, currency?)` from `@/lib/currency` returns a formatted string.
- `formatNumber(value)` from `@/lib/currency` returns an Indian-locale number.

## 6. Data / Persistence
- No schema changes.
- `Product.currency` and `Order.currency` strings drive formatting.
- Mock connector defaults to `INR`.
- `syncProducts` enriches product records with `StoreInfo.currency` when the connector omits it.

## 7. API / UI Surface
- Store detail product list uses `formatCurrency`.
- AI reply product context uses `formatCurrency`.
- Dev/test data now shows ₹ amounts.

## 8. External Integrations
- Shopify connector already exposes store currency in `fetchStoreInfo`; `getProducts` currency is enriched during sync.

## 9. Edge Cases & Failure Models
- Unknown or missing currency code → default to INR.
- `Intl.NumberFormat` unsupported → fallback to `₹{value.toFixed(2)}`.
- `fetchStoreInfo` fails during sync → products keep their connector currency (may be null).

## 10. Security & Privacy
- No PII or credentials touched.

## 11. Testing Strategy
- Unit: `formatCurrency` for INR, USD, null, and invalid currency.
- Integration: mock connector returns INR; sync falls back to store currency.
- UI: store detail page renders ₹ prices and totals.

## 12. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `@/lib/currency` utility created with INR-first formatting.
- [x] Store detail page and AI reply context use the utility.
- [x] Mock connector returns INR prices and order totals.
- [x] `syncProducts` falls back to store currency for products missing one.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 13. Open Questions
1. Should the `Store` table gain a `currency` column so providers without per-variant currency can inherit it?
2. Should we add a currency selector to the store creation/connect forms?
