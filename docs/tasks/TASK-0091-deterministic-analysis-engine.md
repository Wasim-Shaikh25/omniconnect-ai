# TASK-0091: Deterministic Analysis Engine (Batch 6 — OperationResolver, EmbeddingProvider port, golden tests)

- **Status:** Completed
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- **Tracker:** `docs/trackers/TRACKER-0091-deterministic-analysis-engine.md`
- **Module(s):** analytics, ai
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — OperationResolver and EmbeddingProvider port.
- **Last updated:** 2026-08-05

## 1. Summary

Sixth batch of REQ-0091. Add the `EmbeddingProvider` port and a deterministic `KeywordEmbeddingProvider` adapter inside the analytics/ai boundary, then build `OperationResolver` that maps a natural-language analytics question to a typed `AnalysisSpec` with a confidence score and an `unsupported` fallback. Also add golden/snapshot tests that assert each pure operation returns identical output for a fixed fixture. `queryAnalytics`/`generateDashboard` wiring and a local MiniLM `TransformersEmbeddingProvider` are deferred to Batch 7.

## 2. References

- Architecture: `docs/specs/current-state.md`
- Requirement: `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- Tracker: `docs/trackers/TRACKER-0091-deterministic-analysis-engine.md`
- Related files:
  - `src/modules/ai/application/operation-resolver.ts`
  - `src/modules/ai/application/operation-resolver.test.ts`
  - `src/modules/analytics/application/embedding-provider.ts`
  - `src/modules/analytics/application/embedding-providers/keyword-embedding-provider.ts`
  - `src/modules/analytics/application/operations/*.test.ts`
  - `src/modules/analytics/index.ts`
  - `src/modules/ai/index.ts`

## 3. Implementation Plan

### Step 1 — EmbeddingProvider port
Define `EmbeddingProvider` port in `src/modules/analytics/application/embedding-provider.ts`:

```ts
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  cosine(a: number[], b: number[]): number;
}
```

### Step 2 — KeywordEmbeddingProvider
Implement a deterministic, dependency-free adapter that builds a bag-of-words vector from a fixed vocabulary of operation-related terms and returns embeddings. This is pure (no network/model) and lets the resolver work immediately while keeping the port open for a future MiniLM adapter.

### Step 3 — OperationResolver
Implement `resolveOperation(question, embeddings)` in `src/modules/ai/application/operation-resolver.ts`:
- Tokenize the question.
- Compute cosine similarity against `OPERATION_EXEMPLARS` (array of `{ op, terms, vector }`).
- Combine with a simple BM25-ish term overlap bonus.
- Return `{ spec, confidence }` for the best match if it exceeds a configurable threshold.
- Return `{ unsupported: true, reason }` otherwise.
- Build `AnalysisSpec` from the matched operation and any extracted entities (post id, date range hints) — keep extraction minimal and deterministic.

### Step 4 — Golden tests
Add `src/modules/analytics/application/operations/golden.test.ts` that replays fixed fixture datasets through every implemented operation and asserts the exact numeric output, ensuring reproducibility and guarding against regression.

### Step 5 — Exports and docs
Export `EmbeddingProvider`, `KeywordEmbeddingProvider`, and resolver types/functions from `src/modules/analytics/index.ts` and `src/modules/ai/index.ts` as appropriate. Update CHANGELOG and current-state.

## 4. Subtasks

- [x] T-081a: Define `EmbeddingProvider` port.
- [x] T-081b: Implement `KeywordEmbeddingProvider` adapter.
- [x] T-082a: Implement `OperationResolver` with confidence + unsupported fallback.
- [x] T-088a: Add golden/snapshot tests for all implemented operations.
- [x] Export new types/functions from `analytics` and `ai` barrels.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.

## 5. Acceptance Criteria

- `EmbeddingProvider` is a stable port with a pure, dependency-free `KeywordEmbeddingProvider` implementation.
- `OperationResolver` returns a typed `AnalysisSpec` + confidence for supported natural-language questions.
- `OperationResolver` returns `unsupported` with a reason for questions that don't match any operation.
- Golden tests assert deterministic, byte-identical output for fixed fixtures across all implemented operations.
- All quality gates pass.

## 6. Notes / Blockers

- Local MiniLM `TransformersEmbeddingProvider` (via `@xenova/transformers` / transformers.js) and `queryAnalytics`/`generateDashboard` wiring are deferred to Batch 7.
