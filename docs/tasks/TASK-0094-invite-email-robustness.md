# TASK-0094: Invite Member Email Resilience

- **Status:** In Progress
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0077-workspace-project-system.md`
- **Tracker:** `docs/trackers/TRACKER-0094-invite-email-robustness.md`
- **Module(s):** workspaces
- **Changelog entry:** `CHANGELOG.md [Unreleased]`
- **Last updated:** 2026-08-05

## 1. Summary

The `/settings` **Invite member** form returned a 500 / "Something went wrong" page when the configured email provider could not deliver the invite message (e.g. `EMAIL_PROVIDER=smtp` with an unreachable host, or a stale dev-server process still using SMTP after `.env` was switched to `console`). The `inviteMember` use-case worked when invoked directly because it ran in a fresh process with `EMAIL_PROVIDER=console`, but the long-running `next dev` server cached the earlier `SmtpEmailSender` and threw on `sendMail`.

This task makes the invite flow resilient: the invite record is still created and the action returns a friendly result instead of crashing the server action.

## 2. Implementation Plan

### Step 1 — Make `sendInviteEmail` best-effort

In `src/modules/workspaces/infrastructure/container.ts`:

- Import `logger` from `@/shared/observability`.
- Convert `sendInviteEmail` from a sync wrapper into an `async` function.
- Wrap `emailSender.send(...)` in `try/catch`.
- On failure, `logger.error("workspaces.inviteEmailFailed", { error, email })` and resolve.
- Keep the function returning `Promise<void>` so callers continue.

### Step 2 — Defensive server action wrapper

In `src/modules/workspaces/presentation/invite-member.actions.ts`:

- Import `logger`.
- Wrap the `inviteMember(...)` call and `revalidatePath("/settings")` in a `try/catch`.
- On unexpected error, log and return `{ error: "Could not send the invite. Please try again." }`.

## 3. Acceptance Criteria

- `/settings` invite form submits successfully and shows "Invite sent." even when the SMTP host is unreachable.
- The pending invite is persisted in `OrganizationInvite`.
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:integration`, and `npm run build` pass.
- `npx tsx scripts/check-http-status.ts` passes against a production build.
