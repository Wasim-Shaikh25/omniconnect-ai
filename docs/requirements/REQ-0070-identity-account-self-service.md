# REQ-0070: Identity and Account Self-Service Completeness

- **Status:** Approved
- **Owner:** Auth / Frontend
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0070-identity-account-self-service.md`
- **Related Tracker:** `docs/trackers/TRACKER-0070-identity-account-self-service.md`
- **Source audit:** `PRODUCTION_READINESS_AUDIT.md` §8.1, §8.2, §8.3, §8.9; L6; Q6
- **Remediation index:** `docs/audit/2026-07-31-remediation-index.md`
- **Last updated:** 2026-07-31

## 1. Summary

The application has a sound auth scaffold — credentials provider, JWT sessions with `tokenVersion`
revocation, RBAC, super-admin email OTP, password reset, soft-delete with a 30-day grace window —
but the self-service surface around it is incomplete in ways users notice immediately. Registration
accepts a single unconfirmed password and never verifies the email address. There is no way to
change an email address or a password from inside the application. Date of birth and mobile number
are not collected, and the `phone` column that exists is never verified. Super-admin MFA is
email-only, so an email-provider outage locks the platform owner out. Four settings cards link to
routes that do not exist. Nothing stops automated signups from burning OpenAI credit.

This requirement closes the identity and account-management gaps so the product behaves like a
standard SaaS.

## 2. Verified current state (re-checked at commit `33e2e0b`, 2026-07-31)

| Capability | State | Evidence |
|---|---|---|
| Register with name/email/password | ✅ | `AuthForm` + `registerUserSchema` |
| Confirm password | ❌ | No `confirmPassword` in the form or schema |
| Email verification for credentials users | ❌ | `User.emailVerified` exists (`schema.prisma:24`) but is never set |
| Date of birth | ❌ | No column on `User`, no form field |
| Mobile number | 🟡 | `User.phone` exists (`schema.prisma:27`); never collected at registration |
| Mobile verification | ❌ | No `phoneVerified` column, no SMS/OTP infrastructure |
| Change password in-app | ❌ | Only `/forgot-password` → `/reset-password` |
| Change email in-app | ❌ | `email` is not in `updateProfileSchema` |
| Update name / avatar | ✅ | `ProfileForm` → `updateProfileAction` |
| Delete account | ✅ | 30-day soft delete with a typed "DELETE" confirmation |
| Session list / sign out everywhere | ❌ | `tokenVersion` exists but is not exposed as a user action |
| Super-admin email MFA | ✅ | `loginAction` + `verifyCode(email, mfaCode, "mfa")` |
| Super-admin mobile MFA / recovery | ❌ | `SUPER_ADMIN_PHONE` is stored and never used |
| Super-admin seed updates existing user | ❌ | `ensureSuperAdmin` returns early if the email exists |
| Settings dead links | ❌ | `/settings/quality`, `/settings/rollout`, `/settings/operating-model`, `/settings/unified-context` are linked from `settings/page.tsx:202,216,230,244`; no `page.tsx` exists for any of them |
| Registration bot protection (L6/Q6) | ❌ | No CAPTCHA, no domain restriction, no verify-before-provision |

## 3. Goals

- No account exists on an address the owner has not proven they control.
- A typo in a password field cannot silently create an inaccessible account.
- Every credential a user owns (password, email, phone) can be changed from inside the product.
- A user can see and terminate their active sessions.
- The platform owner cannot be locked out by a single-channel MFA failure.
- Optional demographic fields (DOB, mobile) are collected with an explicit purpose and lawful
  basis, and are verifiable.
- Automated signups cannot consume paid AI capacity for free.
- No navigation link points at a 404.

## 4. Non-Goals

- Social login providers beyond the existing configuration.
- SSO / SAML / SCIM.
- Passwordless or WebAuthn (recorded as a future consideration).
- Admin-initiated user management (suspend, delete, force reset) — `REQ-0072`.
- Building the four missing settings sub-pages as features; this requirement only removes or
  correctly gates the dead links.

## 5. User Stories

- As a **new user**, I confirm my password so a typo does not lock me out of an account I just
  paid for.
- As a **new user**, I verify my email before my workspace is provisioned so support can reach me.
- As a **user**, I change my password from settings without signing out and using a reset link.
- As a **user**, I change my email address and prove control of the new one before it takes effect.
- As a **user**, I add and verify a mobile number so I can recover access if my email breaks.
- As a **security-conscious user**, I see my active sessions and can sign out everywhere.
- As the **platform owner**, I have a second MFA channel so an email outage does not lock me out.
- As the **platform owner**, changing `SUPER_ADMIN_PASSWORD` in the environment takes effect
  without a manual database edit.
- As the **platform owner**, automated signups cannot burn OpenAI credit on the free tier.
- As a **user**, every card in settings opens a real page.

## 6. Acceptance Criteria

### 6.1 Registration
- [x] `registerUserSchema` requires `confirmPassword` and rejects a mismatch with a field-level
      error.
- [x] `AuthForm` (register mode) renders a confirm-password field with the mismatch error inline.
- [x] Password strength rules are stated in the UI before submission (current rule: 8–200 chars;
      any change is recorded in the task file).
- [x] ~~Optional `dateOfBirth` is collected with a stated purpose; a minimum-age rule is applied per
      the decision in §8.~~ **Omitted for MVP (Q1): no DOB field or age policy.**
- [x] Optional `phone` is collected in E.164 format with client and server validation.
- [x] Registration creates the user in an **unverified** state and sends a verification email.
- [x] Organization/workspace provisioning happens **after** verification (or the pre-verification
      state is explicitly limited — decision recorded in §8).
- [x] A verification link is single-use, expires in 24 hours, and is rate-limited per address.
- [x] Resending a verification email is possible and rate-limited.
- [x] An unverified user attempting to log in receives a clear message and a resend option — never
      a generic "invalid credentials".
- [x] Enumeration safety: registering with an existing address produces the same visible outcome as
      a new address.
- [x] **L6/Q6:** bot protection is applied to registration (CAPTCHA or equivalent), configurable
      and disabled in test environments.

### 6.2 Email verification and change
- [x] `User.emailVerified` is set on successful verification and is the authoritative flag.
- [x] A `VerificationRequest` record stores hashed tokens, never plaintext.
- [ ] Changing an email sends a confirmation to the **new** address and a notification to the
      **old** address.
- [ ] The change takes effect only after the new address is confirmed.
- [ ] The change increments `tokenVersion`, invalidating other sessions.
- [ ] Changing to an address already in use fails without revealing that the address exists.
- [ ] An `AuditLog` entry records every email change.

### 6.3 Password change
- [ ] `/settings/account` exposes a change-password form requiring the current password.
- [ ] A wrong current password is rejected and rate-limited.
- [ ] A successful change increments `tokenVersion`, terminating all other sessions.
- [ ] The current session remains valid (the user is not signed out of the device they used).
- [ ] A notification email is sent on change.
- [ ] An `AuditLog` entry records every password change.

### 6.4 Mobile number and verification
- [ ] `User.phoneVerified DateTime?` is added via migration.
- [ ] A user can add, verify, replace, and remove a phone number from settings.
- [ ] Verification uses a 6-digit OTP, expiring in 10 minutes, with attempt limits and per-number
      rate limiting.
- [ ] The SMS provider sits behind a port (`SmsSender`) with a console implementation for
      development, mirroring `EMAIL_PROVIDER=console`.
- [ ] Phone numbers are never written to logs (verify against `logger.redactValue`).
- [ ] If no SMS provider is configured, the phone-verification UI is hidden rather than failing at
      submit time.

### 6.5 Session management
- [ ] `/settings/account` lists active sessions with device/user-agent, IP (redacted per policy),
      and last-seen time.
- [ ] "Sign out everywhere" increments `tokenVersion` and confirms the action.
- [ ] The current session is identifiable in the list.

### 6.6 Super-admin hardening
- [ ] `SUPER_ADMIN_PHONE` is used as a second MFA channel or an explicit recovery path.
- [ ] `ensureSuperAdmin` reconciles an existing account: it updates `isSuperAdmin` and, when
      `SUPER_ADMIN_PASSWORD` changes, the password hash — behind an explicit
      `SUPER_ADMIN_RECONCILE=true` flag so it cannot happen by accident.
- [ ] Reconciliation is logged and audited.
- [ ] A documented break-glass procedure exists in `docs/operations.md` for the case where both MFA
      channels fail.

### 6.7 Settings navigation
- [ ] The four dead links (`/settings/quality`, `/settings/rollout`, `/settings/operating-model`,
      `/settings/unified-context`) are removed, or the pages are implemented.
- [ ] A test asserts every `href` rendered by `settings/page.tsx` resolves to an existing route.

### 6.8 Cross-cutting
- [x] All new server actions call `getCurrentUser()` (never `auth()`), enforce RBAC, and validate
      with zod.
- [ ] All new mutations write `AuditLog` entries.
- [x] Domain logic (password policy, phone normalisation) lives in the domain layer with
      no IO, per `AGENTS.md` §1.
- [x] Every new flow has unit tests; email verification has integration tests (change-email and
      change-password integration tests tracked under Package D).

## 7. Scope & Dependencies

**Modules affected:** `auth`, `users`, `organizations` (provisioning order), `notifications`,
`shared/security`, `shared/config`.

**Schema changes:** `User.dateOfBirth DateTime?`, `User.phoneVerified DateTime?`,
`UserSession` (or reuse the NextAuth `Session` table for the session list), verification-token
storage for email-change and phone OTP.

**Depends on:** `REQ-0067` H4 (`getCurrentUser()` everywhere) — new routes must follow the fixed
pattern, not the broken one.

**Interacts with:** `REQ-0072` (admin-initiated password reset must reuse this flow).

## 8. Open Questions

1. **Is DOB actually required?** Collecting it creates a data-protection obligation with no current
   product use. **Decision: omit `dateOfBirth` entirely for the MVP. No minimum-age rule is currently
   required, and the field adds compliance burden without product value.**
2. **Provision the workspace before or after email verification?** **Decision: create the user
   unverified, allow login, but block AI generation, store connection, and checkout until verified.**
   This avoids a dead-end signup while stopping free-tier abuse.
3. **Which SMS provider?** **Decision: define the `SmsSender` port now with a `console` sender and
   `disabled` state; pick Twilio or another provider when mobile verification is actually enabled.**
4. **Which CAPTCHA?** **Decision: Cloudflare Turnstile — no cost, low friction, and can be disabled
   by leaving `TURNSTILE_SECRET_KEY` unset.**
5. **Is mobile verification required at all, or optional recovery only?** **Decision: optional
   recovery only.**
