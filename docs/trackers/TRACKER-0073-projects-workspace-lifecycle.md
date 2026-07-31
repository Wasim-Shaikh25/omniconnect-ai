# TRACKER-0073: Projects and Workspace Lifecycle

- **Status:** Blocked (awaiting the Q1 decision)
- **Owner:** Product / Backend / Frontend
- **Requirement:** `docs/requirements/REQ-0073-projects-workspace-lifecycle.md`
- **Task:** `docs/tasks/TASK-0073-projects-workspace-lifecycle.md`
- **Last updated:** 2026-07-31

## 1. Summary

Resolves the orphaned Projects backend (`PRODUCTION_READINESS_AUDIT.md` §3.5 #1, §3.6 Q1, M3, H5,
§8.4) and documents the workspace model. Two mutually exclusive paths — ship the UI or remove the
feature. Recommendation: **remove**.

## 2. Subtasks

### Decision gate
- [ ] **Q1 answered:** ship or remove, recorded in the task file with date and owner.
- [ ] **Q2 answered:** `STAFF` landing page.
- [ ] Multi-workspace policy answered.
- [ ] (Ship only) Project scoping model answered — scope or label?

### Path A — Ship *(skip if Q1 = remove)*
- [ ] `REQ-0067` H5 landed as a prerequisite.
- [ ] `integrationId` added to the schema with cross-tenant ownership validation.
- [ ] `/projects` list page shipped with an archived toggle.
- [ ] `/projects/new` create form shipped.
- [ ] `/projects/[id]` detail with edit, members, archive, restore shipped.
- [ ] "Projects" added to the sidebar.
- [ ] Route-coverage expectations updated.
- [ ] Onboarding prompt or dashboard empty state added.
- [ ] Test: create.
- [ ] Test: duplicate name rejected via the database constraint.
- [ ] Test: archive keeps the row and its members.
- [ ] Test: archived excluded from the default list.
- [ ] Test: restore round-trip.
- [ ] Test: cross-tenant access denied.
- [ ] Test: foreign `integrationId` rejected.

### Path B — Remove *(skip if Q1 = ship)*
- [ ] `Project` / `ProjectMember` row counts checked.
- [ ] Rows exported if non-zero; location recorded.
- [ ] `project-actions.ts` deleted.
- [ ] `project.repository.ts` deleted.
- [ ] Project application service and types deleted.
- [ ] Module barrel exports removed.
- [ ] Project domain events removed and reflected in the event registry.
- [ ] Models removed from `schema.prisma`.
- [ ] Back-relations removed from `User`, `Organization`, `Integration`.
- [ ] Migration generated and SQL reviewed by hand.
- [ ] Residual reference sweep clean.
- [ ] `docs/specs/current-state.md` updated.
- [ ] `REQ-0067` H5 cross-referenced as resolved by removal.
- [ ] Charter documentation updated.

### Package C — Workspace scope *(both paths)*
- [ ] Multi-workspace policy documented in `docs/specs/current-state.md`.
- [ ] Second-organization invite behaviour verified and documented.
- [ ] `STAFF` landing implemented per Q2.
- [ ] Test: `STAFF` with a store redirects; without a store does not loop.
- [ ] Onboarding outcome documented.

### Verification
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm audit` reports 0 vulnerabilities.
- [ ] `npm run build` passes.
- [ ] `npm run build:worker` passes.
- [ ] Migrations apply cleanly with no drift.
- [ ] No unused-export or dead-code lint warnings remain.
- [ ] `CHANGELOG.md` updated.
- [ ] `docs/specs/current-state.md` updated.

## 3. Acceptance Criteria

- [ ] All acceptance criteria for the chosen option in `REQ-0073` are met.
- [ ] `REQ-0073` §7 workspace-scope criteria are met.
- [ ] No reachable mutating server action lacks a user interface.

## 4. Notes / Blockers

- **BLOCKED on Q1.** Answer it before `REQ-0067` H5's schema migration is written — under Path B
  that migration is wasted work.
- Under Path B, `REQ-0069` L1 must classify the removed project events as **Removed**.
- Under Path A, `REQ-0069` L2's route-coverage test must include `/projects`.
