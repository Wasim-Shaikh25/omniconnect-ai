# TRACKER-0091: Deterministic Analysis Engine

- **Status:** In Progress (Batch 4)
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- **Task:** `docs/tasks/TASK-0091-deterministic-analysis-engine.md`
- **Last updated:** 2026-08-05

## 1. Summary

Progress tracker for REQ-0091: Deterministic Analysis Engine with AI Narration.

## 2. Subtasks

### Planning
- [x] Requirement REQ-0091 approved.
- [x] Task file TASK-0091 created.
- [x] Tracker file TRACKER-0091 created.
- [x] Branch created (`devin/deterministic-cohort-attribution-1785941345`).

### Batch 1 — Core Engine + analyze-media (merged in PR #132)
- [x] T-078: Define `AnalysisSpec` schema + closed operation vocabulary + `validateSpec()`.
- [x] T-079: Build `AnalysisEngine` interpreter (validate → dispatch, no eval).
- [x] T-080: Implement deterministic operation library + shared stats helpers.
- [x] T-085: `analyze-media.ts` → deterministic verdict/evidence + AI narration only.
- [x] `npm run lint` passes.
- [x] `npx tsc --noEmit` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.
- [x] PR #132 merged.

### Batch 2 — generate-trends + best_time (merged in PR #133)
- [x] T-086: Refactor `generate-trends.ts` → deterministic numeric predictions.
- [x] T-080b: Add `best_time` and `top_n` deterministic operations.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.
- [x] PR #133 merged.

### Batch 3 — compare_period, anomaly_check, correlation (merged in PR #134)
- [x] T-080c: Implement `compare_period` deterministic operation.
- [x] T-080d: Implement `anomaly_check` deterministic operation.
- [x] T-080e: Implement `correlation` deterministic operation.
- [x] Export new operations from `analytics/pure.ts` and `analytics/index.ts`.
- [x] Add unit tests for all three operations.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.
- [x] PR #134 merged.

### Batch 4 — cohort_trend, attribution_breakdown (In Review)
- [x] T-080f: Implement `cohort_trend` deterministic operation.
- [x] T-080g: Implement `attribution_breakdown` deterministic operation.
- [x] Export new operations from `analytics/pure.ts` and `analytics/index.ts`.
- [x] Add unit tests for both operations.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.
- [ ] PR created and merged.

### Batch 5 (Deferred)
- [ ] T-081: `EmbeddingProvider` port + local MiniLM adapter.
- [ ] T-082: `OperationResolver` — NL → spec with confidence + unsupported fallback.
- [ ] T-084: Wire REQ-0081 `queryAnalytics` / `generateDashboard` to emit/run `AnalysisSpec`.
- [ ] T-087: Profile Inspector deterministic signals + AI narration.
- [ ] T-088: Golden/snapshot tests per operation + narration guard.
- [ ] Remaining operation: `profile_quality`.

## 3. Acceptance Criteria

- [ ] Batch 4 acceptance criteria from TASK-0091 met.
- [ ] All verification steps above pass.
- [ ] Full REQ-0091 acceptance criteria remain for Batch 5.
