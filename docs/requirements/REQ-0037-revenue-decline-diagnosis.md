---
description: 0037 — Revenue Decline & Funnel Diagnosis
---

# REQ-0037: 0037 — Revenue Decline & Funnel Diagnosis

- **Status:** Draft
- **Owner:** Devin
- **Module(s):** all
- **Original spec path:** `docs/specs/0037-revenue-decline-diagnosis.md` (restructured)
- **Task:** `docs/tasks/TASK-0037-revenue-decline-diagnosis.md`
- **Tracker:** `docs/trackers/TRACKER-0037-revenue-decline-diagnosis.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0037-revenue-decline-diagnosis.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


## 1. Purpose

Detect revenue declines and explain them with a simple funnel/driver decomposition so operators can act on the top contributors.

## 2. Scope

- Add `revenue_7d`, `order_count_7d`, and `aov_7d` semantic metrics.
- Detect a store whose trailing-7-day revenue drops vs the prior 7 days.
- Emit a `BusinessInsight` with a diagnosis: revenue = orders × AOV, new-vs-repeat mix, and product-availability/messaging context.
- Map to an actionable recommendation.

## 3. Requirements

- `MetricSourceProvider` exposes `getRevenue`, `getOrderCount`, and `getAverageOrderValue` for a store over a configurable day window.
- `MetricService` defines `revenue_7d`, `order_count_7d`, `aov_7d` and computes snapshots from order data.
- `DiagnosisService` compares current 7-day window with the previous 7-day window.
- If revenue drops by >= 20% or is zero, emit a `RISK` insight.
- If revenue grows by >= 20%, emit an `OPPORTUNITY` insight.
- Insight evidence includes current/previous revenue, orders, AOV, and top drivers (orders vs AOV vs customer mix).
- `DetectionService` calls `DiagnosisService` during store analysis.
- `RecommendationService` maps revenue-decline insights to a recommendation:
  - If AOV decline is the dominant driver: `GENERATE_COUPON` (threshold-based upsell coupon).
  - If order-count decline is dominant: `CREATE_DM_CAMPAIGN` (re-engagement / abandoned-cart recovery).
  - If product availability appears in evidence: `CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN`.
- Deep link to `/stores/{storeId}/orders` and `/stores/{storeId}/analytics`.

## 4. Edge Cases

- No orders in either window → no insight (silent; avoid false positive).
- Zero previous-period revenue with current revenue > 0 → emit `OPPORTUNITY` "Revenue recovered".
- Zero current revenue with previous > 0 → emit `RISK` "Revenue dropped to zero".
- New/repeat mix uses `Customer` lifecycle stage `CUSTOMER` vs `LEAD`/`FOLLOWER`.
- AOV denominator is order count; guard divide-by-zero.

## 5. Acceptance Criteria

- [ ] `revenue_7d`, `order_count_7d`, `aov_7d` metrics defined and computed.
- [ ] `DiagnosisService` produces revenue decline/recovery insights.
- [ ] `DetectionService` integrates diagnosis during `analyzeStore`.
- [ ] `RecommendationService` maps revenue insights to appropriate action recommendations.
- [ ] End-to-end script confirms revenue decline → insight → recommendation.
- [ ] Lint + typecheck + build pass.
