# TRACKER-0076: Auth & Registration Overhaul

- **Status:** Done
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0076-auth-registration-overhaul.md`
- **Task:** `docs/tasks/TASK-0076-auth-registration-overhaul.md`
- **Last updated:** 2026-08-06

## 1. Summary

Progress tracker for REQ-0076: Auth & Registration Overhaul.

## 2. Subtasks

### Planning
- [x] Requirement REQ-0076 approved.
- [x] Task file TASK-0076 created.
- [x] Branch created.

### Implementation
- [x] T-003: Update User model (new fields persisted via `AccountRepository.create`; org refs removed earlier).
- [x] T-008: Registration API (new fields, validation, uniqueness).
- [x] T-009: Email OTP service (send/verify, env toggle).
- [x] T-010: Mobile OTP service (SMS send/verify, env toggle).
- [x] T-011: Social login (Google/Facebook/Apple, env-gated).
- [x] T-012: Registration UI (all fields, OTP flow, social buttons).
- [x] T-013: Simplify RBAC (USER + SUPER_ADMIN only).

### Verification
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated if needed.

## 3. Acceptance Criteria

- [x] All linked requirement acceptance criteria are met.
- [x] All verification steps above pass.

## 4. Notes / Blockers

- Status: Done — implemented in `devin/features-branch-remaining-5req-1786011015`.
