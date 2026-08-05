# TASK-0091: Deterministic Analysis Engine (Batch 8 — Profile Inspector core)

- **Status:** Completed
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- **Tracker:** `docs/trackers/TRACKER-0091-deterministic-analysis-engine.md`
- **Module(s):** inspector (new), analytics
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Profile inspector core.
- **Last updated:** 2026-08-05

## 1. Summary

Eighth batch of REQ-0091. Added a new `inspector` module with a deterministic `inspectProfile` use-case. It computes audience quality, engagement rate, top content, demographic estimates, and a growth trend from public profile signals. The Meta/OpenRouter fetch and AI narration are abstracted behind `ProfileFetcher` and `ProfileNarrator` ports. Local MiniLM `TransformersEmbeddingProvider` remains deferred to Batch 9.

## 2. References

- Architecture: `docs/specs/current-state.md`
- Requirement: `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- Related: `docs/requirements/REQ-0085-profile-reel-inspector.md`
- Related files:
  - `src/modules/inspector/domain/types.ts`
  - `src/modules/inspector/application/ports.ts`
  - `src/modules/inspector/application/inspect-profile.ts`
  - `src/modules/inspector/application/deterministic-narrator.ts`
  - `src/modules/inspector/index.ts`
  - `src/modules/inspector/application/inspect-profile.test.ts`

## 3. Implementation Plan

### Step 1 — Domain types
Define `PublicProfile`, `PublicMedia`, `PublicComment`, `ProfileInspectionResult`, `DemographicEstimate`, `AudienceQuality`, `TopContentItem`, and `GrowthTrend` in `src/modules/inspector/domain/types.ts`.

### Step 2 — Ports
Define `ProfileFetcher` and `ProfileNarrator` in `src/modules/inspector/application/ports.ts` so the core is testable and can be wired to Meta/OpenRouter later.

### Step 3 — inspectProfile use-case
Implement `inspectProfile` in `src/modules/inspector/application/inspect-profile.ts`:
- Fetch public profile data via `ProfileFetcher`.
- Run `profileQuality` from `@/modules/analytics/pure` for the audience-quality score.
- Compute engagement rate, top content (by `engagementScore`), demographic estimates from locations/hashtags/comments, and growth trend from follower snapshots.
- Build `ProfileInspectionResult` with confidence tiers.
- Pass the deterministic result to `ProfileNarrator` for prose.

### Step 4 — Default narrator
Implement a deterministic `deterministicProfileNarrator` that assembles prose from the deterministic result.

### Step 5 — Public barrel and tests
Export everything from `src/modules/inspector/index.ts` and add unit tests with fake `ProfileFetcher` and narrator.

## 4. Subtasks

- [x] T-087: Define `inspector` domain types.
- [x] T-087: Define `ProfileFetcher` and `ProfileNarrator` ports.
- [x] T-087: Implement deterministic `inspectProfile` use-case.
- [x] T-087: Implement deterministic `ProfileNarrator`.
- [x] Export public contract from `src/modules/inspector/index.ts`.
- [x] Add unit tests for `inspectProfile`.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.
- [x] `docs/requirements/REQ-0085-profile-reel-inspector.md` updated.

## 5. Acceptance Criteria

- `inspectProfile` returns a `ProfileInspectionResult` with deterministic audience quality, engagement rate, demographics, top content, and growth trend.
- `ProfileFetcher` and `ProfileNarrator` are clean ports with no Meta/OpenRouter dependencies in the core.
- Confidence tiers follow high (70%+), medium (40-70%), low (<40%).
- All quality gates pass.

## 6. Notes / Blockers

- Local MiniLM `TransformersEmbeddingProvider` is deferred to Batch 9.
- Meta Business Discovery API adapter, AI demographic estimator, Inspector UI, and plan limits are deferred to later work.
