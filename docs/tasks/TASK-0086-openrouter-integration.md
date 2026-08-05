# TASK-0086: OpenRouter Integration

- **Status:** Todo
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
Record per request: model, promptTokens, completionTokens, cost. Dashboard for super admin.

## 4. Subtasks

- [x] T-016: OpenRouter client (API wrapper, streaming, tools)
- [ ] T-017: Replace all OpenAI imports with OpenRouter
- [x] T-061: Per-feature model routing + plan validation
- [ ] T-062: AI usage tracking (tokens/model/feature/day)

## 5. Acceptance Criteria

- [ ] Matches REQ-0086 acceptance criteria.
- [ ] Lint + typecheck + tests pass.
- [ ] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- No dependencies — can start immediately (T-016).
