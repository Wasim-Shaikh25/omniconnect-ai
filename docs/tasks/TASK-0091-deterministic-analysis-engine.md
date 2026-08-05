# TASK-0091: Deterministic Analysis Engine (Batch 9 — TransformersEmbeddingProvider + inspector adapters)

- **Status:** Completed
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- **Tracker:** `docs/trackers/TRACKER-0091-deterministic-analysis-engine.md`
- **Module(s):** analytics, inspector, ai
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — MiniLM adapter + inspector adapters.
- **Last updated:** 2026-08-05

## 1. Summary

Ninth and final batch of REQ-0091. Added a `TransformersEmbeddingProvider` adapter using `@xenova/transformers` with `local_files_only: true` and a keyword fallback when no local MiniLM model is configured or loading fails. Added `makeMetaProfileFetcher` and `makeOpenRouterProfileNarrator` infrastructure adapters behind the `inspector` ports so `inspectProfile` can be wired to real Meta/OpenRouter data sources. All adapters are exported from the public module barrels.

## 2. References

- Architecture: `docs/specs/current-state.md`
- Requirement: `docs/requirements/REQ-0091-deterministic-analysis-engine.md`
- Related: `docs/requirements/REQ-0085-profile-reel-inspector.md`
- Related files:
  - `src/modules/analytics/infrastructure/transformers-embedding-provider.ts`
  - `src/modules/analytics/infrastructure/transformers-embedding-provider.test.ts`
  - `src/modules/inspector/infrastructure/open-router-profile-narrator.ts`
  - `src/modules/inspector/infrastructure/open-router-profile-narrator.test.ts`
  - `src/modules/inspector/infrastructure/meta-profile-fetcher.ts`
  - `src/modules/inspector/infrastructure/meta-profile-fetcher.test.ts`
  - `src/modules/analytics/index.ts`
  - `src/modules/inspector/index.ts`

## 3. Implementation Plan

### Step 1 — TransformersEmbeddingProvider
- Added `@xenova/transformers@2.17.2` to `dependencies`.
- Implemented `TransformersEmbeddingProvider` in `src/modules/analytics/infrastructure/transformers-embedding-provider.ts`.
- Constructor accepts `modelPath` and an optional `fallback` `EmbeddingProvider`.
- `embed(text)` dynamically imports `@xenova/transformers`, calls `pipeline("feature-extraction", modelPath, { local_files_only: true })`, mean-pools the output tensor, and returns a `number[]`.
- Falls back to the keyword provider when `modelPath` is empty or when model loading/inference fails.
- `cosine(a, b)` delegates to the fallback.

### Step 2 — OpenRouterProfileNarrator
- Implemented `makeOpenRouterProfileNarrator(aiProvider, model)` in `src/modules/inspector/infrastructure/open-router-profile-narrator.ts`.
- Builds a prompt from `ProfileInspectionResult` (minus narration) and calls `aiProvider.complete`.
- Instructs the LLM to describe the profile using only the provided deterministic numbers.

### Step 3 — MetaProfileFetcher
- Implemented `makeMetaProfileFetcher(config)` in `src/modules/inspector/infrastructure/meta-profile-fetcher.ts`.
- Config: `baseUrl`, `apiVersion`, `getAccessToken(projectId)`, `fetch`, `mediaLimit`, `commentLimit`.
- Calls Meta Graph API `business_discovery` for the requested username.
- Fetches `text` comments for each media item.
- Transforms response into `PublicProfile`, `PublicMedia`, `PublicComment`.
- Throws typed `NoMetaAccessError`, `ProfileNotFoundError`, or `MetaApiError`.

### Step 4 — Exports and tests
- Exported `TransformersEmbeddingProvider` from `src/modules/analytics/index.ts`.
- Exported `makeOpenRouterProfileNarrator`, `makeMetaProfileFetcher`, and error classes from `src/modules/inspector/index.ts`.
- Added unit tests for all three adapters.

## 4. Subtasks

- [x] T-081: Add `@xenova/transformers` dependency.
- [x] T-081: Implement `TransformersEmbeddingProvider` with local-only model loading and fallback.
- [x] T-087: Implement `OpenRouterProfileNarrator` adapter.
- [x] T-087: Implement `MetaProfileFetcher` adapter.
- [x] Export adapters from module public barrels.
- [x] Add unit tests for all adapters.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.

## 5. Acceptance Criteria

- `TransformersEmbeddingProvider` can load a local MiniLM model (or fall back to keyword embeddings) without any network calls.
- `OpenRouterProfileNarrator` sends deterministic profile data to an `AIProvider` and returns prose.
- `MetaProfileFetcher` translates Meta Business Discovery JSON into the `PublicProfile` contract.
- All adapters are behind the existing ports and do not leak into the core use-cases.
- All quality gates pass.

## 6. Notes / Blockers

- The local MiniLM model files are not bundled; `modelPath` must point to an existing local ONNX / transformers model directory (e.g. downloaded with `git lfs` or cached offline).
- The next step for the inspector is wiring these adapters into server actions / route handlers and building the UI.
