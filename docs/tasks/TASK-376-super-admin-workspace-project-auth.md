# Task TASK-376: Super-Admin Login, Workspace/Project Model, and Auth Improvements

- **Status:** In Progress
- **Spec:** `docs/specs/0052-super-admin-workspace-project-auth-improvements.md`
- **Module(s):** `auth`, `users`, `organizations`, `meta`, `support`, `shared`
- **Owner:** Devin
- **Changelog entry:** `CHANGELOG.md` [Unreleased] / In Progress — TASK-376

## Description

The application already has platform-admin infrastructure from spec `0051` (`User.isSuperAdmin`, `/admin`, SaaS coupons, support tickets, system logs). This task implements the remaining founder requirements:

- Hardcoded super-admin login with email-based MFA.
- Forgot-password flow for all users.
- `User.phone` field for the hardcoded admin record.
- `Project` / `ProjectMember` tables under the existing `Organization` (workspace) model.

The existing `Organization` table is repurposed as the workspace boundary; the `Project` layer lets one Instagram account map to one project inside a workspace.

## Subtasks

### Documentation & planning (this session)

- [x] Read `CHANGELOG.md` to confirm `0051` is already done and identify the next spec/task numbers.
- [x] Create spec `0052` (super-admin login, workspace/project, auth improvements).
- [x] Create/update task `TASK-376` with subtasks and status.
- [x] Update `CHANGELOG.md` [Unreleased] / In Progress.

### Implementation (deferred to next dev session)

- [ ] Add env variables to `src/shared/config/env.ts` and `.env.example`:
  - `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PHONE`, `SUPER_ADMIN_PASSWORD`
  - `EMAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- [ ] Implement `EmailSender` abstraction (`console` + `SMTP`/`nodemailer`) in `auth` infrastructure.
- [ ] Implement `VerificationToken`-based MFA/reset code creation and consumption with purpose-scoped TTLs.
- [ ] Implement `isSuperAdmin()` and `ensureSuperAdmin()` seed; wire `ensureSuperAdmin()` in `src/instrumentation.ts`.
- [ ] Update credentials provider in `auth.ts` to require an MFA code for the hardcoded super-admin email; update `loginAction` to support MFA.
- [ ] Implement `requestPasswordResetAction` and `resetPasswordAction`.
- [ ] Update `PrismaAccountRepository` with `findById` and `updatePassword`.
- [ ] Add `User.phone` and `Project` / `ProjectMember` tables to `prisma/schema.prisma`; create Prisma migration.
- [ ] Add project management server actions and public contracts in the `organizations` module.
- [ ] Update auth UI (`login`, `forgot-password`, `reset-password`, project list/create) as needed.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`; fix failures.
- [ ] Move `TASK-376` and spec `0052` to Done in `CHANGELOG.md`; update as needed.

## Acceptance Criteria

- [ ] Matches spec `0052` acceptance criteria.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass.
- [ ] `CHANGELOG.md` updated.

## Notes / Blockers

- Existing spec `0051` and task `TASK-375` are already merged to `main`. This task uses the next available numbers: `0052` / `TASK-376`.
- The current `main` branch already contains `User.isSuperAdmin`, `requireSuperAdmin()`, `/admin/*` pages, `SupportTicket`, `SaaSCoupon`, and `SystemLog`. Reuse them instead of rebuilding.
- A partial scaffold was started earlier in a separate branch; it should be used as reference but reconciled against the latest `main` schema before re-applying.
