# TASK-0072: Implement Platform Admin, Support and Discoverability Completeness

- **Status:** Todo
- **Owner:** Platform / Frontend
- **Requirement:** `docs/requirements/REQ-0072-platform-admin-support-discoverability.md`
- **Tracker:** `docs/trackers/TRACKER-0072-platform-admin-support-discoverability.md`
- **Module(s):** `users`, `organizations`, `auth`, `support`, presentation shell
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Admin suspend/delete/force-reset, organization suspension, integration health surface, support discoverability, global search.
- **Last updated:** 2026-07-31

## 1. Summary

Five packages. Package A (schema + session enforcement) must land first because every other admin
action depends on suspension being enforced at the session layer — an action that flips a flag no
guard reads is worse than no action at all.

## 2. References

- Audit: `PRODUCTION_READINESS_AUDIT.md` §3.4, §3.5 #7, §8.6, §8.7
- Requirement: `docs/requirements/REQ-0072-platform-admin-support-discoverability.md`
- Existing patterns: `src/modules/users/presentation/actions.ts` (`toggleUserSuperAdminAction`),
  `src/modules/auth/infrastructure/session.ts` (`getCurrentUser`),
  `src/app/support/actions.ts`, `src/app/admin/**`

## 3. Implementation Plan

---

### Package A — Suspension schema and session enforcement

**Files:** `prisma/schema.prisma` + migration, `src/modules/auth/infrastructure/session.ts`,
`src/modules/auth/infrastructure/auth.ts`

```prisma
model User {
  // ... existing
  suspendedAt      DateTime?
  suspendedReason  String?
  suspendedByUserId String?

  @@index([suspendedAt])
}

model Organization {
  // ... existing
  suspendedAt       DateTime?
  suspendedReason   String?
  suspendedByUserId String?

  @@index([suspendedAt])
}
```

Enforcement — a suspended user must be rejected everywhere `getCurrentUser()` is used (108 call
sites), which is why this goes in the session layer rather than in each page:

```typescript
// src/modules/auth/infrastructure/session.ts
const fresh = await loadFreshUser(user.id); // WHERE { id, deletedAt: null }
if (!fresh) return null;
if (user.tokenVersion !== fresh.tokenVersion) return null;
// A suspended account must not hold a live session anywhere in the app.
if (fresh.suspendedAt) return null;
if (fresh.organization?.suspendedAt) return null;
return fresh;
```

`authorize` in `auth.ts` must reject a suspended user at sign-in with a distinguishable code so the
login page can render "This account has been suspended. Contact support." — using the same message
whether or not the account exists is not required here (the user has already proven the password),
but the message must not leak *why*.

Suspended-organization members get an explanatory page rather than a redirect loop: add a
`/suspended` route reachable while authenticated, and have the shell redirect there.

---

### Package B — Admin user actions

**Files:** `src/modules/users/application/suspend-user.ts` (new),
`src/modules/users/presentation/actions.ts`, `src/app/admin/users/page.tsx`

```typescript
// src/modules/users/presentation/actions.ts
export async function suspendUserAction(input: { userId: string; reason: string }) {
  const admin = await requireSuperAdmin();
  const parsed = suspendUserSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  // Guard rails: an admin locking themselves or the platform out is unrecoverable
  // without a database edit.
  if (parsed.data.userId === admin.id) return { error: "You cannot suspend your own account." };
  if (await usersService.isLastSuperAdmin(parsed.data.userId)) {
    return { error: "Cannot suspend the last remaining super admin." };
  }

  // Bumping tokenVersion terminates live sessions immediately.
  await usersService.suspend({
    userId: parsed.data.userId,
    reason: parsed.data.reason,
    byUserId: admin.id,
  });
  await auditLog.record({
    actorId: admin.id,
    action: "admin.user.suspended",
    targetId: parsed.data.userId,
    metadata: { reason: parsed.data.reason },
  });
  revalidatePath("/admin/users");
  return { ok: true };
}
```

`unsuspendUserAction` mirrors it (clears `suspendedAt`/`suspendedReason`, audits, does **not**
restore the old `tokenVersion`).

`adminDeleteUserAction` calls the same soft-delete path as `deleteAccountAction` (30-day grace,
`deletedAt` + `deletedReason`), recording the acting admin. It must **not** hard delete.

`adminForcePasswordResetAction` sets `passwordHash = null` (or a sentinel that can never match),
bumps `tokenVersion`, and issues a reset token using the `REQ-0070` Package D flow. Do not
duplicate token generation.

UI: status column (active / suspended / deleted) with a filter, a typed-confirmation dialog showing
the target email, and a required reason field for suspension.

---

### Package C — Organization suspension

**Files:** `src/modules/organizations/application/suspend-organization.ts` (new),
`src/modules/organizations/presentation/admin-actions.ts`, `src/app/admin/organizations/page.tsx`,
`src/jobs/`

Same shape as Package B. Additionally:

- Scheduled jobs must skip suspended organizations. Add the check at the job level, not per
  handler:

```typescript
// in each recurring job's guard
const organization = await organizations.findById(organizationId);
if (organization?.suspendedAt) {
  logger.info("job.skipped.organizationSuspended", { organizationId, job: jobName });
  return;
}
```

- Suspending an organization does not delete data and does not cancel the Stripe subscription.
  Whether it should is a billing decision — record it in §6 if the founder wants it.

---

### Package D — Integration and webhook health

**Files:** `src/app/admin/health/page.tsx` (new),
`src/modules/analytics/application/integration-health.ts` (new), tenant store detail page

Source the data from what already exists — `SystemLog` and the `ProcessedWebhookEvent` ledger from
`REQ-0067` H2 — rather than adding a telemetry pipeline:

```typescript
export interface WebhookHealth {
  provider: "meta" | "shopify" | "stripe";
  received: number;
  failed: number;
  failureRate: number;
  lastSuccessAt: Date | null;
}

export interface IntegrationHealth {
  storeId: string;
  storeName: string;
  provider: string;
  status: "connected" | "disconnected" | "stale";
  lastSuccessfulSyncAt: Date | null;
}
```

`stale` = connected but no successful sync in `INTEGRATION_STALE_DAYS` (default 7).
`disconnected` = explicitly marked, e.g. by `app/uninstalled` (`REQ-0068` M5).

Admin page: one table per provider with the rolling-window counts, plus a list of stale and
disconnected integrations across all tenants. Tenant page: a per-store badge with the last
successful sync and a reconnect action.

Failure-rate thresholds here become the alert conditions in `REQ-0075`.

---

### Package E — Support discoverability and global search

**Files:** `src/components/app-shell.tsx`, `src/app/help/page.tsx`,
`src/components/global-search.tsx` (new),
`src/modules/*/application/search.ts` or one `search` application service

Sidebar: add "Support" next to "Help". Correct the `/help` copy that refers to a non-existent "top
navigation" and link directly to ticket creation.

Ticket notifications: when an admin adds a **non-internal** comment, notify the ticket owner. Add a
test asserting `isInternal` comments never appear in the owner's view or notifications.

Global search — one application service that fans out to tenant-scoped queries, each individually
bounded:

```typescript
export async function globalSearch(input: {
  query: string;
  user: CurrentUser;
  limitPerType?: number;
}): Promise<SearchResults> {
  const limit = input.limitPerType ?? 5;
  // Every branch is scoped by the same tenant guard used elsewhere; a STAFF user is
  // additionally pinned to their store.
  const scope = tenantGuard.scopeFor(input.user);
  const [stores, products, customers, conversations, coupons] = await Promise.all([
    storesRepository.search(input.query, scope, limit),
    productsRepository.search(input.query, scope, limit),
    customersRepository.search(input.query, scope, limit),
    conversationsRepository.search(input.query, scope, limit),
    couponsRepository.search(input.query, scope, limit),
  ]);
  return { stores, products, customers, conversations, coupons };
}
```

UI: `⌘K` / `/` opens, arrow keys navigate, `Enter` opens, `Escape` closes, results grouped by type,
input debounced at ~250 ms. Use the Radix primitives already in the dependency tree so focus
management is correct (this also aligns with the `REQ-0068` M8 accessibility work).

**Test:** a user in tenant A searching for a term that matches only tenant B's entities gets zero
results.

---

## 4. Subtasks

- [ ] **A.1** Add suspension columns to `User` and `Organization`; migrate.
- [ ] **A.2** Reject suspended users in `getCurrentUser()`.
- [ ] **A.3** Reject suspended-organization members in `getCurrentUser()`.
- [ ] **A.4** Reject suspended users at sign-in with a distinguishable message.
- [ ] **A.5** Add the `/suspended` explanatory route.
- [ ] **B.1** Implement `suspendUserAction` with reason, audit, and `tokenVersion` bump.
- [ ] **B.2** Implement `unsuspendUserAction`.
- [ ] **B.3** Block self-suspension and last-super-admin suspension.
- [ ] **B.4** Implement `adminDeleteUserAction` as a soft delete recording the acting admin.
- [ ] **B.5** Implement `adminForcePasswordResetAction` reusing the `REQ-0070` reset flow.
- [ ] **B.6** Add status column, filter, and typed-confirmation dialogs to the admin user list.
- [ ] **C.1** Implement `suspendOrganizationAction` / `unsuspendOrganizationAction`.
- [ ] **C.2** Block tenant surfaces for suspended organizations.
- [ ] **C.3** Skip suspended organizations in scheduled jobs.
- [ ] **C.4** Add suspension state and filtering to the admin organization list.
- [ ] **D.1** Implement `WebhookHealth` aggregation from existing logs/ledger.
- [ ] **D.2** Implement `IntegrationHealth` with connected / stale / disconnected states.
- [ ] **D.3** Build `/admin/health`.
- [ ] **D.4** Add the per-store health badge and reconnect action.
- [ ] **D.5** Add `INTEGRATION_STALE_DAYS` to config.
- [ ] **E.1** Add "Support" to the authenticated sidebar.
- [ ] **E.2** Correct the `/help` navigation copy and link to ticket creation.
- [ ] **E.3** Notify ticket owners of non-internal admin comments.
- [ ] **E.4** Test: internal comments never reach the owner.
- [ ] **E.5** Implement the tenant-scoped `globalSearch` service with per-type bounds.
- [ ] **E.6** Build the keyboard-accessible search UI with `⌘K` / `/`.
- [ ] **E.7** Handle empty and no-result states.
- [ ] **E.8** Cross-tenant search leakage test.
- [ ] **F.1** Test: every new admin action denies non-admins.
- [ ] **F.2** Test: suspended user cannot log in or use an existing session.
- [ ] **F.3** Test: suspended organization blocks all members.

## 5. Acceptance Criteria

- [ ] All `REQ-0072` acceptance criteria are met.
- [ ] Every new admin action calls `requireSuperAdmin()` at the application layer.
- [ ] Every new admin action writes an `AuditLog` entry with actor, target, and reason.
- [ ] No hard deletes are introduced.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run build:worker` pass.
- [ ] Migrations apply cleanly with no drift.
- [ ] `docs/specs/current-state.md` updated (suspension semantics, health surface, search scope).
- [ ] `CHANGELOG.md` updated last.

## 6. Notes / Blockers

- **Order matters:** Package A first. A suspension flag that no guard reads is a false sense of
  safety.
- **Depends on** `REQ-0068` M11 (page-level admin guards) — do not add admin surface to pages that
  are still layout-guarded only.
- **Depends on** `REQ-0070` Package D for the reset-token flow reused by B.5.
- **Coordinate** E.1 with `REQ-0068` M14 and `REQ-0069` L2 — all three touch `/support`
  discoverability.
- **Record here during implementation:**
  - Whether organization suspension should also pause Stripe billing.
  - Final staleness threshold if it differs from 7 days.
