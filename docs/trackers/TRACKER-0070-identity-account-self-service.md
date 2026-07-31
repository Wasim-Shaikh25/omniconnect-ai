# TRACKER-0070: Identity and Account Self-Service Completeness

- **Status:** Todo
- **Owner:** Auth / Frontend
- **Requirement:** `docs/requirements/REQ-0070-identity-account-self-service.md`
- **Task:** `docs/tasks/TASK-0070-identity-account-self-service.md`
- **Last updated:** 2026-07-31

## 1. Summary

Closes the identity gaps from `PRODUCTION_READINESS_AUDIT.md` §8.1–8.3 plus L6/Q6: no email
verification, no confirm password, no in-app password or email change, no mobile verification, no
session management, single-channel super-admin MFA, four dead settings links, and no registration
bot protection.

## 2. Subtasks

### Planning
- [ ] Requirement reviewed and approved.
- [ ] Q1 decided: is DOB collected at all?
- [ ] Q2 decided: provision workspace before or after verification?
- [ ] Q3 decided: SMS provider (or port-only for now).
- [ ] Q4 decided: CAPTCHA provider.
- [ ] Q5 decided: is mobile verification required or optional recovery?
- [ ] Branch created from `main`.

### Package A — Schema and config
- [ ] `User.dateOfBirth` added (if Q1 = yes).
- [ ] `User.phoneVerified` added.
- [ ] Verification-token storage added or extended, storing hashes only.
- [ ] New env vars added to `env.ts`, `.env.example`, `docs/deployment.md`.
- [ ] Migration applies cleanly.

### Package B — Registration
- [ ] `confirmPassword` in schema with mismatch refinement.
- [ ] Confirm-password field rendered with inline error.
- [ ] Password rules displayed before submission.
- [ ] Optional `dateOfBirth` with age policy.
- [ ] Optional E.164 `phone` validated client and server side.
- [ ] Turnstile verified server-side; no-op when unconfigured.
- [ ] Registration is enumeration-safe.

### Package C — Email verification
- [ ] Users created unverified.
- [ ] Hashed 24h single-use token issued.
- [ ] Verification email template added and sent.
- [ ] `/verify-email` page handles valid / expired / consumed / invalid distinctly.
- [ ] `/verify-email` added to `publicPaths`.
- [ ] Unverified login returns a distinguishable code with a resend affordance.
- [ ] `requireVerifiedEmail()` gates AI generation, store connection, and checkout.
- [ ] Resend rate-limited to 3/hour/address.
- [ ] Integration test: register → verify → login → gated features unlocked.

### Package D — Password and email change
- [ ] `changePassword` requires and validates the current password.
- [ ] `tokenVersion` bumped; acting session stays valid.
- [ ] Password-changed notification sent; audit entry written.
- [ ] Password-change attempts rate-limited.
- [ ] `requestEmailChange` confirms to the new address and notifies the old.
- [ ] `confirmEmailChange` updates, verifies, bumps `tokenVersion`, audits.
- [ ] "Address already in use" is non-revealing.
- [ ] Settings UI shipped for both flows.
- [ ] Tests: wrong current password, session invalidation, old-address notice, token reuse.

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
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm audit` reports 0 vulnerabilities.
- [ ] `npm run build` passes.
- [ ] `npm run build:worker` passes.
- [ ] Migrations apply cleanly with no drift.
- [ ] `CHANGELOG.md` updated.
- [ ] `docs/specs/current-state.md` updated.

## 3. Acceptance Criteria

- [ ] All `REQ-0070` acceptance criteria are met.
- [ ] All verification steps above pass.

## 4. Notes / Blockers

- Package A blocks B–G. B–G are independent of each other.
- New routes must use `getCurrentUser()`, not `auth()` — see `REQ-0067` H4.
- `REQ-0072`'s admin-initiated password reset must reuse Package D's flow rather than duplicating it.
- Collecting DOB creates a data-protection obligation with no current product use. Confirm Q1
  before writing the migration.
