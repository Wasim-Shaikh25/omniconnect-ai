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
- [x] T-001: Delete Organization/Store/Staff/StoreIntegration models.
- [~] T-007: Run Prisma migration — generate and apply new schema (blocks T-014, T-018).
- [x] T-019: Delete organizations module entirely.
- [x] T-037: Delete hardcoded connectors.
- [~] T-038: Delete overscoped features (product CRUD, standalone views, obsolete scripts).
  - [ ] T-038a: Delete obsolete verification/maintenance scripts.
  - [ ] T-038b: Delete product CRUD actions, standalone orders view, store lifecycle remnants.
- [~] T-018: Update all queries (org/store → user/workspace/project).
  - [ ] T-018a: Rename `organizationId` → `userId` and `storeId` → `projectId`.
  - [ ] T-018b: Replace `prisma.organization`/`prisma.store`/`prisma.integration`.
  - [ ] T-018c: Update session/auth context to carry `userId`/`projectId`.
- [~] Replace OpenAI with OpenRouter (client + model router done; wiring in progress — T-017).
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
