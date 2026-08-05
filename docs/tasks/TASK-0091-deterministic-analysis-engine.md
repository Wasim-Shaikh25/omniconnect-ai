# TASK-0091: Deterministic Analysis Engine (Batch 1 — Core Engine + analyze-media)

- **Status:** In Progress
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- **Tracker:** `docs/trackers/TRACKER-0091-deterministic-analysis-engine.md`
- **Module(s):** analytics, ai
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Deterministic analysis engine core and deterministic media analysis.
- **Last updated:** 2026-08-05

## 1. Summary

Build the foundational deterministic analysis layer for REQ-0091. This batch defines `AnalysisSpec`, `AnalysisEngine`, and a pure operation library, then refactors `analyze-media.ts` so the verdict (over/under/average), percentile, and z-score are computed by code while the LLM only narrates and produces storyboard/improvements. `generate-trends.ts` deterministic number sourcing is left for Batch 2.

## 2. References

- Architecture: `docs/specs/current-state.md`
- Requirement: `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- Tracker: `docs/trackers/TRACKER-0091-deterministic-analysis-engine.md`
- Related files:
  - `src/modules/ai/application/analyze-media.ts`
  - `src/modules/ai/infrastructure/container.ts`
  - `src/modules/analytics/application/marketing-insights.ts`
  - `src/modules/analytics/infrastructure/marketing-insights.repository.ts`

## 3. Implementation Plan

### Step 1 — AnalysisSpec + AnalysisEngine core
Create `src/modules/analytics/domain/analysis.ts` with the closed `AnalysisOperation` enum, `AnalysisSpec` type, `validateSpec`, `AnalysisResult`, and `UnsupportedOperationError`.

Create `src/modules/analytics/application/operations/stats.ts` with pure helpers: `engagementScore`, `percentileRank`, `zScore`, `topN`, `mean`, `stdDev`.

Create `src/modules/analytics/application/operations/single-post-analysis.ts` that computes a deterministic verdict from a target post vs baseline.

Create `src/modules/analytics/application/analysis-engine.ts` with `makeAnalysisEngine({ operations })` — safe interpreter, no `eval`, project-scoped.

### Step 2 — Narration guard
`analyze-media.ts` passes the computed `AnalysisResult` into the LLM prompt and instructs it to use only the provided numbers. The same guard will be extracted into a standalone narration service in Batch 2.

### Step 3 — Refactor analyze-media
- Extend `AnalyzeMediaInput` with optional `baseline` array.
- In `makeAnalyzeMedia`, compute `engagementScore(target)` and baseline scores, derive `percentile`, `zScore`, `verdict`.
- Pass computed facts into the LLM prompt for `whyItWorked`, `suggestedImprovements`, and `slideBySlideStoryboard`.
- Update `marketingInsightsService.analyzeMediaPost` to fetch `listMediaPosts(projectId)` and pass the baseline.

### Step 4 — Container wiring
`makeAnalyzeMedia` already consumes `aiProvider` and `aiConfigurationRepository`; no additional container changes are required because it pulls pure operations from `@/modules/analytics/pure`.

### Step 5 — Tests
Add unit tests for `singlePostAnalysis`, stats helpers, `AnalysisEngine` dispatch, and `analyze-media` deterministic computation.

## 4. Subtasks

- [x] T-078: Define `AnalysisSpec` schema + closed operation vocabulary + `validateSpec()`.
- [x] T-079: Build `AnalysisEngine` interpreter.
- [x] T-080: Implement deterministic operation library + shared stats helpers.
- [x] T-085: `analyze-media.ts` → deterministic verdict/evidence + AI narration only.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.

## 5. Acceptance Criteria

- `AnalysisSpec` type defined and validated.
- `AnalysisEngine.run(spec, ctx)` rejects unknown operations and dispatches to pure functions.
- `analyze-media.ts` no longer invents numbers; verdict/percentile/z-score are computed deterministically.
- Narration prompt forbids inventing numbers; test guards against invented numeric tokens.
- All quality gates pass.

## 6. Notes / Blockers

- `OperationResolver` (T-082), `EmbeddingProvider` (T-081), and `generate-trends.ts` deterministic numbers (T-086) are deferred to Batch 2 because they require `transformers.js` integration and larger wiring.
