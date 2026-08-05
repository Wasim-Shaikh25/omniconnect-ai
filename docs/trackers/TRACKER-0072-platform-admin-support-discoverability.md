# TRACKER-0072: Platform Admin, Support and Discoverability Completeness

- **Status:** Superseded — see REQ-0087
- **Owner:** Platform / Frontend
- **Requirement:** `docs/requirements/REQ-0072-platform-admin-support-discoverability.md`
- **Task:** `docs/tasks/TASK-0072-platform-admin-support-discoverability.md`
- **Last updated:** 2026-07-31

> **⚠️ SUPERSEDED (Platform V2)** — replaced by:
> - `docs/trackers/TRACKER-0087-super-admin-panel.md`
> Retained for historical reference only. Do not use for new implementation.

## 1. Summary

Closes the admin and support gaps from `PRODUCTION_READINESS_AUDIT.md` §3.4, §3.5 #7, §8.6, and
§8.7: no suspend/delete/force-reset, no organization suspension, no integration health surface,
`/support` undiscoverable, and no global search.

## 2. Subtasks

### Planning
- [ ] Requirement reviewed and approved.
- [ ] Decided: is an appeal flow needed for suspended users?
- [ ] Decided: is support impersonation in scope? (default: no)
- [ ] Decided: integration staleness threshold.
- [ ] Branch created from `main`.

### Package A — Suspension foundation
- [ ] `User.suspendedAt` / `suspendedReason` / `suspendedByUserId` migrated.
- [ ] `Organization.suspendedAt` / `suspendedReason` / `suspendedByUserId` migrated.
- [ ] `getCurrentUser()` rejects suspended users.
- [ ] `getCurrentUser()` rejects members of suspended organizations.
- [ ] Sign-in rejects suspended users with a clear message.
- [ ] `/suspended` explanatory route added.

### Package B — Admin user actions
- [ ] `suspendUserAction` implemented (reason required, audit, `tokenVersion` bump).
- [ ] `unsuspendUserAction` implemented.
- [ ] Self-suspension blocked.
- [ ] Last-super-admin suspension blocked.
- [ ] `adminDeleteUserAction` soft-deletes and records the acting admin.
- [ ] `adminForcePasswordResetAction` reuses the `REQ-0070` reset flow.
- [ ] Admin user list shows status, supports filtering, and requires typed confirmation.

### Package C — Organization suspension
- [ ] `suspendOrganizationAction` / `unsuspendOrganizationAction` implemented.
- [ ] Suspended organizations blocked from tenant surfaces without data loss.
- [ ] Scheduled jobs skip suspended organizations.
- [ ] Admin organization list shows and filters suspension state.

### Package D — Integration and webhook health
- [ ] `WebhookHealth` aggregation implemented from existing logs/ledger.
- [ ] `IntegrationHealth` implemented (connected / stale / disconnected).
- [ ] `/admin/health` page built.
- [ ] Per-store health badge and reconnect action added.
- [ ] `INTEGRATION_STALE_DAYS` added to config and documented.

### Package E — Support and search
- [ ] "Support" added to the authenticated sidebar.
- [ ] `/help` navigation copy corrected; direct link to ticket creation added.
- [ ] Ticket owners notified of non-internal admin comments.
- [ ] Test: internal comments never reach the owner.
- [ ] `globalSearch` implemented with tenant scoping and per-type bounds.
- [ ] Keyboard-accessible search UI (`⌘K` / `/`, arrows, Enter, Escape).
- [ ] Empty and no-result states handled.
- [ ] Cross-tenant search leakage test passes with zero results.

### Security tests
- [ ] Every new admin action denies non-admins.
- [ ] Suspended user cannot log in and cannot use an existing session.
- [ ] Suspended organization blocks all its members.
- [ ] All new admin actions write audit entries with actor, target, and reason.

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

- [ ] All `REQ-0072` acceptance criteria are met.
- [ ] All verification steps above pass.

## 4. Notes / Blockers

- Package A must land before B and C — a suspension flag no guard reads is worse than no feature.
- Depends on `REQ-0068` M11 (page-level admin guards) and `REQ-0070` Package D (reset flow).
- `/support` sidebar entry coordinates with `REQ-0068` M14 and `REQ-0069` L2.
