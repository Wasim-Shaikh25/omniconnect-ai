# TRACKER-0090: Cleanup & Migration

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0090-cleanup-migration.md`
- **Task:** `docs/tasks/TASK-0090-cleanup-migration.md`
- **Last updated:** 2026-08-05

## 1. Summary

Progress tracker for REQ-0090: Cleanup & Migration.

## 2. Subtasks

### Planning
- [ ] Requirement REQ-0090 approved.
- [ ] Task file TASK-0090 created.
- [ ] Branch created.

### Implementation
- [ ] T-001: Delete Organization/Store/Staff/StoreIntegration models.
- [ ] T-019: Delete organizations module entirely.
- [ ] T-037: Delete hardcoded connectors.
- [ ] T-038: Delete overscoped features (product CRUD, standalone views).
- [ ] T-018: Update all queries (org/store → user/workspace/project).
- [ ] Replace OpenAI with OpenRouter.
- [ ] Fix all TypeScript compilation errors.

### Verification
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] `CHANGELOG.md` updated.
- [ ] `docs/specs/current-state.md` updated if needed.

## 3. Acceptance Criteria

- [ ] All linked requirement acceptance criteria are met.
- [ ] All verification steps above pass.

## 4. Notes / Blockers

- Status: Todo — not yet started.
