# TRACKER-0092: Owner Session / Tenant Mapping Hotfix

- **Status:** In Progress
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0077-workspace-project-system.md`, `docs/requirements/REQ-0076-auth-registration-overhaul.md`
- **Task:** `docs/tasks/TASK-0092-owner-session-mapping-hotfix.md`
- **Last updated:** 2026-08-05

## 1. Summary

Track the hotfix for owner `userId`/`projectId` mapping uncovered by the Phase 1 end-to-end smoke test.

## 2. Subtasks

### Planning
- [x] Requirement identified (REQ-0077 / REQ-0076).
- [x] Task file created.
- [x] Tracker file created.
- [x] Branch `devin/fix-owner-tenant-mapping-1785912057` created from `main`.

### Implementation
- [x] `session.ts` loads `userId`/`projectId` from DB.
- [x] `auth.ts` token refresh loads `userId`/`projectId` from DB.
- [x] Add `isStaff` helper to `auth/domain/role.ts` and domain barrel `auth/domain.ts`.
- [x] `createOrganization` sets owner `userId` to self.
- [x] `OrganizationCreated` subscriber sets owner `userId` to self.
- [x] `tenantGuard` uses owner/staff discriminator.
- [x] `organizationQueries` store scoping updated.
- [x] Intelligence `resolveStoreScope` updated.
- [x] CRM/customer scoping updated.
- [x] Test fixtures updated.

### Verification
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [ ] `npm audit` reports 0 vulnerabilities.
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.
- [ ] PR opened and green.

## 3. Acceptance Criteria

- [ ] Normal owner golden path works end-to-end.
- [ ] Staff scoping still enforced.
- [ ] All verification steps pass.

## 4. Notes / Blockers

- Depends on the already-merged Phase 1 schema and `devin/fix-owner-tenant-mapping-1785912057` WIP branch.
