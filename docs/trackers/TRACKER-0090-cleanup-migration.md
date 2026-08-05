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
- [~] T-007: Prisma `generate` passes on the V2 schema; migration still needs to be applied to a live DB.
- [x] T-019: Delete organizations module entirely.
- [x] T-037: Delete hardcoded connectors.
- [~] T-038: Delete overscoped features (product CRUD, standalone views, obsolete scripts).
  - [x] T-038a: Delete obsolete verification/maintenance scripts.
  - [ ] T-038b: Delete product CRUD actions, standalone orders view, store lifecycle remnants.
- [~] T-018: Update all queries (org/store → user/workspace/project).
  - [x] T-018a: Mechanical rename completed for `organizationId→userId` / `storeId→projectId` (AST-safe dedup applied to 47 files).
  - [~] T-018b: Prisma model accessors replaced; schema fields aligned (`User.projectId`, `Customer.tags` added) to fix repository mappings.
  - [x] T-018c: Session/auth context carries `userId`/`projectId` from JWT.
- [~] T-039: `src/modules/workspaces` shell created from old `organizations` module; internal Prisma refs and public contract must be adapted.
- [~] Replace OpenAI with OpenRouter (client + model router done; wiring in progress — T-017).
- [~] Fix all TypeScript compilation errors — `npx tsc --noEmit` down to ~220 errors (from ~1000); remaining errors are in `workspaces`, `ecommerce`, `support` repository manual types.

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
