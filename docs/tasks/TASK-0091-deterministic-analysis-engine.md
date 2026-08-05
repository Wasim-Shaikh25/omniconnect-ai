# TASK-0091: Deterministic Analysis Engine with AI Narration

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- **Tracker:** `docs/trackers/TRACKER-0091-deterministic-analysis-engine.md`
- **Module(s):** analytics, ai, intelligence, content, inspector
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Deterministic AnalysisSpec engine; numbers computed by code, LLM narrates only.
- **Last updated:** 2026-08-05

## 1. Summary

Introduce a three-layer analytics pipeline (deterministic math → local small-model resolver → LLM
narration) connected by a validated `AnalysisSpec`. The AI selects a whitelisted operation and emits
a spec; a safe `AnalysisEngine` executes pure operation functions within project scope and returns
real numbers; the LLM only writes prose around those numbers. Also refactors two implemented
features (`analyze-media.ts`, `generate-trends.ts`) that currently ask the LLM to invent numbers,
and specifies the deterministic-first build of the Profile Inspector.

This is the concrete execution design behind REQ-0081's `queryAnalytics` / `generateDashboard`
tools, and the security model mirrors REQ-0078 (AI emits config, safe interpreter executes).

## 2. References

- Architecture: `docs/specs/current-state.md`
- Requirement: `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- Pattern precedent: `docs/requirements/REQ-0078-dynamic-ecommerce-adapters.md` (ConfigInterpreter)
- Consumers: `REQ-0081` (AI tools), `REQ-0083` (DynamicDashboard), `REQ-0079` (trends/hashtags),
  `REQ-0085` (profile inspector), `REQ-0089` (intelligence)
- Already-compliant reference implementations:
  - `src/modules/analytics/application/best-time-to-post.ts`
  - `src/modules/analytics/application/competitor-benchmark.ts`
  - `src/modules/analytics/application/marketing-analytics.ts`
  - `src/modules/intelligence/application/prediction.ts`
  - `src/modules/intelligence/application/detection.ts`
- Files to modify:
  - `src/modules/ai/application/analyze-media.ts`
  - `src/modules/ai/application/generate-trends.ts`

## 3. Implementation Plan

### Step 1 — AnalysisSpec vocabulary (T-078)
Define `src/modules/analytics/domain/analysis-spec.ts`: the closed `AnalysisOperation` enum,
`MetricName` enum, and the `AnalysisSpec` shape. Pure domain types, no I/O. Add `validateSpec()`
that rejects unknown operations and enforces per-operation required params.

### Step 2 — AnalysisEngine interpreter (T-079)
`src/modules/analytics/application/analysis-engine.ts`. `run(spec, ctx)` validates, fetches a
`projectId`-scoped dataset via an injected `DatasetFetcher` port, dispatches to the pure operation.
No `eval`/`Function`. `AnalysisContext.projectId` is the only tenant scope and cannot be widened by
the spec.

### Step 3 — Deterministic operation library (T-080)
`src/modules/analytics/application/operations/*.ts` — pure functions, no I/O in the compute step:
`single_post_analysis`, `top_n`, `compare_period`, `anomaly_check` (z-score/EWMA), `cohort_trend`
(slope), `attribution_breakdown`, `best_time` (reuse existing engine), `correlation`,
`profile_quality`. Shared stats helpers: `percentileRank`, `zScore`, `ewma`, `pearson`.

### Step 4 — EmbeddingProvider port + local adapter (T-081)
`src/modules/ai/application/ports.ts`: `EmbeddingProvider { embed(text): Promise<number[]> }`.
Infra adapter using `@xenova/transformers` (all-MiniLM-L6-v2) loaded once, cached, no network at
inference. Add a BM25 lexical matcher helper. Ensure the worker build bundles model weights.

### Step 5 — OperationResolver (T-082)
`src/modules/ai/application/operation-resolver.ts`: embed the question, score against per-operation
exemplars (cosine + BM25), return `{ spec, confidence }` or `{ unsupported, reason }` below
threshold. Threshold configurable via env.

### Step 6 — Narration service (T-083)
`src/modules/ai/application/narrate-analysis.ts`: takes an `AnalysisResult`, returns prose using
only the supplied numbers. System prompt forbids introducing new numbers. Unit test asserts no
numeric token in the output is absent from the result payload.

### Step 7 — Wire REQ-0081 tools (T-084)
`queryAnalytics` and `generateDashboard` emit an `AnalysisSpec` (via OperationResolver for NL, or
directly for structured tool args), run the engine, then narrate / build a DynamicDashboard schema
(REQ-0083). Unsupported questions return the "unsupported" message, never a guess.

### Step 8 — [MODIFY] analyze-media.ts (T-085)
Replace the "LLM decides if/why a post worked" flow. Compute `single_post_analysis` (percentile,
z-score, verdict, evidence) deterministically against the account baseline; pass the computed result
to the LLM only for the `whyItWorked` narration and `slideBySlideStoryboard`. The verdict and all
metrics come from code.

```ts
// analyze-media.ts (after)
const result = await analysisEngine.run(
  { operation: "single_post_analysis", target: { postId }, metrics: ["engagement"] },
  { projectId },
);
const narration = await narrateAnalysis(result, { intent: "post_review", tone });
return { verdict: result.values, whyItWorked: narration.why, storyboard: narration.storyboard };
```

### Step 9 — [MODIFY] generate-trends.ts (T-086)
Keep the LLM's creative idea text (title, hook, description, hashtags, audio). Remove LLM-invented
`predictedEngagementScore`, `predictedRevenue`, `bestTimeToPost`; source them from the deterministic
best-time engine + historical engagement baselines for the chosen format/hashtags. If there is
insufficient history, return the field as `null` with a "insufficient data" flag rather than a
guessed number.

### Step 10 — [MODIFY/BUILD] Profile Inspector deterministic-first (T-087)
When REQ-0085 is built, language/geo/quality signals are computed deterministically (language
detection, hashtag-locality lookup, engagement-quality scoring with confidence tiers); the LLM
narrates and arbitrates only genuinely ambiguous (<40% confidence) cases. Tracked here so the
inspector is built the right way rather than refactored later.

### Step 11 — Golden tests + reproducibility (T-088)
Fixture datasets per operation; snapshot the `AnalysisResult`. Assert identical output across runs.
Assert the engine contains no `eval`/`Function`. Add the narration "no invented numbers" test.

## 4. Subtasks

- [ ] T-078: Define `AnalysisSpec` schema + closed operation vocabulary + `validateSpec()`.
- [ ] T-079: Build `AnalysisEngine` interpreter (validate → scoped fetch → pure dispatch, no eval).
- [ ] T-080: Implement deterministic operation library + shared stats helpers.
- [ ] T-081: `EmbeddingProvider` port + local MiniLM adapter (transformers.js) + BM25 matcher.
- [ ] T-082: `OperationResolver` — NL question → spec with confidence + "unsupported" fallback.
- [ ] T-083: Narration service — LLM explains result; "no invented numbers" guarantee + test.
- [ ] T-084: Wire REQ-0081 `queryAnalytics` + `generateDashboard` to emit/run `AnalysisSpec`.
- [ ] T-085: **[MODIFY]** `analyze-media.ts` → deterministic verdict/evidence + AI narration only.
- [ ] T-086: **[MODIFY]** `generate-trends.ts` → deterministic numeric predictions, AI keeps copy.
- [ ] T-087: **[MODIFY/BUILD]** Profile Inspector deterministic signals + AI narration for ambiguous.
- [ ] T-088: Golden/snapshot tests per operation + narration guard + no-eval assertion.

## 5. Acceptance Criteria

- [ ] Matches REQ-0091 acceptance criteria.
- [ ] `analyze-media.ts` and `generate-trends.ts` no longer surface any LLM-invented number.
- [ ] Lint + typecheck + tests pass; golden tests reproducible.
- [ ] `CHANGELOG.md` updated.
- [ ] `docs/specs/current-state.md` updated (new analysis engine is a public contract).

## 6. Notes / Blockers

- Depends on REQ-0086 (OpenRouter narration) and REQ-0077/REQ-0090 (project scope). The engine is
  built project-scoped from the start; the already-deterministic files in §9a of the requirement are
  re-scoped by REQ-0090, not by this task.
- MiniLM bundle size must fit the worker image budget — validate in T-081.
- These tasks (T-078–T-088) extend the V2 backlog past T-077. They slot into Phase 3 (Intelligence)
  except T-085/T-086 which can land as soon as the engine core (T-078–T-080, T-083) exists.
