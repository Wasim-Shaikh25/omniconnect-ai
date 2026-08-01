# TRACKER-0070: Identity and Account Self-Service Completeness

- **Status:** In Progress
- **Owner:** Auth / Frontend
- **Requirement:** `docs/requirements/REQ-0070-identity-account-self-service.md`
- **Task:** `docs/tasks/TASK-0070-identity-account-self-service.md`
- **Last updated:** 2026-08-01

## 1. Summary

Closes the identity gaps from `PRODUCTION_READINESS_AUDIT.md` §8.1–8.3 plus L6/Q6: no email
verification, no confirm password, no in-app password or email change, no mobile verification, no
session management, single-channel super-admin MFA, four dead settings links, and no registration
bot protection.

## 2. Subtasks

### Planning
- [x] Requirement reviewed and approved.
- [x] Q1 decided: omit `dateOfBirth` for the MVP.
- [x] Q2 decided: create unverified, allow login, gate AI/store/checkout.
- [x] Q3 decided: `SmsSender` port with `console`/`disabled`; pick provider later.
- [x] Q4 decided: Cloudflare Turnstile, disabled when unconfigured.
- [x] Q5 decided: optional recovery only.
- [x] Branch created from `main` (`devin/20260801-identity-self-service-pkg-a`).

### Package A — Schema and config
- [x] `User.dateOfBirth` omitted (Q1 = no).
- [x] `User.phoneVerified` added.
- [x] `VerificationRequest` table added, storing hashed `tokenHash` only.
- [x] New env vars (`REQUIRE_EMAIL_VERIFICATION`, `TURNSTILE_*`, `SMS_PROVIDER`, `TWILIO_*`,
      `SUPER_ADMIN_RECONCILE`) added to `env.ts`, `.env.example`, `docs/deployment.md`.
- [x] Migration `20260801162632_add_identity_self_service` applies cleanly.

### Package B — Registration
- [x] `confirmPassword` in schema with mismatch refinement.
- [x] Confirm-password field rendered with inline error.
- [x] Password rules displayed before submission.
- [ ] Optional `dateOfBirth` with age policy — **N/A** per Q1 (omitted for MVP).
- [x] Optional E.164 `phone` validated client and server side.
- [x] Turnstile verified server-side; no-op when unconfigured.
- [x] Registration is enumeration-safe.

### Package C — Email verification
- [x] Users created unverified.
- [x] Hashed 24h single-use token issued.
- [x] Verification email template added and sent.
- [x] `/verify-email` page handles valid / expired / consumed / invalid distinctly.
- [x] `/verify-email` added to `publicPaths`.
- [x] Unverified login returns a distinguishable code with a resend affordance.
- [x] `requireVerifiedEmail()` gates AI generation, store connection, and checkout.
- [x] Resend rate-limited to 3/hour/address.
- [ ] Integration test: register → verify → login → gated features unlocked (tracked as a follow-up test).

### Package D — Password and email change
- [x] `changePassword` requires and validates the current password.
- [x] `tokenVersion` bumped; acting session stays valid.
- [x] Password-changed notification sent; audit entry written.
- [x] Password-change attempts rate-limited.
- [x] `requestEmailChange` confirms to the new address and notifies the old.
- [x] `confirmEmailChange` updates, verifies, bumps `tokenVersion`, audits.
- [x] "Address already in use" is non-revealing.
- [x] Settings UI shipped for both flows.
- [x] Tests: wrong current password, session invalidation, old-address notice, token reuse.

### Package E — Phone verification
- [ ] `SmsSender` port defined.
- [ ] Console sender implemented.
- [ ] Twilio sender implemented behind the port.
- [ ] OTP issue/verify with expiry, attempt cap, and send-rate limits.
- [ ] Add/verify/replace/remove UI shipped; hidden when no provider is configured.
- [ ] Test: OTP body and phone number never appear in logs.
- [ ] Tests: expiry, attempt cap, replay, rate limit.

### Package F — Session management
- [ ] Minimal vs full session-list decision recorded.
- [ ] "Sign out everywhere" implemented with confirmation.
- [ ] (If full) `UserSession` added and populated on sign-in.

### Package G — Super admin and settings navigation
- [ ] Gated `ensureSuperAdmin` reconciliation implemented and audited.
- [ ] SMS alternative for super-admin MFA implemented.
- [ ] Break-glass procedure documented in `docs/operations.md`.
- [ ] Four dead settings links removed.
- [ ] Settings-link resolution test added.

### Privacy
- [ ] `dateOfBirth` and `phone` included in the GDPR export.
- [ ] Both erased by account deletion; test added.
- [ ] Neither appears in logs; redaction verified.

### Verification
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm audit` reports 0 vulnerabilities.
- [x] `npm run build` passes.
- [x] `npm run build:worker` passes.
- [x] Migrations apply cleanly with no drift.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.

## 3. Acceptance Criteria

- [ ] All `REQ-0070` acceptance criteria are met.
- [ ] All verification steps above pass.

## 4. Notes / Blockers

- Package A blocks B–G. B–G are independent of each other.
- New routes must use `getCurrentUser()`, not `auth()` — see `REQ-0067` H4.
- `REQ-0072`'s admin-initiated password reset must reuse Package D's flow rather than duplicating it.
- Collecting DOB creates a data-protection obligation with no current product use. Confirm Q1
  before writing the migration.
