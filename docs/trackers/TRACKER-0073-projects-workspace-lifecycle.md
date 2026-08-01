# TRACKER-0073: Projects and Workspace Lifecycle

- **Status:** In Progress — Path B (remove) + Package C
- **Owner:** Product / Backend / Frontend
- **Requirement:** `docs/requirements/REQ-0073-projects-workspace-lifecycle.md`
- **Task:** `docs/tasks/TASK-0073-projects-workspace-lifecycle.md`
- **Last updated:** 2026-08-01

## 1. Summary

Resolves the orphaned Projects backend (`PRODUCTION_READINESS_AUDIT.md` §3.5 #1, §3.6 Q1, M3, H5,
§8.4) and documents the workspace model. Two mutually exclusive paths — ship the UI or remove the
feature. Recommendation: **remove**.

## 2. Subtasks

### Decision gate
- [x] **Q1 answered:** Option B (remove), 2026-08-01, Devin.
- [x] **Q2 answered:** `STAFF` landing page — redirect `STAFF` with `storeId` to `/stores/{storeId}` (implemented in `src/app/dashboard/page.tsx`).
- [x] Multi-workspace policy answered — single workspace per user; document in `current-state.md`.
- [ ] ~~(Ship only) Project scoping model answered~~ — N/A under Option B.

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
- [x] `Project` / `ProjectMember` row counts checked (both 0; no export required).
- [x] ~~Rows exported if non-zero; location recorded.~~ — N/A (tables empty).
- [x] `project-actions.ts` deleted.
- [x] `project.repository.ts` deleted.
- [x] Project application service and types deleted.
- [x] Module barrel exports removed.
- [x] Project domain events removed (none existed) and reflected in `REQ-0069` L1 event registry.
- [x] Models removed from `schema.prisma`.
- [x] Back-relations removed from `User`, `Organization`, `Integration`.
- [x] Migration `20260801083128_remove_project_models` generated and SQL reviewed by hand.
- [x] Residual reference sweep clean (zero functional matches).
- [x] `docs/specs/current-state.md` updated.
- [x] `REQ-0067` H5 cross-referenced as resolved by removal.
- [x] Charter documentation updated (`REQ-0061-product-charter.md`).

### Package C — Workspace scope *(both paths)*
- [x] Multi-workspace policy documented in `docs/specs/current-state.md` (§7.5).
- [x] Second-organization invite behaviour verified and documented in `docs/specs/current-state.md` (§7.5).
- [x] `STAFF` landing implemented per Q2.
- [ ] Test: `STAFF` with a store redirects; without a store does not loop.
- [x] Onboarding outcome documented in `docs/specs/current-state.md` (§8.1).

### Verification
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm audit` reports 0 vulnerabilities.
- [x] `npm run build` passes.
- [x] `npm run build:worker` passes.
- [x] Migrations apply cleanly with no drift (`prisma migrate status` reports up to date).
- [x] No unused-export or dead-code lint warnings remain.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.

## 3. Acceptance Criteria

- [ ] All acceptance criteria for the chosen option in `REQ-0073` are met.
- [ ] `REQ-0073` §7 workspace-scope criteria are met.
- [ ] No reachable mutating server action lacks a user interface.

## 4. Notes / Blockers

- **BLOCKED on Q1.** Answer it before `REQ-0067` H5's schema migration is written — under Path B
  that migration is wasted work.
- Under Path B, `REQ-0069` L1 must classify the removed project events as **Removed**.
- Under Path A, `REQ-0069` L2's route-coverage test must include `/projects`.
