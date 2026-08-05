# TRACKER-0004: AI Customer Assistant

- **Status:** Superseded — see REQ-0081
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0004-ai-assistant.md`
- **Task:** `docs/tasks/TASK-0004-ai-assistant.md`
- **Last updated:** 2026-07-29

> **⚠️ SUPERSEDED (Platform V2)** — replaced by:
> - `docs/trackers/TRACKER-0081-ai-assistant-tools.md`
> Retained for historical reference only. Do not use for new implementation.

## 1. Summary

Progress tracker for REQ-0004.

## 2. Subtasks

### Planning
- [x] Requirement approved and task created.

### Implementation / Verification
- [x] Domain modeled (`ReplyGenerated`, `EscalationRequested`).
- [x] `AIProvider` and `AssistantService` ports implemented; OpenAI provider shipped.
- [x] `AIConfigurationRepository` implemented in Prisma.
- [x] `generateReply` use-case assembles context and calls the provider.
- [x] AI subscribers wired to `NewMessage`; replies appended and sent outbound.
- [x] AI settings server action + form on store page.
- [x] Lint + typecheck pass; `CHANGELOG.md` updated.

### Quality Gates
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.

## 3. Acceptance Criteria

- [x] All linked requirement acceptance criteria are met.
- [x] All quality gates pass.

## 4. Notes / Blockers

- Migrated from legacy spec `docs/specs/0004-ai-assistant.md`.
