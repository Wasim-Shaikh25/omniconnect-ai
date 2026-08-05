# TRACKER-0076: Auth & Registration Overhaul

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0076-auth-registration-overhaul.md`
- **Task:** `docs/tasks/TASK-0076-auth-registration-overhaul.md`
- **Last updated:** 2026-08-05

## 1. Summary

Progress tracker for REQ-0076: Auth & Registration Overhaul.

## 2. Subtasks

### Planning
- [ ] Requirement REQ-0076 approved.
- [ ] Task file TASK-0076 created.
- [ ] Branch created.

### Implementation
- [ ] T-003: Update User model (new fields, remove org refs).
- [ ] T-008: Registration API (new fields, validation, uniqueness).
- [ ] T-009: Email OTP service (send/verify, env toggle).
- [ ] T-010: Mobile OTP service (SMS send/verify, env toggle).
- [ ] T-011: Social login (Google/Facebook/Apple, env-gated).
- [ ] T-012: Registration UI (all fields, OTP flow, social buttons).
- [ ] T-013: Simplify RBAC (USER + SUPER_ADMIN only).

### Verification
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] `CHANGELOG.md` updated.
- [ ] `docs/specs/current-state.md` updated if needed.

## 3. Acceptance Criteria

- [ ] All linked requirement acceptance criteria are met.
- [ ] All verification steps above pass.

## 4. Notes / Blockers

- Status: Todo — not yet started.
