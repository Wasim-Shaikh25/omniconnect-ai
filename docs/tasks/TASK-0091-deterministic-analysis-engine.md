# TASK-0091: Deterministic Analysis Engine (Batch 3 — compare_period, anomaly_check, correlation)

- **Status:** Completed
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- **Tracker:** `docs/trackers/TRACKER-0091-deterministic-analysis-engine.md`
- **Module(s):** analytics
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Additional deterministic analysis operations.
- **Last updated:** 2026-08-05

## 1. Summary

Third batch of REQ-0091. Implement the next set of pure deterministic operations for the `AnalysisEngine`: `compare_period` (period-over-period deltas), `anomaly_check` (z-score / IQR flagging), and `correlation` (pairwise metric correlation). These are fully deterministic, unit-testable, and do not require any AI or external dependencies. MiniLM `EmbeddingProvider` / `OperationResolver` are deferred to Batch 4.

## 2. References

- Architecture: `docs/specs/current-state.md`
- Requirement: `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- Tracker: `docs/trackers/TRACKER-0091-deterministic-analysis-engine.md`
- Related files:
  - `src/modules/analytics/application/operations/compare-period.ts`
  - `src/modules/analytics/application/operations/anomaly-check.ts`
  - `src/modules/analytics/application/operations/correlation.ts`
  - `src/modules/analytics/application/analysis-engine.ts`
  - `src/modules/analytics/pure.ts`
  - `src/modules/analytics/index.ts`

## 3. Implementation Plan

### Step 1 — compare_period
Create `compare-period.ts` that accepts a dataset with `current: number[]` and `previous: number[]` (or keyed records) and computes delta, percent change, mean of each period, and trend direction. Returns `AnalysisResult` with values like `currentMean`, `previousMean`, `delta`, `percentChange`, `direction` encoded as a number.

### Step 2 — anomaly_check
Create `anomaly-check.ts` that accepts a series of values and flags anomalies using z-score and IQR methods. Returns `AnalysisResult` with `anomalyCount`, `mean`, `stdDev`, `maxZScore`, `threshold`, and `anomalyIndices`/`anomalyValues` in `series`.

### Step 3 — correlation
Create `correlation.ts` that accepts two numeric arrays and returns Pearson correlation coefficient, p-value approximation, and sample count. This will reuse the existing `correlation` helper in `stats.ts`.

### Step 4 — Register operations
Export the new operations from `src/modules/analytics/pure.ts` and `src/modules/analytics/index.ts`. Update `analysis-engine.ts` if needed (the partial `AnalysisEngineOperations` already allows registering subsets).

### Step 5 — Tests
Add unit tests for each operation covering positive, negative, empty, and edge cases.

## 4. Subtasks

- [x] T-080c: Implement `compare_period` deterministic operation.
- [x] T-080d: Implement `anomaly_check` deterministic operation.
- [x] T-080e: Implement `correlation` deterministic operation.
- [x] Export new operations from `analytics/pure.ts` and `analytics/index.ts`.
- [x] Add unit tests for all three operations.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.

## 5. Acceptance Criteria

- `compare_period` computes absolute and percentage deltas between two numeric datasets deterministically.
- `anomaly_check` flags outliers using z-score and/or IQR methods and reports confidence/dataQuality based on sample size.
- `correlation` returns Pearson r, sample count, and significance approximation for two numeric series.
- All three operations are pure (no I/O, no LLM, no framework imports) and unit-tested.
- All quality gates pass.

## 6. Notes / Blockers

- `cohort_trend`, `attribution_breakdown`, `profile_quality`, `EmbeddingProvider` (T-081), and `OperationResolver` (T-082) are deferred to Batch 4.
