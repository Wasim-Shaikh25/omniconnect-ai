# TRACKER-0008: Human Takeover

- **Status:** Superseded — see REQ-0080
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0008-human-takeover.md`
- **Task:** `docs/tasks/TASK-0008-human-takeover.md`
- **Last updated:** 2026-07-29

> **⚠️ SUPERSEDED (Platform V2)** — replaced by:
> - `docs/trackers/TRACKER-0080-unified-messaging-board.md`
> Retained for historical reference only. Do not use for new implementation.

## 1. Summary

Progress tracker for REQ-0008.

## 2. Subtasks

### Planning
- [x] Requirement approved and task created.

### Implementation / Verification
- [x] `ConversationService` port and `takeOver`/`resumeAI` use-cases implemented.
- [x] `generateReply` checks status and skips `HUMAN_ACTIVE` conversations.
- [x] Server actions `takeOverConversationAction` and `resumeAIConversationAction` exposed and RBAC-gated.
- [x] Conversations list page `/stores/[storeId]/conversations` implemented with status and actions.
- [x] Store detail page links to conversations list.
- [x] Dev simulator can exercise a message, takeover, and resume flow.
- [x] Lint + typecheck + build pass; `CHANGELOG.md` and `docs/tasks/backlog.md` updated.

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

- Migrated from legacy spec `docs/specs/0008-human-takeover.md`.
