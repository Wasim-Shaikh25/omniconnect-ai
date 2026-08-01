# REQ-0073: Projects and Workspace Lifecycle — Decision and Implementation

- **Status:** In Progress — Q1 resolved: Option B (remove the Projects feature), 2026-08-01
- **Owner:** Product / Backend / Frontend
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0073-projects-workspace-lifecycle.md`
- **Related Tracker:** `docs/trackers/TRACKER-0073-projects-workspace-lifecycle.md`
- **Source audit:** `PRODUCTION_READINESS_AUDIT.md` §3.5 #1, §3.6 Q1 and Q2, §4 M3, §4 H5, §8.4
- **Remediation index:** `docs/audit/2026-07-31-remediation-index.md`
- **Last updated:** 2026-07-31

## 1. Summary

`Project` is half-shipped. Two Prisma models, a repository, an application service, and six server
actions exist. There is no `/projects` route, no navigation entry, and no page anywhere in
`src/app` that references any project action — yet three of those actions call
`revalidatePath("/projects")`, a route that does not exist. The intended model is "one project =
one Instagram/Meta identity", which is a real product concept: `Project.instagramHandle` and
`Project.integrationId` are both in the schema.

This is the worst of both states. Reachable, mutating, unauthenticated-by-UI server actions with no
interface, one of which — `archiveProject` — hard-deletes the row and cascades to every
`ProjectMember`. `TASK-0061` removed the `/projects` route as part of a charter cleanup but left the
backend in place.

The decision is binary and must be made before any code is written: **ship the feature** or
**remove it**. Both paths are specified below so implementation can start the moment the decision
lands.

## 2. Verified current state (re-checked at commit `33e2e0b`, 2026-07-31)

| Item | State | Evidence |
|---|---|---|
| `Project` / `ProjectMember` models | ✅ exist | `prisma/schema.prisma:186-214`; `ProjectMember.project … onDelete: Cascade` |
| `Project.archivedAt` | ❌ absent | No soft-delete column (unlike `Product`, `Store`, `User`) |
| `@@unique([organizationId, name])` | ❌ absent | Uniqueness enforced only by a racy application check |
| Repository | ✅ exists | `src/modules/organizations/infrastructure/project.repository.ts` |
| Server actions | ✅ 6 exist | `src/modules/organizations/presentation/project-actions.ts` |
| `/projects` route | ❌ absent | `find src/app -ipath '*project*'` → no output |
| Any UI reference | ❌ absent | `grep -rn "createProjectAction\|listProjectsAction" src --include=*.tsx` → no output |
| `revalidatePath("/projects")` | ⚠️ present | Targets a non-existent route |
| `archive` behaviour | ⚠️ hard delete | `prisma.project.delete` — see `REQ-0067` H5 |
| Multi-workspace switching | ❌ absent | Organizations are auto-created at onboarding; no create/switch UI |
| Onboarding creates a project | ❌ no | Onboarding names an organization and lands on `/dashboard` |
| `STAFF` landing experience | 🟡 shared | `STAFF` shares the multi-store `/dashboard` (Q2) |

## 3. Decision gate (Q1)

**This requirement cannot start until Q1 is answered.**

| Option | Meaning | Consequence |
|---|---|---|
| **A — Ship** | Projects are a planned feature; build the UI | `REQ-0067` H5 (soft archive) is a hard prerequisite; §5 applies |
| **B — Remove** | Projects were abandoned scaffolding | Delete models, repository, service, actions, and events; §6 applies; `REQ-0067` H5 reduces to "delete the code" |

**Recommendation: Option B (remove), unless a project-scoped IG identity is on the near-term
roadmap.** The product already scopes by `Store` and by `Integration`; `Project` currently
duplicates that scoping with no consumer. Removing it deletes a hard-delete hazard and ~500 lines of
unreachable code. If the roadmap needs it later, re-adding a model is cheap; carrying an
unreachable mutating surface into production is not.

## 4. Goals (both options)

- No reachable mutating server action exists without a user interface.
- No operation named "archive" destroys data.
- The workspace model in the product matches the workspace model in the documentation.

## 5. Option A — Ship the feature

### 5.1 Goals
- A project represents exactly one Instagram/Meta identity inside a workspace.
- Projects are creatable, listable, editable, archivable, and restorable.
- Project membership is manageable and survives archiving.

### 5.2 Acceptance criteria
- `REQ-0067` H5 is complete first: `archivedAt`, `@@unique([organizationId, name])`, *(N/A under Option B)*
      `updateMany`-based archive, `restore`, archived rows excluded from default lists.
- `/projects` lists the organization's active projects with name, IG handle, linked *(N/A under Option B)*
      integration, member count, and created date.
- An "Include archived" toggle reveals archived projects with a restore action. *(N/A under Option B)*
- `/projects/new` creates a project with name (required), description, Instagram handle, and an *(N/A under Option B)*
      optional `Integration` link.
- Duplicate names are rejected by the database constraint with a friendly message, not by a *(N/A under Option B)*
      check-then-insert race (M3).
- `/projects/[id]` shows detail and allows editing name, description, and handle. *(N/A under Option B)*
- Members can be added and removed with a role; changes are audited. *(N/A under Option B)*
- Archive requires confirmation and states that it is reversible. *(N/A under Option B)*
- All project actions enforce tenant scope and RBAC (`STORE_OWNER`+ to mutate). *(N/A under Option B)*
- "Projects" appears in the sidebar (satisfying the `REQ-0069` L2 route-coverage test). *(N/A under Option B)*
- `revalidatePath("/projects")` now targets a real route. *(N/A under Option B)*
- `Project.integrationId` is exposed in the create/edit schema (currently a column with no *(N/A under Option B)*
      action-level support).
- Onboarding offers first-project creation, or explicitly defers it with a dashboard prompt. *(N/A under Option B)*
- Tests: create, duplicate-name rejection, archive/restore round-trip, member add/remove, *(N/A under Option B)*
      cross-tenant access denied, archived excluded from lists.

## 6. Option B — Remove the feature

### 6.1 Goals
- Zero unreachable mutating code paths remain.
- No data is lost that anyone depends on.

### 6.2 Acceptance criteria
- [x] A production data check confirms `Project` and `ProjectMember` row counts; if non-zero, the
      rows are exported to durable storage before the migration and the export location is recorded.
      *(Checked: 0/0; no export required.)*
- [x] `src/modules/organizations/presentation/project-actions.ts` is deleted.
- [x] `src/modules/organizations/infrastructure/project.repository.ts` is deleted.
- [x] The project application service and any barrel exports are deleted.
- [x] `Project` and `ProjectMember` models and the `User.projectMembers` / `Organization.projects` /
      `Integration` relations are removed with a migration.
- [x] Any project-related domain events are removed and reflected in the `REQ-0069` L1 event
      registry. *(No Project events existed; note added to TASK-0069 Step 1.)*
- [x] `grep -rn "Project\|project" src --include=*.ts --include=*.tsx | grep -vi "projection\|projected"`
      returns zero functional matches; the residual list is recorded in the task.
- [x] `docs/specs/current-state.md` and any requirement referencing Projects are updated to state
      the feature was removed, with the date and reason.
- [x] `REQ-0067` H5 is closed as "resolved by removal" with a cross-reference.
- [x] Lint, typecheck, tests, and build pass with no unused-export or dead-code warnings.

## 7. Workspace scope (both options)

Independent of Q1, the workspace model has gaps:

- [x] **Multi-workspace:** decide whether a user may belong to or create more than one
      organization. If yes, a workspace switcher and a create-workspace flow are required. If no,
      document the single-workspace-per-user model in `docs/specs/current-state.md` so it stops
      being an implicit assumption. **Default: single workspace; document it.** *(Documented in
      `docs/specs/current-state.md` §7.5.)*
- [x] **Q2 — `STAFF` landing:** decide whether a store-pinned staff member gets a store-scoped home
      instead of the multi-store `/dashboard`. **Default: yes — redirect `STAFF` to
      `/stores/{their-store-id}`,** since the multi-store dashboard is built around a selection a
      pinned user cannot make. Implement or record the decision explicitly. *(Implemented in
      `src/app/dashboard/page.tsx`.)*
- [x] The onboarding flow's outcome is documented: what exists immediately after signup, and what
      the user is prompted to do next. *(Documented in `docs/specs/current-state.md` §8.1.)*

## 8. Scope & Dependencies

**Modules affected:** `organizations`, `auth` (STAFF landing), presentation shell.

**Depends on:** `REQ-0067` H5 — under Option A it is a prerequisite; under Option B it is
superseded. Resolve Q1 before starting H5's schema work so the migration is not written twice.

**Blocks:** the `REQ-0069` L1 event registry (project events must be classified) and the L2 route
coverage test (Projects must be either navigable or absent).

## 9. Open Questions

1. **Q1 — ship or remove?** *(blocking; recommendation: remove)*
2. **Q2 — `STAFF` landing page?** *(default: store-scoped home)*
3. Multi-workspace membership — supported or explicitly single? *(default: single, documented)*
4. If Option A: does a project scope conversations and analytics, or is it only a label? An
   unanswered scoping model is how `Project` became orphaned in the first place. *(must be answered
   before building the UI)*
