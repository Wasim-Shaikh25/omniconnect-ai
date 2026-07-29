# TRACKER-0052: Super-Admin Login, Workspace/Project Model, and Auth Improvements

- **Status:** Done
- **Owner:** Devin
- **Requirement:** `docs/requirements/REQ-0052-super-admin-workspace-project-auth-improvements.md`
- **Task:** `docs/tasks/TASK-0052-super-admin-workspace-project-auth-improvements.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0052.

## 2. Subtasks

### Planning
- [x] Requirement approved and task created.

### Implementation / Verification
- [x] Spec `0052` and task `TASK-376` created/updated.
- [x] Prisma migration adds `User.phone`, `Project`, and `ProjectMember`.
- [x] `ensureSuperAdmin()` creates the hardcoded admin with `isSuperAdmin = true`, `phone`, and a hashed password.
- [x] Super-admin login requires and validates an emailed MFA code.
- [x] Forgot-password request sends a code and the reset page updates the password.
- [x] Users can create/list/archive projects inside a workspace and assign members.
- [x] `CHANGELOG.md` updated.
- [x] `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test` pass.

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

- Migrated from legacy spec `docs/specs/0052-super-admin-workspace-project-auth-improvements.md`.
