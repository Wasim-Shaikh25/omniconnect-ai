# TASK-0091: Deterministic Analysis Engine (Batch 4 — cohort_trend, attribution_breakdown)

- **Status:** Completed
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- **Tracker:** `docs/trackers/TRACKER-0091-deterministic-analysis-engine.md`
- **Module(s):** analytics
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Additional deterministic analysis operations.
- **Last updated:** 2026-08-05

## 1. Summary

Fourth batch of REQ-0091. Implement pure deterministic operations for `cohort_trend` (linear trend + slope over a time series) and `attribution_breakdown` (revenue/orders attributed by media, coupon, or channel). These are fully deterministic, unit-testable, and do not require AI or external dependencies. `profile_quality`, `EmbeddingProvider`, `OperationResolver`, and golden tests are deferred to Batch 5.

## 2. References

- Architecture: `docs/specs/current-state.md`
- Requirement: `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- Tracker: `docs/trackers/TRACKER-0091-deterministic-analysis-engine.md`
- Related files:
  - `src/modules/analytics/application/operations/cohort-trend.ts`
  - `src/modules/analytics/application/operations/attribution-breakdown.ts`
  - `src/modules/analytics/application/analysis-engine.ts`
  - `src/modules/analytics/pure.ts`
  - `src/modules/analytics/index.ts`

## 3. Implementation Plan

### Step 1 — cohort_trend
Create `cohort-trend.ts` that accepts a dataset of `{ label: string; value: number }[]` (ordered by time) and computes a simple linear regression (least squares) to produce `slope`, `intercept`, `r2`, `predictedNext`, and `trendDirection` (`-1`/`0`/`1`). Use `series` to return the original values and the fitted trend line.

### Step 2 — attribution_breakdown
Create `attribution-breakdown.ts` that accepts a dataset of attribution records (`{ key: string; revenue: number; orders: number }[]`) and computes totals, averages, and the top contributor by revenue. Grouping key (media/coupon/channel) is implicit in the dataset; the operation is pure aggregation.

### Step 3 — Register and export
Export `cohortTrend` and `attributionBreakdown` from `src/modules/analytics/pure.ts` and `src/modules/analytics/index.ts`.

### Step 4 — Tests
Add unit tests for both operations covering positive/negative/flat trends, empty data, and attribution ranking.

## 4. Subtasks

- [x] T-080f: Implement `cohort_trend` deterministic operation.
- [x] T-080g: Implement `attribution_breakdown` deterministic operation.
- [x] Export new operations from `analytics/pure.ts` and `analytics/index.ts`.
- [x] Add unit tests for both operations.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.

## 5. Acceptance Criteria

- `cohort_trend` computes slope, intercept, R², next predicted value, and trend direction from an ordered time series.
- `attribution_breakdown` totals revenue and orders per key, computes averages, and identifies the top revenue contributor.
- Both operations are pure (no I/O, no LLM, no framework imports) and unit-tested.
- All quality gates pass.

## 6. Notes / Blockers

- `profile_quality`, `EmbeddingProvider` (T-081), `OperationResolver` (T-082), `queryAnalytics`/`generateDashboard` wiring (T-084), Profile Inspector (T-087), and golden tests (T-088) are deferred to Batch 5.
