# TASK-0070: Implement Identity and Account Self-Service

- **Status:** Implemented
- **Owner:** Auth / Frontend
- **Requirement:** `docs/requirements/REQ-0070-identity-account-self-service.md`
- **Tracker:** `docs/trackers/TRACKER-0070-identity-account-self-service.md`
- **Module(s):** `auth`, `users`, `organizations`, `notifications`, `shared/security`
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Email verification, confirm password, in-app password/email change, phone verification, session management, super-admin reconciliation, registration bot protection.
- **Last updated:** 2026-08-06 (task/tracker aligned; minimal session management chosen)

> **⚠️ Partially superseded (Platform V2)** — Package A/B/C/D were implemented before V2 and are
> now retained as the implementation guide. Package E/F/G are being completed on top of the V2
> `User`/`Workspace`/`Project` model.

## 1. Summary

Seven work packages. Package A (schema) must land first. Packages B–G are independent afterwards.
All new code follows the DDD layering in `AGENTS.md` §1: pure policy in `domain`, orchestration in
`application`, Prisma and providers in `infrastructure`, server actions in `presentation`.

## 2. References

- Audit: `PRODUCTION_READINESS_AUDIT.md` §8.1–8.3, §8.9, L6, Q6
- Requirement: `docs/requirements/REQ-0070-identity-account-self-service.md`
- Tracker: `docs/trackers/TRACKER-0070-identity-account-self-service.md`
- Existing patterns to follow: `src/modules/auth/infrastructure/session.ts` (`getCurrentUser`),
  `src/modules/auth/presentation/actions.ts` (`loginAction` MFA), `src/modules/users/presentation/actions.ts`

## 3. Implementation Plan

---

### Package A — Schema and configuration

**Files:** `prisma/schema.prisma` + migration, `src/shared/config/env.ts`, `.env.example`

```prisma
model User {
  // ... existing fields
  phoneVerified DateTime?
  // emailVerified already exists and becomes authoritative for credentials users
  // dateOfBirth omitted for MVP (Q1 decision)
}

model VerificationRequest {
  id         String    @id @default(cuid())
  userId     String?
  user       User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  channel    String    // "email" | "phone"
  purpose    String    // "signup" | "email_change" | "phone_verify" | "mfa"
  target     String    // the address or E.164 number being proven
  tokenHash  String    @unique // never store the plaintext token
  salt       String?   // per-request random salt for short code (phone) verification
  attempts   Int       @default(0)
  expiresAt  DateTime
  consumedAt DateTime?
  createdAt  DateTime  @default(now())

  @@index([userId, purpose])
  @@index([target, purpose])
  @@index([expiresAt])
}
```

If an equivalent token table already exists for password reset and super-admin MFA, extend it
rather than adding a second one — check `src/modules/auth/infrastructure/` before writing the
migration and record the decision in §6.

New env vars:

```typescript
SMS_PROVIDER: z.enum(["console", "twilio", "disabled"]).default("disabled"),
TWILIO_ACCOUNT_SID: z.string().optional(),
TWILIO_AUTH_TOKEN: z.string().optional(),
TWILIO_FROM_NUMBER: z.string().optional(),
TURNSTILE_SITE_KEY: z.string().optional(),
TURNSTILE_SECRET_KEY: z.string().optional(),
REQUIRE_EMAIL_VERIFICATION: z.enum(["true", "false"]).default("true").transform((v) => v === "true"),
SUPER_ADMIN_RECONCILE: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
```

---

### Package B — Registration: confirm password, optional fields, bot protection

**Files:** `src/modules/auth/domain/password-policy.ts` (new),
`src/modules/users/domain/registration.ts` (schema), `src/components/auth-form.tsx`,
`src/modules/auth/presentation/actions.ts`, `src/modules/auth/infrastructure/turnstile.ts` (new)

```typescript
// src/modules/users/domain/registration.ts — pure, no IO
export const registerUserSchema = z
  .object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(200),
    confirmPassword: z.string(),
    dateOfBirth: z.coerce.date().optional(),
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Use international format, e.g. +447700900123").optional(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((value) => !value.dateOfBirth || isAtLeastYearsOld(value.dateOfBirth, MIN_AGE_YEARS), {
    path: ["dateOfBirth"],
    message: `You must be at least ${MIN_AGE_YEARS} years old`,
  });
```

`isAtLeastYearsOld` lives in the domain layer and takes an injected `now` so it is testable.

Bot protection — server-side verification, never trust the client token:

```typescript
// src/modules/auth/infrastructure/turnstile.ts
export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true; // disabled in dev/test
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
  });
  const result = (await response.json()) as { success: boolean };
  return result.success;
}
```

Enumeration safety: whether or not the address exists, `registerAction` returns the same
"check your email" outcome. When it exists, send a "someone tried to register with your address"
email instead of a verification link.

---

### Package C — Email verification at signup

**Files:** `src/modules/auth/application/verify-email.ts` (new),
`src/app/verify-email/page.tsx` (new), `src/modules/notifications/` templates,
`src/modules/auth/infrastructure/auth.ts` (`publicPaths` + `authorize`)

Flow:

1. `registerAction` creates the user with `emailVerified: null`, generates a 32-byte random token,
   stores **only** `sha256(token)` in `VerificationRequest` with `expiresAt = now + 24h`, and emails
   the link `${APP_URL}/verify-email?token=…`.
2. `/verify-email` looks up by `tokenHash`, rejects consumed/expired tokens with distinct messages,
   sets `User.emailVerified = now()`, marks the request consumed, and redirects to `/onboarding`.
3. `authorize` in `auth.ts` rejects unverified users with a distinguishable error code so the login
   page can render "Verify your email" plus a resend button — not "invalid credentials".
4. `/verify-email` is added to `publicPaths`.

Gating (per Q2 default): unverified users may sign in and see the dashboard, but AI generation,
store connection, and Stripe checkout are blocked with an inline prompt. Implement the gate as one
`requireVerifiedEmail()` helper used by those three entry points, so the policy has one home.

Resend endpoint: rate-limited to 3 per hour per address, always returning success.

---

### Package D — Change password and change email

**Files:** `src/modules/auth/application/change-password.ts` (new),
`src/modules/auth/application/change-email.ts` (new),
`src/app/settings/account/page.tsx`, `src/components/account-security-forms.tsx` (new),
`src/modules/auth/presentation/actions.ts`

```typescript
// change-password.ts
export function makeChangePasswordService(deps: ChangePasswordDeps) {
  return async (input: { userId: string; currentPassword: string; newPassword: string }) => {
    const user = await deps.accounts.findById(input.userId);
    if (!user?.passwordHash) return err(new Error("Invalid credentials"));

    if (!(await deps.hasher.compare(input.currentPassword, user.passwordHash))) {
      return err(new Error("Current password is incorrect"));
    }

    const hash = await deps.hasher.hash(input.newPassword);
    // Bumping tokenVersion terminates every other session; the caller re-issues
    // the current session's JWT so the acting device stays signed in.
    const updated = await deps.accounts.updatePassword({ id: input.userId, passwordHash: hash });
    return ok({ tokenVersion: updated.tokenVersion });
  };
}
```

Change email is a two-step confirmation:

1. `requestEmailChange` validates the password, checks the new address is not in use (without
   revealing that it is), creates a `VerificationRequest` with `purpose: "email_change"`, emails a
   confirmation link to the **new** address and a "your email is being changed" notice to the
   **old** address.
2. `confirmEmailChange` consumes the token, updates `User.email`, sets `emailVerified = now()`,
   bumps `tokenVersion`, and writes an `AuditLog` entry.

Both flows live behind `getCurrentUser()`.

---

### Package E — Phone number and OTP verification

**Files:** `src/modules/notifications/domain/sms-sender.ts` (port),
`src/modules/notifications/infrastructure/console-sms.ts`,
`src/modules/notifications/infrastructure/twilio-sms.ts`,
`src/modules/auth/application/phone-verification.ts`,
`src/modules/auth/presentation/actions.ts` (`requestPhoneVerificationAction`, `verifyPhoneAction`, `removePhoneAction`),
`src/components/phone-verification-form.tsx`,
`src/app/settings/account/page.tsx`

```typescript
// port — infrastructure implements it, application depends only on this
export interface SmsSender {
  send(input: { to: string; body: string }): Promise<void>;
}
```

OTP rules: 6 digits, 10-minute expiry, 5 attempts maximum, 3 sends per hour per number, single-use.
Store only the hash. On success set `User.phone` and `User.phoneVerified`.

If `SMS_PROVIDER=disabled`, hide the phone-verification UI entirely rather than failing at submit.

Confirm `logger.redactValue` masks phone numbers (the audit says it does) and add a test asserting
an OTP body never reaches the logs.

---

### Package F — Session management

**Files:** `src/app/settings/account/page.tsx`, `src/modules/users/application/sessions.ts`

JWT sessions are stateless, so "active sessions" must be derived. Two options:

- **Minimal (recommended first):** expose only "Sign out everywhere", implemented by incrementing
  `tokenVersion`. No new storage; honest about what the system knows.
- **Full list:** record a `UserSession` row per successful sign-in (device, user-agent, IP hash,
  last-seen, `tokenVersion` at issue) updated by `getCurrentUser()`. More accurate, adds a write to
  the hot path — measure before adopting.

Record the choice in §6. Ship the minimal version unless the founder asks for the list.

---

### Package G — Super-admin reconciliation and settings dead links

**Files:** `src/modules/auth/infrastructure/super-admin.ts`, `src/app/settings/page.tsx`,
`docs/operations.md`

```typescript
export async function ensureSuperAdmin(deps: SuperAdminDeps): Promise<void> {
  if (!env.SUPER_ADMIN_EMAIL || !env.SUPER_ADMIN_PASSWORD) return;

  const existing = await deps.accounts.findByEmail(env.SUPER_ADMIN_EMAIL);
  if (!existing) {
    await deps.accounts.create({ /* … as today … */ });
    return;
  }

  // Without this, changing SUPER_ADMIN_PASSWORD or the flag in the environment
  // requires a manual database edit. Gated so it never happens by accident.
  if (!env.SUPER_ADMIN_RECONCILE) return;

  const hash = await deps.hasher.hash(env.SUPER_ADMIN_PASSWORD);
  await deps.accounts.reconcileSuperAdmin(existing.id, { passwordHash: hash, isSuperAdmin: true });
  logger.warn("superAdmin.reconciled", { userId: existing.id });
}
```

Second MFA channel: when `SUPER_ADMIN_PHONE` is set and an SMS provider is configured, allow the
super-admin MFA code to be delivered by SMS as an alternative to email. Document a break-glass
procedure in `docs/operations.md` (direct database update of `isSuperAdmin` plus a forced
`tokenVersion` bump) for the case where both channels fail.

Settings dead links — remove the four cards linking to `/settings/quality`, `/settings/rollout`,
`/settings/operating-model`, `/settings/unified-context` (`settings/page.tsx:202,216,230,244`), and
add a test:

```typescript
it("every settings link resolves to an existing route", async () => {
  const hrefs = extractHrefs(await readFile("src/app/settings/page.tsx", "utf8"));
  const routes = await enumeratePageRoutes("src/app");
  expect(hrefs.filter((h) => !routes.includes(h))).toEqual([]);
});
```

---

## 4. Subtasks

- [x] **A.1** Add `phoneVerified` to `User` (`dateOfBirth` omitted per Q1); migration applied.
- [x] **A.2** Add `VerificationRequest` table storing hashed `tokenHash` only.
- [x] **A.3** Add new env vars (`REQUIRE_EMAIL_VERIFICATION`, `TURNSTILE_*`, `SMS_PROVIDER`,
      `TWILIO_*`, `SUPER_ADMIN_RECONCILE`) to `env.ts`, `.env.example`, `docs/deployment.md`.
- [x] **B.1** Add `confirmPassword` to the schema with a mismatch refinement.
- [x] **B.2** Render the confirm-password field with an inline error.
- [x] **B.3** State the password rules in the UI.
- [d] **B.4** Add optional `dateOfBirth` with the age policy (per Q1) — **N/A** (omitted for MVP).
- [x] **B.5** Add optional E.164 `phone` with client + server validation.
- [x] **B.6** Add Turnstile verification server-side; disabled when unconfigured.
- [x] **B.7** Make registration enumeration-safe.
- [x] **C.1** Create users unverified; generate and store a hashed 24h token.
- [x] **C.2** Send the verification email; add the template.
- [x] **C.3** Build `/verify-email` with distinct expired / consumed / invalid messages.
- [x] **C.4** Add `/verify-email` to `publicPaths`.
- [x] **C.5** Reject unverified logins with a distinguishable code + resend affordance.
- [x] **C.6** Add `requireVerifiedEmail()` and gate AI generation, store connection, checkout.
- [x] **C.7** Add a rate-limited resend endpoint (3/hour/address).
- [d] **C.8** Integration test: register → verify → login → gated features unlocked (tracked as a follow-up end-to-end test). — **N/A**: covered by unit + integration tests for registration, email verification, and `requireVerifiedEmail` gating; full end-to-end journey deferred to production release readiness.
- [x] **D.1** Implement `changePassword` requiring the current password.
- [x] **D.2** Bump `tokenVersion` and keep the acting session valid.
- [x] **D.3** Send a password-changed notification; write an audit entry.
- [x] **D.4** Rate-limit password-change attempts.
- [x] **D.5** Implement `requestEmailChange` (confirm to new, notify old).
- [x] **D.6** Implement `confirmEmailChange` (update, verify, bump `tokenVersion`, audit).
- [x] **D.7** Make "address already in use" non-revealing.
- [x] **D.8** Build the settings UI for both flows.
- [x] **D.9** Tests: wrong current password, session invalidation, old-address notice, token reuse.
- [x] **E.1** Define the `SmsSender` port.
- [x] **E.2** Implement the console sender.
- [x] **E.3** Implement the Twilio sender behind the port.
- [x] **E.4** Implement OTP issue/verify with expiry, attempt caps, and send-rate limits.
- [x] **E.5** Build add/verify/replace/remove phone UI; hide when no provider is configured.
- [x] **E.6** Test: OTP body and phone number never appear in logs.
- [x] **E.7** Tests: expiry, attempt cap, replay, rate limit.
- [x] **F.1** Implement "Sign out everywhere" with confirmation.
- [x] **F.2** Decide minimal vs full session list; record the decision.
- [d] **F.3** (If full) add `UserSession` and populate it on sign-in. — **N/A**: minimal session management chosen (bump `tokenVersion` on password/email change and "sign out everywhere").
- [x] **G.1** Add gated `ensureSuperAdmin` reconciliation with audit logging.
- [x] **G.2** Add SMS as an alternative super-admin MFA channel.
- [x] **G.3** Document the break-glass procedure in `docs/operations.md`.
- [x] **G.4** Remove the four dead settings links.
- [x] **G.5** Add the settings-link resolution test.

## 5. Acceptance Criteria

- [x] All `REQ-0070` acceptance criteria are met (Packages B–G complete; review fixes applied).
- [x] No new server action uses `auth()` — all use `getCurrentUser()`.
- [x] All new mutations write `AuditLog` entries (verified in Package D implementation and Devin Review fixes).
- [x] Domain policy (password, phone normalisation) is pure and unit-tested.
- [x] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run build:worker` pass.
- [x] Migrations apply cleanly with no drift.
- [x] `docs/specs/current-state.md` updated (identity flows, verification states, gating policy).
- [x] `CHANGELOG.md` updated last.

## 6. Notes / Blockers

- **Decide before Package B:** whether DOB is collected at all (Q1). If not, drop A.1's
  `dateOfBirth`, B.4, and the age policy.
- **Decide before Package C:** provisioning before or after verification (Q2). The plan above
  implements the default (allow login, gate the expensive features).
- **Record here during implementation:**
  - A new `VerificationRequest` table was added; `VerificationToken`, `MfaCode`, and `PasswordResetCode`
    were left unchanged because they serve different flows (NextAuth magic-link, super-admin MFA,
    password reset). Plaintext token storage in `VerificationRequest` is avoided by hashing.
  - The minimal vs full session-list decision (F.2).
  - The final password policy if it changed (B.3).
- **Privacy note:** DOB and phone are personal data. Both must appear in the GDPR export
  (`dataExportService`) and be erased by account deletion. Add them to the export test.

## 7. Post-implementation review fixes

Addressed in `devin/cleanup-task-status-1785946663` after Devin Review findings on PR #143:

- [x] Fix `phone-verification-form.tsx` JSX `pattern` attributes (`\+…` → `\+…` and `\d{6}` → `\d{6}`).
- [x] Salt phone OTPs with a per-request random value; store `hash(salt:code)`; verify by looking up the user's pending `phone_verify` request, not by global `tokenHash`.
- [x] Enforce the 5-attempt cap by incrementing `attempts` on every wrong guess and checking the cap before comparing the code.
- [x] Add `rateLimit` to `verifyPhoneAction`.
- [x] Preserve the original email during account soft-delete so the 30-day restore path works.
- [x] Only send super-admin MFA SMS to `env.SUPER_ADMIN_PHONE` or an `account.phone` whose `phoneVerified` is set.
- [x] Rename `.env.example` `TWILIO_PHONE_NUMBER` to `TWILIO_FROM_NUMBER` to match `env.ts`.
- [x] Refuse to start when `SMS_PROVIDER=twilio` and Twilio credentials are incomplete, instead of silently falling back to the console sender.
- [x] Add Prisma migration `20260805165952_add_verification_request_salt` for the optional `VerificationRequest.salt` column.
