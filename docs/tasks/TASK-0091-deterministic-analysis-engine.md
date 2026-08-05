# TASK-0091: Deterministic Analysis Engine (Batch 7 — queryAnalytics / generateDashboard wiring)

- **Status:** Completed
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- **Tracker:** `docs/trackers/TRACKER-0091-deterministic-analysis-engine.md`
- **Module(s):** analytics, ai
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — queryAnalytics / generateDashboard wiring.
- **Last updated:** 2026-08-05

## 1. Summary

Seventh batch of REQ-0091. Wire `queryAnalytics` and `generateDashboard` to the deterministic `AnalysisEngine` so that an AI assistant question is first resolved to an `AnalysisSpec`, the engine runs it with project-scoped data, and the result is either returned as structured data (`queryAnalytics`) or transformed into a `DashboardSchema` for the DynamicDashboard component (`generateDashboard`). Local MiniLM `TransformersEmbeddingProvider` is deferred to Batch 8.

## 2. References

- Architecture: `docs/specs/current-state.md`
- Requirement: `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- Related: `docs/requirements/REQ-0081-ai-assistant-tools.md`, `docs/requirements/REQ-0083-business-intelligence.md`
- Related files:
  - `src/modules/analytics/application/query-analytics.ts`
  - `src/modules/analytics/application/generate-dashboard.ts`
  - `src/modules/analytics/application/dataset-fetcher.ts`
  - `src/modules/ai/application/tool-executor.ts` (if existing)

## 3. Implementation Plan

### Step 1 — DatasetFetcher port
Define `DatasetFetcher` in `src/modules/analytics/application/dataset-fetcher.ts`:

```ts
export type Dataset = unknown;

export interface DatasetFetcher {
  fetch(spec: AnalysisSpec, projectId: string): Promise<Dataset>;
}
```

### Step 2 — queryAnalytics application service
Implement `queryAnalytics` in `src/modules/analytics/application/query-analytics.ts`:

```ts
export interface QueryAnalyticsDeps {
  resolveOperation(question: string): Promise<ResolveResult>;
  engine: AnalysisEngine;
  fetchDataset: DatasetFetcher;
}

export async function queryAnalytics(
  deps: QueryAnalyticsDeps,
  question: string,
  projectId: string,
): Promise<{ result: AnalysisResult } | { unsupported: true; reason: string }> { ... }
```

- Resolve the question with `OperationResolver`.
- If unsupported, return the reason.
- Fetch the dataset for the resolved `AnalysisSpec` and projectId.
- Run the engine and return the `AnalysisResult`.

### Step 3 — generateDashboard application service
Implement `generateDashboard` in `src/modules/analytics/application/generate-dashboard.ts`:

- Reuse `queryAnalytics` to get an `AnalysisResult`.
- Transform the `AnalysisResult` into a `DashboardSchema` with `kpi`, `line_chart`, and `table` widgets:
  - `values` become KPI cards.
  - `series` become line charts.
  - `evidence` become a table widget.
- Return `{ schema, result }` or `{ unsupported, reason }`.

### Step 4 — Wired exports and tests
- Export `queryAnalytics`, `generateDashboard`, `DatasetFetcher`, and `DashboardSchema` from `src/modules/analytics/index.ts` and `@/modules/analytics/pure` as appropriate.
- Add unit tests using a fake `DatasetFetcher` and `KeywordEmbeddingProvider` to verify end-to-end question → result and question → dashboard transformation.

## 4. Subtasks

- [x] T-084a: Define `DatasetFetcher` port (reused from `AnalysisEngine`).
- [x] T-084b: Implement `queryAnalytics` application service.
- [x] T-084c: Implement `generateDashboard` application service and `DashboardSchema`.
- [x] Export new types/functions from `ai` barrel.
- [x] Add unit tests for `queryAnalytics` and `generateDashboard`.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.

## 5. Acceptance Criteria

- `queryAnalytics` resolves a natural-language question to an `AnalysisSpec`, fetches a project-scoped dataset, runs the `AnalysisEngine`, and returns the deterministic `AnalysisResult`.
- `generateDashboard` transforms the `AnalysisResult` into a JSON `DashboardSchema` with at least KPI, line_chart, and table widgets.
- Both services return `unsupported` with a reason when the resolver cannot map the question.
- All pure numbers come from the engine; no numbers are invented by the LLM.
- All quality gates pass.

## 6. Notes / Blockers

- Local MiniLM `TransformersEmbeddingProvider` and Profile Inspector integration are deferred to Batch 8.
- The UI `DynamicDashboard` component (REQ-0083) is not touched here — only the JSON schema generator.
