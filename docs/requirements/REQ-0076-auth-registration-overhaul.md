---
description: Authentication & Registration Overhaul
---

# REQ-0076: Authentication & Registration Overhaul

- **Status:** Draft
- **Owner:** wasim
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0076-auth-registration-overhaul.md`
- **Related Tracker:** `docs/trackers/TRACKER-0076-auth-registration-overhaul.md`
- **Supersedes:** Portions of `REQ-0001-auth.md` (new registration fields, OTP, social login changes)
- **Last updated:** 2026-08-05

## 1. Summary

Overhaul registration to support new user fields (company name, mobile E.164, age, gender), env-configurable OTP verification (email + SMS), env-gated social logins (Google/Facebook/Apple auto-hidden if credentials absent), and auto-creation of a default Workspace upon signup. Simplify RBAC to USER + SUPER_ADMIN only — remove ADMIN, STORE_OWNER, STAFF roles.

## 2. Goals

- Extended registration: Name, Company Name, Mobile (E.164), Email, Password, Re-enter Password, Age, Gender.
- Env-configurable OTP: `ENABLE_EMAIL_OTP` / `ENABLE_MOBILE_OTP` toggle verification steps.
- Social login auto-disable: Google/Facebook/Apple buttons hidden when credentials not in env.
- Auto-create default workspace on registration.
- Simplify RBAC: only `USER` and `SUPER_ADMIN` roles.

## 3. Non-Goals

- Multi-tenant team/organization invitations.
- MFA (TOTP/hardware key) — future phase.

## 4. User Stories

- As a new user, I want to register with my name, company, mobile, email, and password so that my profile is complete from day one.
- As a user, I want OTP verification only when the platform operator has enabled it.
- As a user, I want social login options only for providers the platform has configured.
- As a user, I want a default workspace created automatically so I can start immediately.

## 5. Acceptance Criteria

- [ ] Registration API validates all new fields (name 2-100 chars, E.164 mobile, age 13-120, gender enum).
- [ ] Password policy: min 8 chars, 1 uppercase, 1 number, 1 special character, confirm match.
- [ ] Email OTP send/verify gated by `ENABLE_EMAIL_OTP` env var.
- [ ] Mobile OTP send/verify gated by `ENABLE_MOBILE_OTP` env var.
- [ ] Social login buttons auto-hidden when provider credentials absent from env.
- [ ] Default workspace auto-created on registration.
- [ ] RBAC simplified: only USER and SUPER_ADMIN roles exist in codebase.
- [ ] All existing role checks updated (remove ADMIN/STORE_OWNER/STAFF references).

## 6. Scope & Dependencies

- Modules: `auth`, `users`, `workspaces`
- Depends on: REQ-0077 (Workspace model must exist for auto-creation)
- Supersedes RBAC portions of REQ-0001, REQ-0011

## 7. Code Snippets

### Registration Input

```ts
// src/modules/auth/application/register.ts

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  companyName?: string;
  mobile: string;        // E.164
  age: number;
  gender: Gender;        // Male | Female | Other | PreferNotToSay
}

async function register(input: RegisterInput): Promise<RegisterResult> {
  const existingEmail = await userRepo.findByEmail(input.email);
  if (existingEmail) throw new ConflictError("Email already registered");

  const existingMobile = await userRepo.findByMobile(input.mobile);
  if (existingMobile) throw new ConflictError("Mobile already registered");

  const passwordHash = await argon2.hash(input.password);
  const user = await userRepo.create({ ...input, passwordHash, role: "USER" });

  if (env.ENABLE_EMAIL_OTP) {
    await otpService.sendEmailOtp(user.email);
  } else {
    await userRepo.markEmailVerified(user.id);
  }

  if (env.ENABLE_MOBILE_OTP) {
    await otpService.sendSmsOtp(user.mobile);
  } else {
    await userRepo.markMobileVerified(user.id);
  }

  const workspace = await workspaceService.create({
    userId: user.id,
    name: input.companyName || "My Workspace",
  });

  return { user, workspace, requiresOtp: env.ENABLE_EMAIL_OTP || env.ENABLE_MOBILE_OTP };
}
```

### Social Login Availability

```ts
function getAvailableSocialProviders(): string[] {
  const providers: string[] = [];
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) providers.push("google");
  if (env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET) providers.push("facebook");
  if (env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET) providers.push("apple");
  return providers;
}
```

## 8. Open Questions

None — all resolved in planning sessions.
