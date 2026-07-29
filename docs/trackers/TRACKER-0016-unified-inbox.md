# TRACKER-0016: Unified Inbox (Global Conversation Triage)

- **Status:** Done
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0016-unified-inbox.md`
- **Task:** `docs/tasks/TASK-0016-unified-inbox.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0016.

## 2. Subtasks

### Planning
- [x] Requirement approved and task created.

### Implementation / Verification
- [x] Spec created and linked to backlog.
- [x] `/inbox` renders all organization conversations with latest message.
- [x] Channel, status, and search filters work.
- [x] Takeover/resume actions update status and revalidate inbox.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

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

- Migrated from legacy spec `docs/specs/0016-unified-inbox.md`.
