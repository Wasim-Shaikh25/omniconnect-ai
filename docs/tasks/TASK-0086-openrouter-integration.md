# TASK-0086: OpenRouter Integration

- **Status:** In Progress
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0086-openrouter-integration.md`
- **Tracker:** `docs/trackers/TRACKER-0086-openrouter-integration.md`
- **Module(s):** ai
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — OpenRouter client, model routing, replace OpenAI.
- **Last updated:** 2026-08-05

## 1. Summary

Replace direct OpenAI with OpenRouter gateway. Build client, per-feature model routing, plan-based model restrictions, usage tracking. Replace all OpenAI imports.

## 2. References

- Requirement: `docs/requirements/REQ-0086-openrouter-integration.md`
- Related files:
  - `src/modules/ai/infrastructure/openrouter-client.ts` (new)
  - `src/modules/ai/application/model-router.ts` (new)
  - `src/modules/ai/infrastructure/openai-provider.ts` (replace)

## 3. Implementation Plan

### Step 1 — OpenRouterClient
API wrapper: `chat()` with streaming, tool calling, response_format. Usage tracking per request.

### Step 2 — Per-Feature Model Routing
`getModelForFeature()`: priority chain project override → env config → default. Features: reply, dashboard, content, inspector, analysis.

### Step 3 — Plan Validation
`validateModelAccess()`: check model against plan.allowedModels before API call.

### Step 4 — Replace OpenAI Imports
Find and replace all `openai-provider` imports with `openrouter-client`. Update all AI callers.

### Step 5 — Usage Tracking
- Add `TokenUsageRepository` port and `PrismaTokenUsageRepository` implementation (`src/modules/ai/infrastructure/token-usage.repository.ts`).
- Extend `AICompletionConfig` with `operation` and `metadata` (`src/modules/ai/application/ports.ts`).
- Wire `OpenRouterProvider` to call `tokenUsageRepository.create()` after each `client.chat()` response with `userId`, `projectId`, `feature`, model, tokens, and cost.
- Pass `operation`/`metadata` from every `AIContext` caller in `src/modules/ai/application/*`.
- Add super-admin usage dashboard at `src/app/admin/ai-usage/page.tsx` and link it in `src/app/admin/layout.tsx`.

## 4. Subtasks

- [x] T-016: OpenRouter client (API wrapper, streaming, tools)
- [x] T-017: Replace all OpenAI imports with OpenRouter
- [x] T-061: Per-feature model routing + plan validation
- [x] T-062: AI usage tracking (tokens/model/feature/day)

## 5. Acceptance Criteria

- [x] T-016/T-017/T-061/T-062 acceptance criteria met.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- No dependencies — can start immediately (T-016).
