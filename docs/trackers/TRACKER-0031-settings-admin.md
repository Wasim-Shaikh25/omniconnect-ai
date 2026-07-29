# TRACKER-0031: Settings & Administration

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0031-settings-admin.md`
- **Task:** `docs/tasks/TASK-0031-settings-admin.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0031.

## 2. Subtasks

### Planning
- [ ] Requirement approved and task created.

### Implementation / Verification
- [ ] Spec created and linked to backlog.
- [ ] `AuditLog` model + migration.
- [ ] `audit` module with list/create use-cases, repository, and server actions.
- [ ] `/settings/audit` renders audit entries (admin and store owner).
- [ ] `/settings/billing` placeholder page (admin and store owner).
- [ ] `/settings` links to Audit and Billing.
- [ ] `changeUserRoleAction` records an audit entry.
- [ ] Lint + typecheck + build pass.
- [ ] CHANGELOG.md and backlog updated.

### Quality Gates
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] `CHANGELOG.md` updated.

## 3. Acceptance Criteria

- [ ] All linked requirement acceptance criteria are met.
- [ ] All quality gates pass.

## 4. Notes / Blockers

- Migrated from legacy spec `docs/specs/0031-settings-admin.md`.
