# TRACKER-0091: Deterministic Analysis Engine with AI Narration

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- **Task:** `docs/tasks/TASK-0091-deterministic-analysis-engine.md`
- **Last updated:** 2026-08-05

## 1. Summary

Progress tracker for REQ-0091: deterministic AnalysisSpec engine with local small-model resolver and
LLM-narration-only layer. Includes modification of two implemented features that currently ask the
LLM to invent numbers.

## 2. Subtasks

### Planning
- [ ] Requirement REQ-0091 approved.
- [ ] Task file TASK-0091 created.
- [ ] Audit of implemented analytics/intelligence code complete (recorded in REQ §9).
- [ ] Branch created from `main`.

### Implementation — engine core
- [ ] T-078: `AnalysisSpec` schema + closed operation vocabulary + `validateSpec()`.
- [ ] T-079: `AnalysisEngine` interpreter (validate → project-scoped fetch → pure dispatch, no eval).
- [ ] T-080: Deterministic operation library + shared stats helpers (percentile, z-score, EWMA, pearson).

### Implementation — resolver + narration
- [ ] T-081: `EmbeddingProvider` port + local MiniLM adapter (transformers.js) + BM25 matcher.
- [ ] T-082: `OperationResolver` — NL → spec, confidence score, "unsupported" fallback below threshold.
- [ ] T-083: Narration service — LLM explains result; "no invented numbers" guarantee + test.
- [ ] T-084: Wire REQ-0081 `queryAnalytics` + `generateDashboard` to emit/run `AnalysisSpec`.

### Implementation — modifications to shipped features
- [ ] T-085: `analyze-media.ts` → deterministic verdict/percentile/evidence + AI narration only.
- [ ] T-086: `generate-trends.ts` → deterministic numeric predictions; AI keeps creative copy only.
- [ ] T-087: Profile Inspector (REQ-0085) built deterministic-first; AI arbitrates ambiguous only.

### Implementation — reproducibility
- [ ] T-088: Golden/snapshot tests per operation + narration guard + no-eval assertion.

### Verification
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes (incl. golden + "no invented numbers" tests).
- [ ] `npm audit` reports 0 vulnerabilities.
- [ ] `npm run build` passes.
- [ ] `npm run build:worker` passes (MiniLM weights bundled, within size budget).
- [ ] `CHANGELOG.md` updated.
- [ ] `docs/specs/current-state.md` updated (analysis engine is a public contract).

## 3. Acceptance Criteria

- [ ] All linked requirement acceptance criteria are met.
- [ ] No LLM-invented number reaches the UI from `analyze-media.ts` or `generate-trends.ts`.
- [ ] All verification steps above pass.

## 4. Notes / Blockers

- Status: Todo — not yet started.
- Already-deterministic engines (REQ §9a) need no change here; re-scoped to project by REQ-0090.
- Depends on REQ-0086 (narration), REQ-0077/0090 (project scope).
- New task IDs T-078–T-088 extend the V2 backlog past T-077.
