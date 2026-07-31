# REQ-0072: Platform Admin, Support and Discoverability Completeness

- **Status:** Approved
- **Owner:** Platform / Frontend
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0072-platform-admin-support-discoverability.md`
- **Related Tracker:** `docs/trackers/TRACKER-0072-platform-admin-support-discoverability.md`
- **Source audit:** `PRODUCTION_READINESS_AUDIT.md` §3.4 (webhook/integration health), §3.5 #7 (global search), §8.6, §8.7
- **Remediation index:** `docs/audit/2026-07-31-remediation-index.md`
- **Last updated:** 2026-07-31

## 1. Summary

The admin dashboard is read-only where it matters. A super admin can list users, organizations,
tickets, coupons, and logs, and can toggle the super-admin flag — but cannot suspend an abusive
account, delete a user, force a password reset, or suspend an organization. There is no operator
view of webhook failure rates or stale integrations, which is precisely the surface that would have
surfaced H2, H6, and H7 before the audit did. On the tenant side, `/support` exists and works but is
not linked from the sidebar, so users find the ticket flow only by guessing the URL. There is no
global search.

## 2. Verified current state (re-checked at commit `33e2e0b`, 2026-07-31)

| Capability | State | Evidence |
|---|---|---|
| Admin overview, user list, org list, tickets, coupons, logs | ✅ | `src/app/admin/**` |
| Toggle super-admin flag | ✅ | `toggleUserSuperAdminAction` |
| Suspend / unsuspend user | ❌ | `User` has no `status`/`suspendedAt`; no action exists |
| Delete / deactivate user as admin | ❌ | Only self-service soft delete (`deleteAccountAction`) |
| Admin-forced password reset | ❌ | No action |
| Suspend / terminate organization | ❌ | No action, no field |
| Impersonate for support | ❌ | Not present |
| Webhook / integration health surface | ❌ | No operator view of failure rates or stale integrations |
| Ticket create / list / triage / comments | ✅ | `/support`, `/admin/tickets`, `TicketCommentForm` with `isInternal` |
| `/support` discoverable in the sidebar | ❌ | Sidebar links `/help` only |
| Global search | ❌ | No search in `AppShell` nav |
| Admin page-level authorization | ❌ | Zero `requireSuperAdmin()` calls in admin pages — fixed by `REQ-0068` M11 |

## 3. Goals

- A super admin can act on abuse and support requests, not merely observe them.
- Every destructive or privilege-changing admin action is audited, reversible where sensible, and
  impossible to perform on oneself by accident.
- Operators can see integration and webhook health before customers report a problem.
- Users can find support without knowing a URL.
- Users can navigate to any entity by name rather than by clicking through hierarchies.

## 4. Non-Goals

- Building a full ticketing product (SLA timers, CSAT, macros). The existing ticket system is
  adequate for MVP.
- Billing administration from the admin console (refunds, credits) — a follow-up.
- Fine-grained platform-admin roles. `isSuperAdmin` remains a single boolean.

## 5. User Stories

- As a **super admin**, I suspend an account that is abusing the free tier, and the user is signed
  out immediately.
- As a **super admin**, I restore a suspended account without a database edit.
- As a **super admin**, I trigger a password reset for a user who has lost access to MFA.
- As a **super admin**, I suspend an organization that is charging back, without deleting its data.
- As a **super admin**, I see which integrations are failing and how often, so I can act before the
  merchant complains.
- As a **user**, I find "Support" in the sidebar and raise a ticket.
- As a **user**, I type a store, product, customer, or conversation name and jump straight to it.

## 6. Acceptance Criteria

### 6.1 User administration
- [ ] `User.suspendedAt DateTime?` and `User.suspendedReason String?` are added via migration.
- [ ] `suspendUserAction` / `unsuspendUserAction` exist, call `requireSuperAdmin()`, validate with
      zod, and write `AuditLog` entries.
- [ ] Suspension increments `tokenVersion`, so live sessions are terminated immediately.
- [ ] A suspended user attempting to log in receives a clear, non-enumerating message.
- [ ] `getCurrentUser()` treats a suspended user as unauthenticated.
- [ ] A super admin cannot suspend themselves or the last remaining super admin.
- [ ] `adminDeleteUserAction` performs the same **soft delete** as self-service (30-day grace), not
      a hard delete, and records who performed it.
- [ ] `adminForcePasswordResetAction` invalidates the current password, bumps `tokenVersion`, and
      emails a reset link — reusing the `REQ-0070` Package D flow rather than duplicating it.
- [ ] The admin user list shows status (active / suspended / deleted) and supports filtering by it.
- [ ] Every action is confirmable and shows the affected user's email before executing.

### 6.2 Organization administration
- [ ] `Organization.suspendedAt DateTime?` and `suspendedReason String?` are added via migration.
- [ ] `suspendOrganizationAction` / `unsuspendOrganizationAction` exist with `requireSuperAdmin()`
      and audit entries.
- [ ] Suspending an organization blocks its members from all tenant surfaces with an explanatory
      page; it does **not** delete data.
- [ ] Suspension state is visible in the admin organization list and filterable.
- [ ] A suspended organization's scheduled jobs (sync, AI generation) stop running.

### 6.3 Integration and webhook health
- [ ] An admin page shows, per provider (Meta, Shopify, Stripe): deliveries received, failures, and
      the last success time over a rolling window.
- [ ] A tenant-facing integration health indicator shows each store's connection state and last
      successful sync.
- [ ] Stale integrations (no successful sync in N days, configurable) are flagged.
- [ ] Disconnected integrations (e.g. from `app/uninstalled`, `REQ-0068` M5) are visibly
      distinguished from merely idle ones.
- [ ] The health data source is the existing `SystemLog` / webhook ledger — no new telemetry
      pipeline.
- [ ] Failure-rate thresholds feed the alerting defined in `REQ-0075`.

### 6.4 Support discoverability
- [ ] `/support` appears in the authenticated sidebar (also required by `REQ-0069` L2).
- [ ] `/help` content that references a non-existent "top navigation" is corrected.
- [ ] `/help` links directly to ticket creation.
- [ ] The ticket list shows status and last update, and links to the ticket detail.
- [ ] A user is notified when an admin comments on their ticket (excluding `isInternal` comments).
- [ ] Internal comments are never visible to the ticket owner — covered by a test.

### 6.5 Global search
- [ ] A search control in `AppShell` searches stores, products, customers, conversations, and
      coupons within the acting user's tenant scope.
- [ ] Results are strictly tenant-scoped; a `STAFF` user sees only their pinned store's entities.
- [ ] Search is keyboard-accessible (`/` or `⌘K` to focus, arrow keys, `Enter`, `Escape`).
- [ ] Queries are debounced and bounded (`take` on every branch).
- [ ] Empty and no-result states are handled.
- [ ] A cross-tenant search test asserts zero leakage.

### 6.6 Cross-cutting
- [ ] Every new admin action calls `requireSuperAdmin()` at the application layer, not only in the
      UI.
- [ ] Every new admin action writes an `AuditLog` entry including the actor, target, and reason.
- [ ] Destructive actions require a typed confirmation, matching the existing account-deletion
      pattern.
- [ ] Tests cover: non-admin denied for every new action, self-suspension blocked, last-super-admin
      protection, suspended-user login denied, suspended-org access denied.

## 7. Scope & Dependencies

**Modules affected:** `users`, `organizations`, `auth` (session checks for suspension), `support`,
`analytics`/`shared` (health metrics), `src/components/app-shell.tsx`.

**Schema changes:** `User.suspendedAt`, `User.suspendedReason`, `Organization.suspendedAt`,
`Organization.suspendedReason`.

**Depends on:**
- `REQ-0068` M11 — page-level admin guards must exist before adding more admin surface.
- `REQ-0070` Package D — admin-forced password reset reuses that flow.
- `REQ-0068` M14 / `REQ-0069` L2 — `/support` sidebar entry must land with the `publicPaths` change.

## 8. Open Questions

1. Should suspension be reversible by the suspended user (appeal flow)? **Default: no; super-admin
   action only, with an email explaining how to contact support.**
2. Should support impersonation ("log in as user") exist? It is powerful and high-risk.
   **Default: not in this requirement; if added later it must be time-boxed, audited, and consented
   to.**
3. Does the admin console need multi-admin role separation? **Default: no; `isSuperAdmin` stays a
   single boolean.**
4. What is the staleness threshold for a flagged integration? **Default: 7 days without a
   successful sync.**
