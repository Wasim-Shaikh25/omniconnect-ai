# TRACKER-0067: Release Blockers — Critical and High Findings

- **Status:** In Progress
- **Owner:** Backend / Platform
- **Requirement:** `docs/requirements/REQ-0067-release-blockers-critical-high.md`
- **Task:** `docs/tasks/TASK-0067-release-blockers-critical-high.md`
- **Last updated:** 2026-08-01

## 1. Summary

Twelve release-blocking defects from `PRODUCTION_READINESS_AUDIT.md` §4. All were re-verified as
**open** at commit `33e2e0b` on 2026-07-31 (including H9, which the audit addendum reported as
fixed). No production deployment may proceed until every box below is `x`.

## 2. Subtasks

### Planning
- [x] Requirement reviewed and approved.
- [x] Task file reviewed with implementation details and code references.
- [ ] Q3 (`past_due` policy), Q4 (event delivery semantics), Q5 (Shopify App Store) confirmed or
      the §5 defaults explicitly accepted.
- [x] CI Redis service landed (dependency from `REQ-0074`).
- [x] Branch created from `main`.

### C1 — NextAuth `trustHost`
- [x] Failing check captured: standalone boot without `AUTH_TRUST_HOST` returns `500` on `/api/auth/session`.
- [x] `trustHost: true` set in `authConfig`.
- [x] `AUTH_TRUST_HOST` added to `env.ts`, `.env.example`, `fly.toml`, `docs/deployment.md`.
- [x] Same-origin `redirect` callback validation added against `APP_URL`.
- [x] CI smoke test asserts `/api/auth/session` → `200`.
- [ ] Browser login verified end to end on a proxied deployment.

### C2 — Event bus exactly-once dispatch
- [x] Exactly-once unit test written and observed **failing** (handler called twice).
- [x] Eager `dispatchLocal` removed from `publish()`.
- [x] Redis-unreachable fallback dispatches exactly once.
- [x] `dispatchLocal` switched to `Promise.allSettled` with per-rejection logging.
- [x] All 23 `bus.subscribe(...)` sites audited for eager-dispatch assumptions; findings recorded
  in `TASK-0067` C2.4 (one latent OAuth provisioning bug noted, not a C2 regression).
- [ ] `eventId` added to `DomainEvent` and all publishers.
- [ ] `QueueEventBus` implemented on BullMQ with `jobId` dedup.
- [ ] AI reply / coupon / notification handlers routed through the queue.
- [ ] `Message.inReplyToMessageId` + unique constraint added and enforced in `generateReply`.
- [ ] Two-instance integration test passes.
- [ ] Duplicate `generateReply` invocation produces one `Message` row and one DM.

### H1 — Startup resilience
- [x] `ensureSuperAdmin` wrapped in `try/catch` with `bootstrap.ensureSuperAdmin.failed` logging.
- [x] `scripts/seed-super-admin.ts` added and wired into `fly.toml` `release_command`.
- [x] Fly.io `/api/ready` health check declared.
- [x] DB-down boot verified: `/api/health` `200`, `/api/ready` `503`; DB up → `/api/ready` `200`, no restart.

### H2 — Webhook idempotency
- [ ] `ProcessedWebhookEvent` model + migration applied.
- [ ] `processed-events.repository.ts` added and injected into billing deps.
- [ ] Stripe `event.id` recorded before fulfillment; duplicates early-return.
- [ ] Shopify dedup on `x-shopify-webhook-id`.
- [ ] Meta dedup migrated onto the shared ledger.
- [ ] 30-day retention job scheduled.
- [ ] Tests: duplicate delivery, distinct events, concurrent duplicates.

### H3 — Subscription lifecycle
- [ ] `customer.subscription.created` / `.updated` handled.
- [ ] `invoice.paid` / `invoice.payment_succeeded` clears `past_due`.
- [ ] `planFromPriceId` + `ACTIVE_STATUSES` / `RETAINED_STATUSES` implemented per Q3.
- [ ] `resolveSubscriptionId` handles both invoice payload shapes.
- [ ] Required Stripe dashboard events documented in `docs/deployment.md`.
- [ ] `past_due` backfill script written and dry-run.
- [ ] Tests: fail→succeed, portal downgrade, `unpaid`, unknown price.

### H4 — Export route session revocation
- [ ] `getCurrentUser()` replaces `auth()` in `/api/export/[id]`.
- [ ] `Cache-Control: no-store, private` set.
- [ ] Rate limiting added.
- [ ] Repo-wide `await auth()` check returns nothing outside `src/modules/auth/`.
- [ ] Tests: valid, stale `tokenVersion`, soft-deleted, cross-user id.

### H5 — Project soft archive
- [ ] Duplicate-project-name pre-check run against production data.
- [ ] `archivedAt`, `@@unique([organizationId, name])`, `@@index([archivedAt])` migrated.
- [ ] `archive` converted to `updateMany`; `restore` added.
- [ ] `listByOrganization` filters archived by default.
- [ ] `create` uses a `P2002` catch instead of check-then-insert.
- [ ] `archiveProjectAction` handles `null` gracefully.
- [ ] `prisma.*.delete(` inventory completed; decisions recorded.
- [ ] Tests: archive keeps row + members, excluded from list, cross-tenant → null, restore round-trip.

### H6 — Durable event delivery
- [ ] `min_machines_running = 1` set for the app process.
- [ ] Failed-queue depth exported as a metric.
- [ ] Tests: retry-to-DLQ, one-of-two-handlers-throws, consumer-down-then-up.

### H7 — Abandoned cart correctness
- [ ] `Cart` model + migration applied.
- [ ] `checkouts/*` converted to a state upsert with no event published.
- [ ] `orders/create` marks `convertedAt`.
- [ ] Abandonment sweep job implemented with `notifiedAt` guarding.
- [ ] `ABANDONED_CART_THRESHOLD_MINUTES` added to config.
- [ ] Subscriber shipped, or the event and its publication removed; decision recorded.
- [ ] Tests: ten updates → one row/zero events; idle → one event; order → no event; double sweep → no duplicate.

### H9 — Shopify webhook reachability
- [x] `307` reproduced against current code (confirms the finding is open).
- [x] `/api/shopify/webhooks` added to `publicPaths`.
- [x] `publicPaths` prefix matcher reviewed for unintended sub-route exposure.
- [x] CI smoke assertion added (no `3xx`).
- [ ] Integration test: valid HMAC `products/create` persists a product.

### H10 — Atomic seat limits
- [ ] Concurrency test written and observed failing (cap exceeded).
- [ ] `createWithinSeatLimit` added with a serializable transaction.
- [ ] Bounded serialization-failure retries added.
- [ ] `SeatLimitError` returned via `err(...)`, no raw Prisma error escapes.
- [ ] Invite email sent only after commit.
- [ ] `planLimits(` inventory completed for other racy paths.

### Verification
- [ ] Every new regression test was observed failing pre-fix and passing post-fix.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm audit` reports 0 vulnerabilities.
- [ ] `npm run build` passes.
- [ ] `npm run build:worker` passes.
- [ ] `npx prisma migrate deploy` applies cleanly; `prisma migrate diff` reports no drift.
- [ ] Staging run completes: register → verify → connect store → receive webhook → AI reply →
      checkout → plan change, with **exactly one** of each side effect.
- [ ] `CHANGELOG.md` updated.
- [ ] `docs/specs/current-state.md` updated.
- [ ] `npx tsx scripts/task-status.ts` run and reviewed.

## 3. Acceptance Criteria

- [ ] All `REQ-0067` acceptance criteria are met.
- [ ] All verification steps above pass.
- [ ] The audit's §1.6 release conditions 1 and 2 are satisfied for these findings.

## 4. Notes / Blockers

- **Blocker:** CI has no Redis service; Redis-dependent tests cannot run until `REQ-0074` lands
  the `redis:7-alpine` service.
- **Risk (C2/H6):** moving handlers from synchronous to asynchronous execution changes timing.
  The 23-subscription audit is the mitigation and must be completed before merge.
- **Risk (H3):** deriving the plan from `price.id` means a `STRIPE_PRICE_*` mismatch silently
  resolves every subscription to `FREE`. Verify env values against live Stripe prices before deploy.
- **Risk (H5):** the `@@unique([organizationId, name])` migration fails if duplicate names exist.
  Run the pre-check first.
