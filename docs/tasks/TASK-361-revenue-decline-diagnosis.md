# Task 361: Revenue Decline & Funnel Diagnosis

- **Status:** Done
- **Spec:** `docs/specs/0037-revenue-decline-diagnosis.md`
- **Module(s):** `intelligence`, `ecommerce`, `crm`
- **Owner:** wasim
- **Changelog entry:** Adds revenue-decline diagnosis: trailing-7-day revenue metrics, funnel decomposition, and insight-driven recommendations.

## Description

Implement revenue-decline and recovery detection for the Unified Intelligence Layer. The service compares two 7-day windows, decomposes revenue into orders × AOV and new-vs-repeat customer mix, and generates a recommendation based on the dominant driver.

## Subtasks

- [x] Extend `MetricSourceProvider` and `MetricService` with `revenue_7d`, `order_count_7d`, `aov_7d`.
- [x] Create `DiagnosisService` with `diagnoseRevenue` and driver decomposition.
- [x] Wire `DiagnosisService` into `DetectionService`.
- [x] Update `RecommendationService` mapping for revenue-decline insights.
- [x] Add end-to-end validation script.
- [x] Run lint, typecheck, build.
- [x] Update `CHANGELOG.md` and `docs/tasks/backlog.md`; create PR.

## Acceptance Criteria

- [x] `revenue_7d`, `order_count_7d`, `aov_7d` metrics compute from `ecommerce.listOrders`.
- [x] Revenue decline >= 20% or recovery >= 20% generates a `BusinessInsight`.
- [x] Insight evidence shows revenue, orders, AOV, and top drivers.
- [x] Recommendation maps to `GENERATE_COUPON`, `CREATE_DM_CAMPAIGN`, or `CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN` based on the dominant driver.
- [x] End-to-end script confirms detection and recommendation.
- [x] Lint + typecheck + build pass.
