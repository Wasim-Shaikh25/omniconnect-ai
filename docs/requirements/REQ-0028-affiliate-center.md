---
description: Affiliate Center
---

# REQ-0028: Affiliate Center

- **Status:** Cancelled
- **Owner:** wasim
- **Module(s):** growth (presentation)
- **Original spec path:** `docs/specs/0028-affiliate-center.md` (restructured)
- **Task:** `docs/tasks/TASK-0028-affiliate-center.md`
- **Tracker:** `docs/trackers/TRACKER-0028-affiliate-center.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0028-affiliate-center.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** growth (presentation)
- **Status:** Cancelled
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-300)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
A store-scoped Affiliate Center that lists ambassadors, their referral codes, and referral orders with commission. First slice lets owners enroll ambassadors and record referral orders.

## 2. Goals
- Surface ambassador program performance (codes, commissions, referrals).
- Allow store owners to enroll new ambassadors and record a referral order.
- Reuse the existing `growth` module ambassadors/referrals infrastructure.

## 3. Non-Goals
- Payout processing, multi-level affiliate tiers, or automated commission payments in this slice.
- New Affiliate-specific tables (uses `Ambassador` + `ReferralOrder`).

## 4. User Stories
- As a Store Owner, I want to see my ambassadors and their referral performance.
- As a Store Owner, I want to record a referral order and have the commission computed automatically.

## 5. Public Contract
- Route: `/stores/[storeId]/affiliates`.
- Uses `growthQueries.listAmbassadors` and `growthQueries.listReferrals`.
- Uses `enrollAmbassadorAction` and `recordReferralAction`.

## 6. Data / Persistence
- Reads/writes existing `Ambassador` and `ReferralOrder` tables.

## 7. API / UI Surface
- Ambassadors list with code, discount %, commission %, total referrals, earnings, status.
- Referrals list with order id, amount, commission, status.
- Enroll form: handle/creator name, discount %, commission %.
- Record referral form: ambassador select, order id, order amount.

## 8. External Integrations
- None.

## 9. Edge Cases & Failure Models
- No ambassadors → show empty state + enroll CTA.
- No referrals → show empty referrals section.

## 10. Security & Privacy
- `getCurrentUser` + org scoping.

## 11. Testing Strategy
- Integration: page renders for permitted store.
- UI: populated and empty states; form submissions revalidate the page.

## 12. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `/stores/[storeId]/affiliates` renders ambassadors and referrals.
- [x] Enroll and record-referral forms wired to `enrollAmbassadorAction` / `recordReferralAction` with `revalidatePath` for the affiliates page.
- [x] Store detail page links to Affiliate Center.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 13. Open Questions
1. Should ambassadors be able to log in and see their own stats?
2. Should payouts be tracked per ambassador?
