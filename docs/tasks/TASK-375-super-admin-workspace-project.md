# Task TASK-375: Super-Admin Dashboard, Workspaces/Projects, and Auth Improvements

- **Status:** In Progress
- **Spec:** docs/specs/0051-super-admin-workspace-project.md
- **Module(s):** auth, users, organizations, shared
- **Owner:** Devin
- **Changelog entry:** Super-admin auth + dashboard, forgot password, and Project model under workspace.

## Description

Implement the auth/admin/workspace refactor described in spec 0051. Repurpose the existing `Organization` table as the workspace, add a `Project` layer for Instagram-account-level work, and build the super-admin experience.

## Subtasks

Documentation & planning (this session):

- [x] Finalize spec 0051 with full data model, contracts, and security/edge-case notes.
- [x] Create task file and update `CHANGELOG.md` In Progress section.

Implementation (deferred to next dev session):

- [ ] Add super-admin env config (email, phone, password) and seed script.
- [ ] Implement email-based MFA for super-admin login.
- [ ] Implement forgot-password request + reset flow.
- [ ] Add `/admin` dashboard and sub-pages (users, workspaces, billing, tickets).
- [ ] Add `Project`/`ProjectMember` Prisma models and migration.
- [ ] Add project create/list server actions and UI.
- [ ] Move to Done and update `CHANGELOG.md`.
- [ ] Run lint + typecheck + tests.

## Acceptance Criteria

- [ ] Matches spec 0051 acceptance criteria.
- [ ] Lint + typecheck + tests pass.
- [ ] `CHANGELOG.md` updated.

## Notes / Blockers

- The `Organization` table and `organizationId` references remain in place this phase; project lives under `Organization` (workspace).
- Email provider (SMTP) only required in production; dev mode logs tokens.
- A partial code scaffold has been started (schema/env/auth files) and should be reviewed/continued in the implementation session.
