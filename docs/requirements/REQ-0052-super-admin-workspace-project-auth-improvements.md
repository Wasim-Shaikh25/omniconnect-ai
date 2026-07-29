---
description: Super-Admin Login, Workspace/Project Model, and Auth Improvements
---

# REQ-0052: Super-Admin Login, Workspace/Project Model, and Auth Improvements

- **Status:** Implemented
- **Owner:** Devin
- **Module(s):** `auth`, `users`, `organizations`, `meta`, `support`, `shared`
- **Original spec path:** `docs/specs/0052-super-admin-workspace-project-auth-improvements.md` (restructured)
- **Task:** `docs/tasks/TASK-0052-super-admin-workspace-project-auth-improvements.md`
- **Tracker:** `docs/trackers/TRACKER-0052-super-admin-workspace-project-auth-improvements.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0052-super-admin-workspace-project-auth-improvements.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** `auth`, `users`, `organizations`, `meta`, `support`, `shared`
- **Status:** Done
- **Owner:** Devin
- **Related task(s):** `docs/tasks/TASK-376-super-admin-workspace-project-auth.md`
- **Related ADR(s):** —
- **Last updated:** 2026-07-26

## 1. Summary

The application already has a platform-admin surface (`User.isSuperAdmin`, `/admin`, support tickets, SaaS coupons, and operational logging from spec `0051`). This spec adds the missing pieces the founder asked for:

- A **hardcoded, env-driven super-admin** login protected by email-based MFA.
- A **forgot-password** flow for all email/password users.
- A `User.phone` field for the hardcoded admin record.
- A `Project` layer under the existing `Organization` table (renamed conceptually to **Workspace**) so one Instagram account maps to one `Project` inside a workspace.

The `Organization` table stays in place for this phase, so existing workspace/tenant references continue to work.

## 2. Goals

- Hardcoded super-admin login with email-based MFA.
- Forgot-password flow for all users.
- `Project` and `ProjectMember` tables under `Organization`.
- Reuse the existing admin dashboard and support ticket system from spec `0051` for the super-admin overview instead of rebuilding them.

## 3. Non-Goals

- Full removal or rename of the `Organization` database table in this phase.
- Rebuilding existing `/admin`, `User.isSuperAdmin`, `SupportTicket`, `SaaSCoupon`, or `SystemLog` features — they are already implemented in spec `0051`.
- Mobile app changes.

## 4. User Stories

- As the application owner, I want to log in with a hardcoded email and receive an MFA code by email so that only I can access the admin dashboard.
- As a user, I want to reset my password via email so that I can recover my account.
- As a marketer, I want to create a project for each Instagram account inside my workspace so that I can manage multiple IG identities.

## 5. Domain Model

### Hardcoded super-admin config (env-driven)

- `email` (`SUPER_ADMIN_EMAIL`): hardcoded admin email.
- `phone` (`SUPER_ADMIN_PHONE`): hardcoded admin phone (stored on the user record).
- `password` (`SUPER_ADMIN_PASSWORD`): plaintext env at bootstrap; the seed script hashes it before storing.

The seed script creates/updates a single user whose `email === SUPER_ADMIN_EMAIL`. That user has `role = ADMIN`, `isSuperAdmin = true`, and `phone` set to `SUPER_ADMIN_PHONE`.

### `User` changes

- Add `phone String?` to store the super-admin phone and optionally future user phone numbers.

### `Project` (new)

- `id`
- `organizationId` (the workspace it belongs to)
- `name`
- `description` (optional)
- `instagramHandle` (optional; one project maps to one IG account)
- `integrationId` (optional link to a Meta `Integration`)
- `createdAt`, `updatedAt`

### `ProjectMember` (new, for future team sharing)

- `id`
- `projectId`
- `userId`
- `role` (`OWNER | ADMIN | EDITOR | VIEWER`)
- `createdAt`, `updatedAt`

### `VerificationToken` (existing NextAuth model reused)

- `identifier` encodes purpose, e.g. `"mfa:<email>"` or `"reset:<email>"`.
- Generate short-lived single-use codes.
- MFA codes expire after 10 minutes; reset codes expire after 1 hour.
- Tokens are consumed on verification and deleted after success.

## 6. Public Contract

### `auth` module

- `isSuperAdmin(email: string): boolean` — true when `email === env.SUPER_ADMIN_EMAIL`.
- `ensureSuperAdmin()` — idempotent seed that creates/updates the hardcoded super-admin user with `isSuperAdmin = true`.
- `sendVerificationCode(email, purpose: "mfa" | "reset")` — creates a token and sends it via `EmailSender`.
- `verifyCode(email, code, purpose): Promise<boolean>` — consumes and deletes the token.
- `requestPasswordResetAction(email)` — sends a reset code to the user.
- `resetPasswordAction(code, newPassword)` — verifies a reset code and updates the password.
- `loginAction` — updated to require an MFA code when `isSuperAdmin(email)` is true; optional code field shown in the UI.

### `organizations` module

- `createProject(organizationId, input)`
- `listProjects(organizationId)`
- `getProject(id)`
- `archiveProject(id)`
- `addProjectMember(projectId, userId, role)` / `removeProjectMember`

### `shared` / infrastructure

- `EmailSender` interface with `SMTP` (`nodemailer`) and `console` implementations.
- `createEmailSender()` resolves via `EMAIL_PROVIDER` env var.

## 7. Data / Persistence

Prisma migration adds:

- `User.phone String?`
- `Project` and `ProjectMember` tables.
- `Organization.projects Project[]` back-relation.
- `Integration.projects Project[]` back-relation (optional; on delete `SET NULL`).

Seed script (`instrumentation.ts`) calls `ensureSuperAdmin()` at startup.

## 8. API / UI Surface

### Auth

- `/login` — email + password; displays an MFA code field when the email matches `SUPER_ADMIN_EMAIL`.
- `/forgot-password` — email input; sends reset token.
- `/reset-password` — token + new password form.

### Admin (existing `/admin` from spec 0051 is reused)

- `/admin` — overview (already lists users, organizations, coupons, tickets, logs).
- `/admin/users` — list all users; toggle `isSuperAdmin` (already exists).
- `/admin/tickets` — triage support tickets (already exists).
- No new admin pages required for this spec; if needed, a `/admin/workspaces` route can be added later.

### Workspace/Project

- `/projects` (workspace-scoped) — list/create projects.
- Project detail for connecting an Instagram handle / Meta Integration.

## 9. Environment Variables

| Variable | Purpose |
|----------|---------|
| `SUPER_ADMIN_EMAIL` | Hardcoded super-admin email. |
| `SUPER_ADMIN_PHONE` | Hardcoded super-admin phone. |
| `SUPER_ADMIN_PASSWORD` | Plaintext seed password (hashed at startup). |
| `EMAIL_PROVIDER` | `console` (dev) or `smtp` (production). |
| `SMTP_HOST` | SMTP server host. |
| `SMTP_PORT` | SMTP server port. |
| `SMTP_USER` | SMTP username. |
| `SMTP_PASSWORD` | SMTP password. |
| `SMTP_FROM` | Default sender address. |

## 10. External Integrations

- **Email delivery**: `SMTP`/`nodemailer` adapter for production; dev mode prints the token to the console.
- **OAuth providers** (Google, Facebook, Apple, GitHub) remain unchanged. OAuth users still get a default workspace/organization.

## 11. Edge Cases & Failure Modes

- Super-admin user missing from the DB at startup: `ensureSuperAdmin()` creates it and sets `isSuperAdmin = true`.
- Missing email provider in dev: codes are logged.
- Reset token expired or incorrect: prompt to request a new one.
- Duplicate project name in a workspace: reject.
- Non-super admin accesses `/admin/*`: existing `requireSuperAdmin()` guard already returns 403 / redirects.

## 12. Security & Privacy

- Super-admin credentials live only in env, never in code or DB as plaintext.
- MFA codes are short-lived (10 min) and single-use.
- Reset tokens expire after 1 hour.
- Admin routes use the existing `requireSuperAdmin()` guard.
- `EmailSender` must not log `SMTP_PASSWORD` or user PII.

## 13. Testing Strategy

- Unit tests for `isSuperAdmin`, `verifyCode`, token expiry, password reset.
- Integration tests for `Project` domain service under an `Organization`.
- E2E: super-admin login flow, forgot-password flow, project CRUD.

## 14. Acceptance Criteria (Definition of Done)

- [x] Spec `0052` and task `TASK-376` created/updated.
- [x] Prisma migration adds `User.phone`, `Project`, and `ProjectMember`.
- [x] `ensureSuperAdmin()` creates the hardcoded admin with `isSuperAdmin = true`, `phone`, and a hashed password.
- [x] Super-admin login requires and validates an emailed MFA code.
- [x] Forgot-password request sends a code and the reset page updates the password.
- [x] Users can create/list/archive projects inside a workspace and assign members.
- [x] `CHANGELOG.md` updated.
- [x] `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test` pass.

## 15. Open Questions

1. Should the super-admin also have a mobile-number backup MFA in this phase, or keep email-only?
2. Do we expose projects as route params (`/projects/[projectId]`) immediately or keep the existing `/stores/[storeId]` structure and add project scoping in a follow-up?
3. Should OAuth registrations auto-create a starter project per connected Instagram account, or leave project creation explicit?
