# TASK-0092: Owner Session / Tenant Mapping Hotfix

- **Status:** In Progress
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0077-workspace-project-system.md`, `docs/requirements/REQ-0076-auth-registration-overhaul.md`
- **Tracker:** `docs/trackers/TRACKER-0092-owner-session-mapping-hotfix.md`
- **Module(s):** auth, users, workspaces
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Fix owner `userId`/`projectId` mapping so onboarding and store routes work for normal owners.
- **Last updated:** 2026-08-05

## 1. Summary

End-to-end smoke testing of the merged Phase 1 branch found two critical owner-path bugs:

1. `/onboarding` renders blank because `getCurrentUser()` was deriving `userId` from the JWT `id` instead of the persisted `User.userId`.
2. `/stores/{projectId}` returns 404 for the owner because `tenantGuard` and other `USER`-role checks treat the owner as a staff member and require `user.projectId`.

This hotfix ensures the session/auth layer loads canonical `userId`/`projectId` from the database and that the owner/staff discriminator uses `User.userId === User.id` (owner) vs `User.userId !== User.id` (staff), aligned with the schema comment in `prisma/schema.prisma`.

## 2. References

- Requirement: `docs/requirements/REQ-0077-workspace-project-system.md`
- Requirement: `docs/requirements/REQ-0076-auth-registration-overhaul.md`
- Current state: `docs/specs/current-state.md` §2, §6
- Related files:
  - `src/modules/auth/infrastructure/session.ts`
  - `src/modules/auth/infrastructure/auth.ts`
  - `src/modules/auth/domain/role.ts`
  - `src/modules/workspaces/application/create-organization.ts`
  - `src/modules/workspaces/infrastructure/organization.repository.ts`
  - `src/modules/workspaces/application/tenant.ts`
  - `src/modules/workspaces/application/queries.ts`
  - `src/modules/workspaces/infrastructure/subscribers.ts`
  - `src/modules/users/infrastructure/subscribers.ts`
  - `src/modules/intelligence/presentation/actions.ts`
  - `src/modules/crm/presentation/actions.ts`
  - `src/app/customers/page.tsx`
  - `src/test/fixtures.ts`

## 3. Implementation Plan

### Step 1 — Load canonical DB claims in session/auth

`getCurrentUser()` and `refreshTokenFromDb()` must return `User.userId` and `User.projectId` exactly as stored. Do not fall back to `token.id` or `session.user.id`. Already in progress on `devin/fix-owner-tenant-mapping-1785912057`.

### Step 2 — Add an `isStaff` helper

In `src/modules/auth/domain/role.ts`:

```ts
export function isStaff(user: { id: string; userId: string | null }): boolean {
  return !!user.userId && user.userId !== user.id;
}
```

Owner: `user.userId === user.id`. Staff: `user.userId` is the owner id and differs from `user.id`. Super-admin and un-onboarded users are not staff.

### Step 3 — Onboarding / workspace creation sets owner `userId` to self

`createOrganization` must not create a placeholder `User` and set the owner's `userId` to the placeholder's id. Instead:

- Update the owner `User.userId` to `user.id` (self).
- Optionally create the first `Workspace` if needed; at minimum allow the store-repository's `ensureWorkspace` to create it on first project creation.
- For OAuth auto-provision, update the user the same way and emit `OrganizationCreated` with `userId = ownerUserId = user.id`.

### Step 4 — Fix owner/staff checks

Update all places that currently assume `role === "USER"` means staff:

- `tenantGuard.assertStoreAccess`
- `organizationQueries.getOrganizationOverview`
- `intelligence` `resolveStoreScope`
- `crm/presentation/actions.ts` customer list scoping
- `src/app/customers/page.tsx` redirect/scoping

Use `isStaff()` to decide whether `projectId` restricts the view.

### Step 5 — Update test fixtures

`src/test/fixtures.ts` `createTenant` should set `owner.userId = owner.id` and `store.userId = owner.id` so integration tests match the new semantics.

## 4. Subtasks

- [x] Canonical `userId`/`projectId` loaded from DB in `session.ts` and `auth.ts`.
- [x] Add `isStaff` helper and export it via `auth/domain.ts` barrel.
- [x] `createOrganization` sets owner `userId` to self and stops creating placeholder `User`.
- [x] `OrganizationCreated` / subscribers set owner `userId` to self.
- [x] `tenantGuard` distinguishes owner and staff by `userId === id`.
- [x] `organizationQueries` store scoping updated.
- [x] Intelligence `resolveStoreScope` updated.
- [x] CRM/customer scoping updated.
- [x] Test fixtures updated.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.
- [ ] PR opened and passing CI.

## 5. Acceptance Criteria

- A normal owner can register, see the onboarding workspace form, submit it, create a store, and open `/stores/{projectId}` without a 404.
- Staff with an assigned `projectId` can only access that project.
- Lint + typecheck + tests + build pass.

## 6. Notes / Blockers

- The placeholder `User` (created by `PrismaOrganizationRepository.create`) becomes unused for the owner path; it may still be used by `listAll` for super-admin views, so `findById`/`listAll` semantics should still resolve to the owner `User`.
