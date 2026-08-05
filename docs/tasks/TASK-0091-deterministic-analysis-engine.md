# TASK-0091: Deterministic Analysis Engine (Batch 5 — profile_quality)

- **Status:** Completed
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- **Tracker:** `docs/trackers/TRACKER-0091-deterministic-analysis-engine.md`
- **Module(s):** analytics
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Profile quality deterministic operation.
- **Last updated:** 2026-08-05

## 1. Summary

Fifth batch of REQ-0091. Implement the final pure deterministic operation `profile_quality` for the `AnalysisEngine` vocabulary. It scores an Instagram/TikTok-style profile from public signals (follower count, media count, engagement rates, captions, hashtags, locations, and comments) without any AI or external dependencies. `EmbeddingProvider`, `OperationResolver`, golden tests, and dashboard wiring are deferred to Batch 6.

## 2. References

- Architecture: `docs/specs/current-state.md`
- Requirement: `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- Tracker: `docs/trackers/TRACKER-0091-deterministic-analysis-engine.md`
- Related files:
  - `src/modules/analytics/application/operations/profile-quality.ts`
  - `src/modules/analytics/application/analysis-engine.ts`
  - `src/modules/analytics/pure.ts`
  - `src/modules/analytics/index.ts`

## 3. Implementation Plan

### Step 1 — profile_quality
Create `profile-quality.ts` that accepts a `ProfileQualityDataset` with `profile`, `media` array, and `comments` array. It computes a deterministic audience quality score from:
- `engagementRate` (avg likes+comments per post / follower count)
- `followerToMediaRatio`
- `contentDiversity` (unique hashtags / total hashtags)
- `geoDiversity` (unique locations)
- `captionConsistency` (avg caption length / variability)
- `spamRisk` (repeated comments, excessive hashtags, suspicious engagement ratios)

Returns an `AnalysisResult` with `profileQuality`, `engagementRate`, `authenticityScore`, `contentDiversity`, `spamRisk`, `geoDiversity`, evidence, and confidence/dataQuality labels.

### Step 2 — Register and export
Export `profileQuality` from `src/modules/analytics/pure.ts` and `src/modules/analytics/index.ts`.

### Step 3 — Tests
Add unit tests covering high/medium/low quality profiles, spam signals, and empty input.

## 4. Subtasks

- [x] T-087a: Implement `profile_quality` deterministic operation.
- [x] Export `profileQuality` from `analytics/pure.ts` and `analytics/index.ts`.
- [x] Add unit tests for `profile_quality`.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.

## 5. Acceptance Criteria

- `profile_quality` computes a deterministic audience-quality score and component metrics from public profile/media/comment signals.
- It does not require an LLM or network call.
- It returns `confidence` and `dataQuality` based on input size and signal strength.
- Unit tests cover high-quality, medium-quality, low-quality/spam, and empty profiles.
- All quality gates pass.

## 6. Notes / Blockers

- `EmbeddingProvider` (T-081), `OperationResolver` (T-082), `queryAnalytics`/`generateDashboard` wiring (T-084), Profile Inspector feature integration (T-087 full), and golden tests (T-088) are deferred to Batch 6.
