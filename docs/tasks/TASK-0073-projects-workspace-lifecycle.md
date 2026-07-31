# TASK-0073: Resolve and Implement the Projects / Workspace Lifecycle

- **Status:** Todo (blocked on the Q1 decision)
- **Owner:** Product / Backend / Frontend
- **Requirement:** `docs/requirements/REQ-0073-projects-workspace-lifecycle.md`
- **Tracker:** `docs/trackers/TRACKER-0073-projects-workspace-lifecycle.md`
- **Module(s):** `organizations`, `auth`, presentation shell
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Resolved the orphaned Projects backend (shipped UI / removed feature) and documented the workspace model.
- **Last updated:** 2026-07-31

## 1. Summary

Two mutually exclusive implementation paths plus a shared workspace-scope package. Execute Path A
**or** Path B — never both. Package C runs regardless.

**Do not start Path A or B until Q1 is answered and recorded in §6.**

## 2. References

- Audit: `PRODUCTION_READINESS_AUDIT.md` §3.5 #1, §3.6 Q1/Q2, §4 M3, §4 H5, §8.4
- Requirement: `docs/requirements/REQ-0073-projects-workspace-lifecycle.md`
- Interacts with: `docs/tasks/TASK-0067-release-blockers-critical-high.md` Step 9 (H5)
- Current code:
  - `prisma/schema.prisma:186-214`
  - `src/modules/organizations/infrastructure/project.repository.ts`
  - `src/modules/organizations/presentation/project-actions.ts`

## 3. Implementation Plan

---

## Path A — Ship the feature

### A1 — Prerequisite: land `REQ-0067` H5

Soft archive, unique constraint, `restore`, list filtering, and the `P2002` catch replacing the
check-then-insert race (M3). Do not build UI on a hard-delete backend.

### A2 — Expose `integrationId` in the action schema

The column exists but the create schema does not accept it, so a project can never be linked to the
Meta integration it is supposed to represent.

```typescript
export const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  instagramHandle: z
    .string()
    .regex(/^[A-Za-z0-9._]{1,30}$/, "Enter a valid Instagram handle")
    .optional(),
  integrationId: z.string().cuid().optional(),
});
```

Validate that `integrationId` belongs to the acting organization before persisting — otherwise it
is a cross-tenant reference.

### A3 — Routes

```
src/app/projects/page.tsx           list, with an "Include archived" toggle
src/app/projects/new/page.tsx       create form
src/app/projects/[id]/page.tsx      detail, edit, members, archive/restore
```

List page:

```tsx
export default async function ProjectsPage({
  searchParams,
}: { searchParams: Promise<{ archived?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { archived } = await searchParams;

  const projects = await listProjectsAction({
    organizationId: user.organizationId,
    includeArchived: archived === "1",
  });
  // ... table with name, IG handle, integration, member count, created
}
```

Detail page handles member add/remove with a role select, and archive/restore with a confirmation
dialog whose copy states the action is reversible.

### A4 — Navigation and revalidation

Add "Projects" to the sidebar (with a stable section `key`, per `REQ-0069` L3). The existing
`revalidatePath("/projects")` calls now target a real route. Add `/projects` to the `REQ-0069` L2
route-coverage expectations.

### A5 — Onboarding

Either add a "Create your first project" step to `OnboardingForm`, or add a dashboard empty-state
prompt. Record which in §6.

### A6 — Tests

Create; duplicate name rejected via `P2002` with a friendly message; archive keeps the row and its
members; archived excluded from the default list; restore round-trips; cross-tenant read and write
denied; `integrationId` from another organization rejected.

---

## Path B — Remove the feature *(recommended)*

### B1 — Data check before anything else

```sql
SELECT COUNT(*) FROM "Project";
SELECT COUNT(*) FROM "ProjectMember";
```

If either is non-zero, export before migrating:

```bash
psql "$DATABASE_URL" -c "\copy (SELECT * FROM \"Project\") TO 'project-backup.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\copy (SELECT * FROM \"ProjectMember\") TO 'project-member-backup.csv' CSV HEADER"
```

Record the export location and row counts in §6. Do not proceed until this is done.

### B2 — Delete application and presentation code

```bash
git rm src/modules/organizations/presentation/project-actions.ts
git rm src/modules/organizations/infrastructure/project.repository.ts
# plus the project application service and any project types
```

Remove every project export from the `organizations` module barrel. Delete project domain events
and reflect the removal in the `REQ-0069` L1 event registry.

### B3 — Schema migration

```prisma
// Remove entirely:
// model Project { … }
// model ProjectMember { … }

model User {
  // remove: projectMembers ProjectMember[]
}

model Organization {
  // remove: projects Project[]
}

model Integration {
  // remove the Project back-relation
}
```

`npx prisma migrate dev --name remove_project_models` generates the `DROP TABLE` statements. Review
the generated SQL by hand before committing — a generated drop is exactly the kind of migration
that should never be applied unread.

### B4 — Residual reference sweep

```bash
grep -rn "Project\|project" src --include=*.ts --include=*.tsx | grep -vi "projection\|projected"
```

Expect zero functional matches. Record any deliberate residuals in §6.

### B5 — Documentation

Update `docs/specs/current-state.md`, note the removal in `CHANGELOG.md` with the date and reason,
and cross-reference `REQ-0067` H5 as "resolved by removal". Add a line to
`docs/requirements/REQ-0061-product-charter.md` (or the charter section of current-state) recording
that the charter cleanup is now complete on both the route and the backend.

---

## Package C — Workspace scope *(runs under either path)*

### C1 — Multi-workspace decision

Default: a user belongs to exactly one organization. Document it explicitly in
`docs/specs/current-state.md` under the tenancy model, including what happens if a user is invited
to a second organization (today: the invite sets `organizationId`, effectively moving them —
confirm this and document the actual behaviour, which is currently implicit).

### C2 — Q2: `STAFF` landing page

```typescript
// src/app/dashboard/page.tsx (or the post-login redirect)
const user = await getCurrentUser();
if (!user) redirect("/login");
// The multi-store dashboard is built around a store selection a pinned STAFF
// member cannot make.
if (user.role === "STAFF" && user.storeId) {
  redirect(`/stores/${user.storeId}`);
}
```

Verify no redirect loop exists if a `STAFF` user has no `storeId`. Add a test for both branches.

### C3 — Document the onboarding outcome

State plainly in `docs/specs/current-state.md` what exists immediately after signup (a `User`, an
`Organization`, no `Store`, no `Integration`) and what the user is prompted to do next.

---

## 4. Subtasks

### Decision gate
- [ ] **Q1 answered** and recorded in §6 (ship or remove).
- [ ] **Q2 answered** (STAFF landing).
- [ ] Multi-workspace policy answered.
- [ ] (Path A only) Project scoping model answered — does a project scope conversations and
      analytics, or is it a label?

### Path A — Ship *(only if Q1 = ship)*
- [ ] **A1** `REQ-0067` H5 landed (soft archive, unique constraint, restore, list filter).
- [ ] **A2** `integrationId` added to the create/edit schema with a cross-tenant ownership check.
- [ ] **A3.1** `/projects` list page with the archived toggle.
- [ ] **A3.2** `/projects/new` create form.
- [ ] **A3.3** `/projects/[id]` detail with edit, members, archive, restore.
- [ ] **A4.1** "Projects" added to the sidebar with a stable key.
- [ ] **A4.2** Route-coverage expectations updated.
- [ ] **A5** Onboarding prompt or dashboard empty state added.
- [ ] **A6.1** Test: create.
- [ ] **A6.2** Test: duplicate name rejected via `P2002` with a friendly message.
- [ ] **A6.3** Test: archive keeps the row and its members.
- [ ] **A6.4** Test: archived excluded from the default list.
- [ ] **A6.5** Test: restore round-trip.
- [ ] **A6.6** Test: cross-tenant read and write denied.
- [ ] **A6.7** Test: `integrationId` from another organization rejected.

### Path B — Remove *(only if Q1 = remove)*
- [ ] **B1.1** Row counts checked in production.
- [ ] **B1.2** Rows exported if non-zero; location recorded.
- [ ] **B2.1** `project-actions.ts` deleted.
- [ ] **B2.2** `project.repository.ts` deleted.
- [ ] **B2.3** Project application service and types deleted.
- [ ] **B2.4** Module barrel exports removed.
- [ ] **B2.5** Project domain events removed and reflected in the event registry.
- [ ] **B3.1** `Project` / `ProjectMember` models removed from the schema.
- [ ] **B3.2** Back-relations removed from `User`, `Organization`, `Integration`.
- [ ] **B3.3** Migration generated and the SQL reviewed by hand.
- [ ] **B4** Residual reference sweep clean; deliberate residuals recorded.
- [ ] **B5.1** `docs/specs/current-state.md` updated.
- [ ] **B5.2** `REQ-0067` H5 cross-referenced as resolved by removal.
- [ ] **B5.3** Charter documentation updated.

### Package C — Workspace scope
- [ ] **C1.1** Multi-workspace policy documented.
- [ ] **C1.2** Actual behaviour on a second-organization invite verified and documented.
- [ ] **C2.1** `STAFF` landing implemented per Q2.
- [ ] **C2.2** Test: `STAFF` with a store redirects; `STAFF` without a store does not loop.
- [ ] **C3** Onboarding outcome documented.

## 5. Acceptance Criteria

- [ ] All acceptance criteria for the **chosen** option in `REQ-0073` are met.
- [ ] `REQ-0073` §7 (workspace scope) criteria are met regardless of the option.
- [ ] No reachable mutating server action lacks a user interface.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run build:worker` pass.
- [ ] Migrations apply cleanly with no drift.
- [ ] `docs/specs/current-state.md` and `CHANGELOG.md` updated.

## 6. Notes / Blockers

- **BLOCKED on Q1.** Do not begin Path A or Path B until the decision is recorded here.
- **Recommendation: Path B (remove).** `Store` and `Integration` already provide the scoping that
  `Project` duplicates, and no consumer exists.
- **Coordinate with `REQ-0067` H5:** under Path B the H5 schema work is wasted. Answer Q1 before
  writing that migration.
- **Record here during implementation:**
  - The Q1 decision, its date, and who made it.
  - (Path B) Row counts and the backup export location.
  - (Path B) Any deliberate residual references.
  - (Path A) Where first-project creation is prompted.
  - The Q2 decision and the multi-workspace policy.
