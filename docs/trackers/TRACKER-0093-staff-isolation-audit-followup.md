# TRACKER-0093: Staff Isolation and Audit Fix Follow-up

- **Status:** In Progress
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0077-workspace-project-system.md`, `docs/requirements/REQ-0076-auth-registration-overhaul.md`
- **Task:** `docs/tasks/TASK-0093-staff-isolation-audit-followup.md`
- **Last updated:** 2026-08-05

## 1. Summary

Track the post-merge follow-up for PR #127: staff tenant-isolation gaps and `npm audit` findings.

## 2. Subtasks

### Planning
- [x] Requirement identified (REQ-0077 / REQ-0076).
- [x] Task file created.
- [x] Tracker file created.
- [x] Branch `devin/fix-staff-isolation-audit-1785912057` created from `main`.

### Implementation
- [x] `/stores` page passes `user` to `getOrganizationOverview` and hides Add store for staff.
- [x] `/dashboard` redirects staff without `projectId` and staff with `projectId` correctly.
- [x] `UserRepository.listByOrganization` / `countByOrganization` list workspace members.
- [x] `npm audit` findings addressed.

### Verification
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm audit --audit-level=moderate` passes.
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.
- [ ] PR opened and green.

## 3. Acceptance Criteria

- [ ] Staff isolation works end-to-end.
- [ ] Settings lists workspace members.
- [ ] All verification steps pass.
