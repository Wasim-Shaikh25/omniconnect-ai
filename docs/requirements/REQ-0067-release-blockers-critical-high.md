# REQ-0067: Production Release Blockers — Critical and High Findings (C1–C2, H1–H10)

- **Status:** Approved
- **Owner:** Backend / Platform
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0067-release-blockers-critical-high.md`
- **Related Tracker:** `docs/trackers/TRACKER-0067-release-blockers-critical-high.md`
- **Source audit:** `PRODUCTION_READINESS_AUDIT.md` §4 (C1, C2, H1–H10), §5 Phase 1
- **Remediation index:** `docs/audit/2026-07-31-remediation-index.md`
- **Last updated:** 2026-07-31

## 1. Summary

The production readiness audit returned a **🔴 NO-GO** verdict. Two Critical and ten High
findings are release-blocking: authentication is completely non-functional on the project's own
documented deployment path (Fly.io / Docker), every domain event is dispatched twice on the
publishing instance, the server refuses to boot when the database is briefly unreachable, Stripe
and Shopify webhooks have no idempotency ledger, `past_due` is a terminal billing state, a full
personal-data export bypasses session revocation, `archiveProject` hard-deletes rows and cascades
to members, event delivery has no durability or retry path, abandoned-cart events fire on every
cart edit with no subscriber, Shopify webhooks are blocked by NextAuth middleware, and the plan
seat limit can be exceeded by concurrent invites.

This requirement covers the fixes that must ship before **any** production deployment. Every fix
must be accompanied by a regression test that fails against the current `main` and passes after
the change (test work is tracked in `REQ-0074`, but the per-finding tests listed here are part of
this requirement's Definition of Done).

## 2. Verified current state (re-checked at commit `33e2e0b`, 2026-07-31)

All twelve findings were re-verified against the working tree on this branch. **None are fixed.**

| ID | Finding | Verification command / evidence at `33e2e0b` |
|---|---|---|
| C1 | `trustHost` unset | `grep -rn "trustHost\|AUTH_TRUST_HOST" src .env.example docs/ fly.toml Dockerfile` → **no matches** |
| C2 | Event double-dispatch | `src/shared/events/redis-event-bus.ts` `publish()` still calls `await this.dispatchLocal(event)` before `publisher.publish(...)` |
| H1 | Unguarded startup seeding | `src/instrumentation.ts` calls `await ensureSuperAdmin({ accounts, hasher })` with no `try/catch` |
| H2 | No Stripe webhook idempotency | `grep -n "event.id\|idempot\|processed" src/modules/organizations/application/billing.ts` → **no matches** |
| H3 | `past_due` terminal | `billing.ts` handles only `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed` |
| H4 | Export route bypasses revocation | `src/app/api/export/[id]/route.ts:9` still uses `await auth()` |
| H5 | `archiveProject` hard-deletes | `project.repository.ts` `archive()` calls `prisma.project.delete`; `Project` has no `archivedAt` column in `prisma/schema.prisma:186-201` |
| H6 | No durability / retry / DLQ | **Fixed.** `QueueEventBus` on BullMQ with `eventId`/`jobId` dedup, retries, DLQ, and `events_failed_jobs` metric; `fly.toml` `min_machines_running = 1` |
| H7 | Abandoned cart on every edit | **Fixed.** Shopify checkouts upsert `Cart` with no event; `orders/create|paid` sets `convertedAt`; sweep publishes `AbandonedCartDetected` once; subscriber notifies |
| H9 | Shopify webhook blocked | `publicPaths` in `src/modules/auth/infrastructure/auth.ts:215-231` **does not contain** `/api/shopify/webhooks` — the audit addendum's claim that this was fixed at `f64cf84` does **not** hold on this branch |
| H10 | Racy seat limit | `invite-member.ts` counts then creates outside a transaction |

> **Correction to the audit:** §8/H9 records the status as "Fixed — Awaiting Verification". That is
> not true of the code on this branch. H9 is treated here as **open and release-blocking**.

## 3. Goals

- Restore authentication on the documented deployment path (Fly.io / Docker) — G1.
- Guarantee **exactly-once** execution of side-effecting domain event handlers — G2.
- Make process startup resilient to transient database unavailability — G3.
- Make all three inbound webhook integrations (Stripe, Shopify, Meta) idempotent — G4.
- Make the Stripe subscription lifecycle bidirectional and driven by Stripe's authoritative
  status, including recovery from `past_due` — G5.
- Enforce `tokenVersion` session revocation on **every** authenticated entry point — G6.
- Eliminate irreversible data loss from operations whose names imply reversibility — G7.
- Give domain events durability, retry with backoff, and a dead-letter path — G8.
- Make Shopify webhook endpoints reachable and covered by a CI smoke test — G9.
- Make plan-limit enforcement atomic — G10.

## 4. Non-Goals

- Medium- and low-severity findings — `REQ-0068`, `REQ-0069`.
- Projects UI and the Q1 keep-or-delete product decision — `REQ-0073` (this requirement only
  makes the existing Project backend non-destructive).
- Broad test-coverage expansion beyond the per-finding regression tests — `REQ-0074`.
- CD pipeline, backups, rollback runbook — `REQ-0075`.
- Billing UX (invoice history, downgrade flow) — `REQ-0071`. This requirement fixes the webhook
  and state-machine correctness only.

## 5. Product decisions required before implementation

These block a *correct* fix. Defaults are proposed so implementation is never blocked; if the
founder disagrees, update this section and the linked task before coding.

| # | Question | Proposed default (use unless overridden) |
|---|---|---|
| Q3 | When an invoice fails, should the plan be downgraded immediately, after a grace period, or only on `customer.subscription.deleted`? | **Retain the plan, record `subscriptionStatus: "past_due"`, do not gate features.** Downgrade only on `customer.subscription.deleted` or a Stripe status outside `active`/`trialing`/`past_due`. Preserves today's behaviour. |
| Q4 | Should side-effecting handlers run once per **cluster** or once per **instance**? | **Once per cluster** for anything that sends a message, spends money, or writes a customer-visible row. Once per instance is acceptable only for cache invalidation. |
| Q5 | Is a public Shopify App Store listing intended? | **Assume yes** — this makes the GDPR webhooks (M5, `REQ-0068`) mandatory. |

## 6. User Stories

- As a **merchant**, I can log in to the deployed application on Fly.io so that I can use the
  product at all.
- As an **end customer**, I receive exactly one AI reply to one message so that the brand does not
  appear broken and the merchant does not risk Meta policy enforcement.
- As a **merchant**, my store stays online through a brief database failover so that a transient
  infrastructure blip does not become a full outage.
- As a **merchant whose card failed and then succeeded**, my account returns to `active`
  automatically so that I am not treated as delinquent while paying.
- As a **merchant who downgrades in the Stripe Customer Portal**, my entitlements follow the
  change so that I am not billed for one plan and served another.
- As a **user who changed my password after losing a device**, the old session cannot download my
  personal-data export so that revocation actually revokes.
- As a **store owner**, archiving a project is reversible so that a misclick does not destroy the
  project and its entire membership graph.
- As a **platform operator**, a handler failure is retried and lands in a dead-letter queue so
  that silent data loss is impossible.
- As a **Shopify-connected merchant**, product/order/checkout webhooks reach the application so
  that my catalogue stays in sync.
- As a **platform owner**, seat limits cannot be exceeded by concurrent invites so that
  entitlements match what was purchased.

## 7. Acceptance Criteria

### C1 — NextAuth `trustHost`

- [ ] `authConfig` in `src/modules/auth/infrastructure/auth.ts` sets `trustHost: true`.
- [ ] `AUTH_TRUST_HOST` is added to `src/shared/config/env.ts` (optional boolean, defaulting to
      `true` in production) and documented in `.env.example` and `docs/deployment.md`.
- [ ] `fly.toml [env]` sets `AUTH_TRUST_HOST = "true"`.
- [ ] A production standalone server started **without** `AUTH_TRUST_HOST` returns HTTP `200` from
      `GET /api/auth/session` (currently `500` with `UntrustedHost`).
- [ ] Host validation against `APP_URL` is applied so a spoofed `Host` header cannot poison
      callback URLs.
- [ ] The CI smoke test asserts `GET /api/auth/session` returns `200`, not only `/api/health`.

### C2 — Event bus exactly-once dispatch

- [ ] `RedisEventBus.publish()` no longer calls `dispatchLocal()` on the happy path; delivery is
      uniform via the Redis subscription.
- [ ] If `publisher.publish()` throws, the event is dispatched locally exactly once as a fallback
      and the failure is logged as `redisEventBus.publishFailed`.
- [ ] A unit test asserts one publish with one registered subscriber runs the handler **exactly
      once** (this test must fail against current `main`).
- [ ] An integration test with two bus instances on one Redis asserts each instance handles the
      event exactly once.
- [ ] All 23 `bus.subscribe(...)` registrations are audited for a dependency on the previous
      synchronous eager dispatch; findings are recorded in the task file.
- [ ] Side-effecting handlers (AI reply, coupon issuance, notifications, DM sends) are routed
      through BullMQ with a deterministic `jobId` so exactly one worker in the cluster executes
      them (Q4 default).
- [ ] `generateReply` carries an idempotency key derived from the inbound message id and a
      duplicate invocation produces exactly one `Message` row with `sender = "AI"` and one
      outbound DM.

### H1 — Startup resilience

- [ ] `register()` in `src/instrumentation.ts` wraps `ensureSuperAdmin` in `try/catch` and logs
      `bootstrap.ensureSuperAdmin.failed` on error.
- [ ] `validateProductionSecrets()` remains fatal.
- [ ] With PostgreSQL stopped, the standalone server starts, `GET /api/health` returns `200`, and
      `GET /api/ready` returns `503`.
- [ ] When PostgreSQL returns, `/api/ready` returns `200` with no process restart.
- [ ] Super-admin seeding also runs from `fly.toml` `release_command` so that a genuine seeding
      failure blocks the release rather than the process.
- [ ] A Fly.io health check is declared against `/api/ready`.

### H2 — Webhook idempotency

- [x] A `ProcessedWebhookEvent` model exists (`id` = provider event id as primary key, `provider`,
      `type`, `processedAt`) with a Prisma migration.
- [x] `fulfillCheckout` records the Stripe `event.id` **before** fulfillment and returns early on a
      unique-constraint violation, logging `stripe.webhook.duplicate`.
- [x] The Shopify webhook route deduplicates on `x-shopify-webhook-id`.
- [x] The Meta webhook's existing raw-body dedup is migrated to, or reconciled with, the same
      ledger so all three providers share one mechanism.
- [x] Delivering the same `checkout.session.completed` twice updates the plan once and increments
      `SaaSCoupon.usedCount` exactly once.
- [x] Two *different* events are both processed.
- [ ] Concurrent duplicate delivery results in exactly one fulfillment. *(PARTIAL — record and fulfillment are not in the same transaction/lock; see audit subtask.)*
- [x] A retention job prunes `ProcessedWebhookEvent` rows older than 30 days.

### H3 — Subscription lifecycle

- [x] `customer.subscription.created` and `customer.subscription.updated` are handled and sync
      plan + status from the subscription object.
- [x] `invoice.payment_succeeded` (and `invoice.paid`) clears `past_due` back to `active`.
- [x] The plan is derived from the active `price.id` via `planFromPriceId`, not from checkout
      metadata; an unknown price returns `null` and does **not** silently downgrade.
- [x] `ACTIVE_STATUSES` (`active`, `trialing`) determines entitlement; any other Stripe status
      resolves entitlement per the Q3 decision recorded in §5.
- [x] Required Stripe webhook events are documented in `docs/deployment.md` with the exact list to
      enable in the Stripe dashboard.
- [x] A backfill script or documented procedure exists for organizations currently stuck in
      `past_due`.
- [x] Tests: fail→succeed returns `active`; `subscription.updated` with the Starter price on a Pro
      org downgrades; status `unpaid` drops entitlement; `planFromPriceId` returns `null` for an
      unknown price.

### H4 — Export route session revocation

- [ ] `src/app/api/export/[id]/route.ts` uses `getCurrentUser()` from `@/modules/auth`, not
      `auth()`.
- [ ] The response sets `Cache-Control: no-store, private`.
- [ ] The route is rate-limited.
- [ ] A repo-wide check confirms no remaining `await auth()` call sites outside
      `src/modules/auth/`.
- [ ] Tests: valid session → `200`; stale `tokenVersion` → `401`; soft-deleted user → `401`;
      another user's export id → `404`.

### H5 — Project archive is non-destructive

**Resolved by removal** via `REQ-0073` (2026-08-01). The `Project` and `ProjectMember` models, repository, server actions, and barrel exports were removed; `archiveProject` no longer exists. `Store` + `Integration` provide the same scoping, and `project-actions.ts` had no UI consumer.

### H6 — Durable event delivery

- [x] `dispatchLocal` uses `Promise.allSettled` and logs each rejection individually.
- [x] A `QueueEventBus` backed by BullMQ provides at-least-once delivery with `attempts: 5`,
      exponential backoff, `removeOnFail: false`, and a stable `jobId` per event.
- [x] `DomainEvent` carries a stable `eventId`.
- [x] Events published while the consumer is down are processed when it returns.
- [x] Failed jobs are inspectable and the failed-queue depth is exported as a metric.
- [x] `fly.toml` sets `min_machines_running = 1` for the app process so a subscriber is always
      connected.

### H7 — Abandoned cart correctness

- [x] A `Cart` model exists with `@@unique([storeId, cartToken])`, `lastActivityAt`, `notifiedAt`,
      `convertedAt`, and a migration.
- [x] `checkouts/create` and `checkouts/update` upsert cart state and publish **no** event.
- [x] `orders/create` and `orders/paid` mark a matching cart `convertedAt` when `cart_token` is present.
- [x] A scheduled worker sweep publishes `AbandonedCartDetected` exactly once per cart, for carts
      idle beyond a configurable threshold, with no matching order and `notifiedAt IS NULL`.
- [x] A subscriber consumes `AbandonedCartDetected` and creates an `ABANDONED_CART` notification.
- [x] Tests: ten `checkouts/update` for one token → one row, zero events; idle past threshold → one
      event; cart followed by a matching order → no event; sweep run twice → no duplicate.

### H9 — Shopify webhook reachability

- [ ] `/api/shopify/webhooks` is present in `publicPaths` in
      `src/modules/auth/infrastructure/auth.ts`.
- [ ] An anonymous `POST /api/shopify/webhooks` returns `401`/`400` from HMAC verification, never a
      `3xx` redirect.
- [ ] The `publicPaths` prefix matcher is reviewed so no unintended sub-route is exposed.
- [ ] A CI smoke test asserts the endpoint is not a redirect.
- [ ] An integration test asserts a valid HMAC `products/create` payload persists a product.

### H10 — Atomic seat-limit enforcement

- [ ] The seat count read and the invite creation execute inside one `prisma.$transaction` with
      `isolationLevel: "Serializable"`, following the `store.repository.ts` pattern.
- [ ] The transaction lives behind the repository contract (`createWithinLimit`) so the application
      layer does not import Prisma directly, preserving DDD layering.
- [ ] `SeatLimitError` is returned as `err(...)` at the application boundary; no raw Prisma error
      escapes.
- [ ] Serialization failures are retried a bounded number of times.
- [ ] A concurrency test fires `teamSeats + 5` parallel invites and asserts at most `teamSeats`
      pending invites exist.
- [ ] Every other plan-limited creation path (stores, coupons, AI replies) is inventoried in the
      task file and confirmed atomic.

### Cross-cutting

- [x] Each fix has a regression test that **fails** against current `main` and passes afterwards.
- [x] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run build:worker`
      all pass.
- [x] `docs/specs/current-state.md` is updated for the event-bus, webhook-ledger, Cart, and Project
      schema changes.
- [x] `CHANGELOG.md` `[Unreleased]` is updated last.

## 8. Scope & Dependencies

**Modules affected:** `auth`, `organizations`, `ecommerce`, `ai`, `coupons`, `conversations`,
`users`, `shared/events`, `shared/queue`, `shared/config`, `shared/security`.

**Files (primary):**
- `src/modules/auth/infrastructure/auth.ts`
- `src/shared/config/env.ts`, `.env.example`, `fly.toml`, `Dockerfile`, `docs/deployment.md`
- `src/shared/events/redis-event-bus.ts`, `src/shared/events/index.ts`, `src/shared/events/event-bus.ts`
- `src/instrumentation.ts`, `src/modules/auth/infrastructure/super-admin.ts`
- `src/modules/organizations/application/billing.ts`
- `src/app/api/stripe/webhook/route.ts`, `src/app/api/shopify/webhooks/route.ts`, `src/app/api/meta/webhook/route.ts`
- `src/app/api/export/[id]/route.ts`
- `src/modules/organizations/infrastructure/project.repository.ts`, `src/modules/organizations/presentation/project-actions.ts`
- `src/modules/ecommerce/application/apply-shopify-webhook.ts`
- `src/modules/organizations/application/invite-member.ts`, `src/modules/organizations/infrastructure/organization-invite.repository.ts`
- `prisma/schema.prisma` + new migrations
- `.github/workflows/ci.yml`

**Dependencies:**
- Blocks: production release; `REQ-0071` (billing UX builds on H2/H3), `REQ-0073` (Projects UI
  requires H5).
- Blocked by: nothing. Q3/Q4/Q5 have defaults in §5.
- Requires a `redis:7-alpine` service in CI before the C2/H6 integration tests can run — see
  `REQ-0074`.

## 9. Open Questions

1. Should the BullMQ migration (C2 Layer 2 / H6) ship in the same release as the Layer 1 self-echo
   fix, or should Layer 1 ship first as a hotfix? **Proposed:** Layer 1 immediately; Layer 2 in the
   same release but behind a separate commit so it can be reverted independently.
2. Should `ProcessedWebhookEvent` replace the Meta webhook's existing raw-body dedup, or sit
   alongside it? **Proposed:** replace, so there is one mechanism, with the Meta route keying on
   the Meta delivery id.
3. Is a 30-day retention window for `ProcessedWebhookEvent` acceptable given Shopify retries for
   48 hours and Stripe for 3 days? **Proposed:** yes.
