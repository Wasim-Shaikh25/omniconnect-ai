# TASK-0076: Authentication & Registration Overhaul

- **Status:** Done
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0076-auth-registration-overhaul.md`
- **Tracker:** `docs/trackers/TRACKER-0076-auth-registration-overhaul.md`
- **Module(s):** auth, users, workspaces
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Registration overhaul with new fields, OTP, RBAC simplification.
- **Last updated:** 2026-08-06

## 1. Summary

Implement extended registration (name, company, mobile E.164, email, password, confirm, age, gender), env-configurable OTP (email + SMS), env-gated social logins, auto workspace creation, and RBAC simplification to USER + SUPER_ADMIN.

## 2. References

- Requirement: `docs/requirements/REQ-0076-auth-registration-overhaul.md`
- Related files:
  - `src/modules/auth/application/register-user.ts`
  - `src/modules/auth/presentation/actions.ts`
  - `src/modules/auth/domain/password-policy.ts`
  - `src/modules/users/domain/user.ts`
  - `prisma/schema.prisma`

## 3. Implementation Plan

### Step 1 — Update User model in Prisma

Add fields: `companyName`, `mobile`, `age`, `gender`, `mobileVerified`. Remove `organizationId`, `storeId` references.

### Step 2 — Registration API

New `RegisterInput` with all fields. Validate E.164 mobile, password policy (8+ chars, 1 upper, 1 number, 1 special), confirm match, age 13-120, gender enum. Check email + mobile uniqueness.

### Step 3 — OTP Services

Email OTP: `sendEmailOtp()` / `verifyEmailOtp()` gated by `ENABLE_EMAIL_OTP`. Mobile OTP: `sendSmsOtp()` / `verifySmsOtp()` gated by `ENABLE_MOBILE_OTP`. Auto-verify if env toggle is off.

### Step 4 — Social Login Auto-Disable

`getAvailableSocialProviders()` checks env for Google/Facebook/Apple credentials. UI hides buttons for unconfigured providers.

### Step 5 — Auto-Create Default Workspace

After user creation, call `workspaceService.create()` with company name or "My Workspace".

### Step 6 — Simplify RBAC

Remove `ADMIN`, `STORE_OWNER`, `STAFF` from Role enum. Update all `requireRole()` checks. Keep only `USER` and `SUPER_ADMIN`.

### Step 7 — Registration UI

Form with all fields, inline validation, OTP flow (email + SMS screens), social login buttons.

## 4. Subtasks

- [x] T-003: Update User model (new fields persisted via `AccountRepository.create`; org refs removed earlier)
- [x] T-008: Registration API (new fields, validation)
- [x] T-009: Email OTP service
- [x] T-010: Mobile OTP service (SMS)
- [x] T-011: Social login (Google/Facebook/Apple OAuth)
- [x] T-012: Registration UI
- [x] T-013: Simplify RBAC (USER + SUPER_ADMIN only)

## 5. Acceptance Criteria

- [x] Matches REQ-0076 acceptance criteria.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- SMS OTP requires an SMS provider (Twilio or equivalent) — can be env-disabled until configured.
