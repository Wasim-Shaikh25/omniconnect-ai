---
description: Brand Deals
---

# REQ-0027: Brand Deals

- **Status:** Cancelled
- **Owner:** wasim
- **Module(s):** branddeals
- **Original spec path:** `docs/specs/0027-brand-deals.md` (restructured)
- **Task:** `docs/tasks/TASK-0027-brand-deals.md`
- **Tracker:** `docs/trackers/TRACKER-0027-brand-deals.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0027-brand-deals.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** branddeals
- **Status:** Cancelled
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-290)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
A store-scoped Brand Deals pipeline for creators and brands to track sponsorship opportunities from lead to paid. First slice is a lightweight CRUD MVP.

## 2. Goals
- Track brand deal opportunities with status, value, and notes.
- Provide a simple pipeline view (Lead → Negotiating → Contracted → Delivered → Paid → Closed).
- Allow store owners to add and list deals.

## 3. Non-Goals
- Deliverables/contract management, invoices, reporting, or multi-user approvals in this slice.
- Integration with external deal platforms.

## 4. User Stories
- As a Store Owner, I want to record brand deal leads so I can track sponsor revenue.

## 5. Public Contract
- Route: `/stores/[storeId]/brand-deals`.
- Uses `branddealsQueries.listByStore` and `createBrandDealAction`.

## 6. Data / Persistence
- New `BrandDeal` table with status enum, brand name, contact email, value, notes, store relation.

## 7. API / UI Surface
- Pipeline columns grouped by status.
- Create-deal form with brand name, contact email, value, status, notes.

## 8. External Integrations
- None.

## 9. Edge Cases & Failure Models
- No deals → empty state with CTA.
- Invalid email/value handled by server action validation.

## 10. Security & Privacy
- `getCurrentUser` + org scoping.

## 11. Testing Strategy
- Integration: page renders for permitted store; create action persists a deal.
- UI: empty and populated pipeline states.

## 12. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `BrandDeal` model + migration.
- [x] `branddeals` module with list/create use-cases and repository.
- [x] `/stores/[storeId]/brand-deals` page with pipeline and create form.
- [x] Store detail page links to Brand Deals.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 13. Open Questions
1. Should deals support attachments (contracts, creative briefs)?
2. Should value support currency per store?
