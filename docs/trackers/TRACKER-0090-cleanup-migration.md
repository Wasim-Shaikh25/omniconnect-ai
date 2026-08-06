# TRACKER-0090: Cleanup & Migration

- **Status:** Implemented
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0090-cleanup-migration.md`
- **Task:** `docs/tasks/TASK-0090-cleanup-migration.md`
- **Last updated:** 2026-08-06 (acceptance criteria verified and closed)

## 1. Summary

Progress tracker for REQ-0090: Cleanup & Migration.

## 2. Subtasks

### Planning
- [x] Requirement REQ-0090 approved.
- [x] Task file TASK-0090 created.
- [x] Branch created (`devin/batch-1-openrouter-1785912057`).

### Implementation
- [x] T-001: Delete Organization/Store/Staff/StoreIntegration models.
- [x] T-007: Prisma `generate` passes; migration `20260805064000_v2_phase1_workspace_project` generated and applied to a local PostgreSQL instance.
- [x] T-019: Delete organizations module entirely.
- [x] T-037: Delete hardcoded connectors.
- [x] T-038: Delete overscoped features (product CRUD, standalone views, obsolete scripts).
  - [x] T-038a: Delete obsolete verification/maintenance scripts.
  - [x] T-038b: Delete product CRUD actions, standalone orders view, store lifecycle remnants.
- [x] T-018: Update all queries (org/store → user/workspace/project).
  - [x] T-018a: Mechanical rename completed for `organizationId→userId` / `storeId→projectId`.
  - [x] T-018b: Prisma model accessors replaced; schema fields aligned (`User.projectId`, `Customer.tags` added) to fix repository mappings.
  - [x] T-018c: Session/auth context carries `userId`/`projectId` from JWT.
- [x] T-039: `src/modules/workspaces` module created from old `organizations` module; internal Prisma refs and public contract adapted to the V2 schema.
- [x] Replace OpenAI with OpenRouter (`OpenRouterProvider` wired into the AI module composition root).

### Verification
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated (workspace/project/ecommerce connection contracts and roles).

## 3. Acceptance Criteria

- [x] Phase 1 acceptance criteria met (schema migration, query migration, OpenRouter wiring, quality gates).
- [x] All verification steps above pass.

## 4. Notes / Blockers

- Status: Phase 1 foundation complete; PR-ready pending review.
