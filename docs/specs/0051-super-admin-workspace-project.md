# Spec 0051: Super-Admin Dashboard, Workspaces/Projects, and Auth Improvements

- **Module(s):** auth, users, organizations, meta, shared
- **Status:** In Progress
- **Owner:** Devin
- **Related task(s):** docs/tasks/TASK-375-super-admin-workspace-project.md
- **Related ADR(s):** (none)
- **Last updated:** 2026-07-26

## 1. Summary

Introduce a true application-owner super-admin experience, improve registration/login with forgot-password, and add a `Project` layer under the existing `Organization` table (renamed conceptually to **Workspace**) so one Instagram account maps to one project.

## 2. Goals

- Hardcoded super-admin login with email-based MFA.
- Super-admin `/admin` dashboard: users, workspaces (organizations), payments/billing overview, support ticket list.
- Forgot-password flow for all users.
- Add `Project` entity under `Organization` (workspace). One Instagram account = one project.
- Keep the existing `Organization` table as the workspace boundary to avoid a 1,000+ reference refactor.

## 3. Non-Goals

- Full removal/rename of the `Organization` database table in this phase.
- New ticket/message system for support (the dashboard can list from existing tables first).
- Mobile app changes.

## 4. User Stories

- As the application owner, I want to log in with a hardcoded email and receive an MFA code by email so that only I can access the admin dashboard.
- As a user, I want to reset my password via email so that I can recover my account.
- As a marketer, I want to create a project for each Instagram account inside my workspace so that I can manage multiple IG identities.

## 5. Domain Model

### SuperAdminConfig (env-driven)
- `email` (`SUPER_ADMIN_EMAIL`): hardcoded admin email.
- `phone` (`SUPER_ADMIN_PHONE`): hardcoded admin phone (stored/displayed, not a login factor yet).
- `password` (`SUPER_ADMIN_PASSWORD`): plaintext env at bootstrap; the seed script hashes it with bcrypt before storing.

### Project (new)
- `id`
- `organizationId` (the workspace it belongs to)
- `name`
- `description` (optional)
- `instagramHandle` (optional; one project maps to one IG account)
- `integrationId` (optional link to a Meta `Integration`)
- `createdAt`, `updatedAt`

### ProjectMember (new, for future team sharing)
- `id`
- `projectId`
- `userId`
- `role` (`OWNER` | `ADMIN` | `EDITOR` | `VIEWER`)
- `createdAt`

### VerificationToken (existing NextAuth model reused)
- Generate short-lived MFA/reset tokens.
- Tokens are consumed on verification and expire after 10 minutes (MFA) or 1 hour (reset).

## 6. Public Contract

### Auth module
- `isSuperAdmin(email: string): boolean`
- `sendVerificationCode(email: string, purpose: "mfa" | "reset"): Promise<void>`
- `verifyCode(email: string, token: string, purpose: string): Promise<boolean>`
- `requestPasswordResetAction(email)`
- `resetPasswordAction(token, newPassword)`
- `loginAction` / `registerAction` updated to support MFA flow.

### Organizations module
- `createProject(organizationId, input)`
- `listProjects(organizationId)`
- `getProject(id)`
- `archiveProject(id)`

## 7. Data / Persistence

Prisma migration adds:
- `Project` and `ProjectMember` tables.
- Optionally `User.phone`.
- Seed script creates the hardcoded super-admin user if missing.

## 8. API / UI Surface

- `/login` — supports email + password; if email matches `SUPER_ADMIN_EMAIL`, additional MFA code field appears.
- `/forgot-password` — email input; sends reset token.
- `/reset-password` — token + new password.
- `/admin` — super-admin dashboard (server-side `requireRole("ADMIN")`).
  - `/admin/users`
  - `/admin/workspaces`
  - `/admin/billing`
  - `/admin/tickets`
- `/projects` (under a workspace/store context) — list/create projects.

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

- Email delivery: an SMTP/`nodemailer` adapter for production; dev mode prints the token to the console.
- Existing OAuth providers (Google, Facebook, Apple, GitHub) remain unchanged.

## 11. Edge Cases & Failure Modes

- Super-admin user missing from DB at startup: seed creates it.
- Missing email provider in dev: tokens logged.
- Reset token expired: prompt to request a new one.
- Duplicate project name in workspace: reject.

## 12. Security & Privacy

- Super-admin credentials live only in env, never in code.
- MFA codes are short-lived (10 min) and single-use.
- Reset tokens expire after 1 hour.
- Admin routes use `requireRole("ADMIN")`.
- No PII logged.

## 13. Testing Strategy

- Unit tests for `isSuperAdmin`, `verifyCode`, password reset.
- Integration tests for project creation under a workspace.
- E2E: super-admin login flow, forgot-password flow, project CRUD.

## 14. Acceptance Criteria (Definition of Done)

- [ ] Super-admin can log in with email + emailed MFA code on `/login`.
- [ ] `/admin` dashboard loads and lists users, workspaces, and billing overview.
- [ ] Forgot-password request sends a token and the reset page updates the password.
- [ ] `Project` table exists and a user can create/list projects inside a workspace.
- [ ] `CHANGELOG.md` updated.
- [ ] Lint + typecheck + tests pass.

## 15. Open Questions

- Should the super-admin also have a mobile-number backup MFA in this phase, or keep email-only?
- Do we want to expose projects as route params (e.g. `/projects/[projectId]`) or keep the existing `/stores/[storeId]` structure and add project scoping later?
