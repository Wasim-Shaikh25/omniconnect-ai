# TASK-0093: Staff Isolation and Audit Fix Follow-up

- **Status:** In Progress
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0077-workspace-project-system.md`, `docs/requirements/REQ-0076-auth-registration-overhaul.md`
- **Tracker:** `docs/trackers/TRACKER-0093-staff-isolation-audit-followup.md`
- **Module(s):** auth, users, workspaces, dashboard, stores
- **Changelog entry:** `CHANGELOG.md [Unreleased]`
- **Last updated:** 2026-08-05

## 1. Summary

PR #127 fixed the normal-owner session/tenant mapping, but end-to-end testing surfaced three remaining staff-isolation gaps and an `npm audit` failure in the CI `quality` job. This follow-up branch completes the tenant guards for staff users and addresses the audit findings that can be fixed safely.

## 2. Findings from PR #127 E2E Test

- `/stores` lists **all** workspace stores for staff because `getOrganizationOverview()` is called without the `user` argument, so the staff filter is skipped.
- `/stores` also shows the **Add a store** card for staff because `canManage` is true for every `USER`.
- `/dashboard` falls through for a staff user whose `projectId` is `null`, showing the owner dashboard and KPIs.
- `/settings` cannot list staff members because `UserRepository.listByOrganization` / `countByOrganization` filter `where: { id: userId }` (owner only) instead of `where: { userId }` (owner + staff).
- `npm audit --audit-level=moderate` fails in CI with `brace-expansion`, `fast-uri`, and `postcss` advisories.

## 3. Implementation Plan

### Step 1 — Staff scoping in `/stores`

In `src/app/stores/page.tsx`:

- Import `isStaff` from `@/modules/auth/domain`.
- Pass the current `user` as the second argument to `organizationQueries.getOrganizationOverview(user.userId, user)` so the staff store filter applies.
- Change `canManage` to hide the **Add a store** card for staff: `const canManage = user.role === "SUPER_ADMIN" || !isStaff(user);`.

### Step 2 — Staff scoping in `/dashboard`

In `src/app/dashboard/page.tsx`:

- Import `isStaff` from `@/modules/auth/domain`.
- Replace `if (user.role === "USER" && user.projectId) redirect(...)` with:
  ```ts
  if (isStaff(user) && !user.projectId) redirect("/stores");
  if (isStaff(user) && user.projectId) redirect(`/stores/${user.projectId}`);
  ```

### Step 3 — Settings user list

In `src/modules/users/infrastructure/user.repository.ts`:

- `listByOrganization(userId)` → `where: { userId, ...notDeleted }`.
- `countByOrganization(userId)` → `where: { userId, ...notDeleted }`.

### Step 4 — Audit

Run `npm audit fix` and verify the CI `npm audit --audit-level=moderate` step passes. If `postcss` requires a breaking `next` upgrade, evaluate whether to apply it or escalate.

### Step 5 — M7 smoke-test restoration

- Add an admin-route guard in `src/modules/auth/infrastructure/auth.ts` `authorized` callback so authenticated non-super-admins hitting `/admin*` are redirected to `/dashboard` before the page streams.
- Recreate `scripts/check-http-status.ts` using the V2 `createTenant` fixture and `actingAs` session helper; assert `404` for cross-tenant/missing stores and `307` for non-admin `/admin/organizations`.
- Stop loading `getCurrentUser` in `src/app/layout.tsx` and instead wrap the app with `next-auth/react` `SessionProvider`; have `AppShell` call `useSession` and fetch `unreadCount` client-side. This ensures 404/error-page HTML does not serialize the authenticated user's PII/store names.

## 4. Subtasks

- [x] `/stores` page passes `user` to `getOrganizationOverview` and hides Add store for staff.
- [x] `/dashboard` redirects staff without `projectId` and staff with `projectId` correctly.
- [x] `UserRepository.listByOrganization` / `countByOrganization` list workspace members.
- [x] `npm audit --audit-level=moderate` passes.
- [x] Lint + typecheck + tests + build pass.
- [x] `CHANGELOG.md` updated.
- [x] Admin route middleware guard redirects non-super-admins to `/dashboard` (`307`).
- [x] `scripts/check-http-status.ts` restored and adapted to V2 schema; smoke test passes.
- [x] `RootLayout` no longer loads `getCurrentUser` server-side; `AppShell` fetches session client-side to prevent user data leaking into 404 bodies.
- [ ] PR opened and green.

## 5. Acceptance Criteria

- Staff sees only their assigned store on `/stores` and cannot add a store.
- Staff without `projectId` is redirected away from `/dashboard` and KPIs.
- Owner `/settings` lists owner + staff members and the store-assignment form works.
- Quality gate passes.
