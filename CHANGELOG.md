# Changelog

All notable changes to **OmniConnect AI** are documented here.

> **READ THIS FIRST every session.** This changelog is the entry point to the project.
> The `[Unreleased]` section below always answers: what is **Done**, what is **In Progress**,
> and what is **Next**. Update it as the _last_ step of any unit of work.
>
> Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
> [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### 🚧 In Progress

- `REQ-0068` M8 — Accessibility (skip link, `<main id="main-content">`, sidebar `aria-label`, focus-trapped mobile drawer).

### ⏭️ Next

- `REQ-0068` M9, M10, M15, then `REQ-0070`–`0075`.

### ✅ Done

- **Audit gap closure — M5 Shopify compliance webhooks:**
  - `makeApplyShopifyWebhook` now handles `customers/data_request`, `customers/redact`, `shop/redact`, and `app/uninstalled`.
  - `PrismaShopifyComplianceRepository` fetches customer data, anonymizes/erases customer PII, deletes shop-scoped data and tokens, and disconnects the integration.
  - Each compliance action writes an `AuditLog` record; duplicate deliveries are skipped via `ProcessedWebhookEvent`.
  - Unhandled `customers/*`, `shop/*`, and `app/*` topics no longer return `{ ok: true }`.
  - Unit tests for the dispatcher and an integration test for the compliance repository cover all four topics.

- **Audit gap closure — M7 HTTP status codes:**
  - Converted `src/modules/organizations/presentation/require-store-access.ts` to `checkStoreAccess` (pure predicate) and a thin `requireStoreAccess` wrapper for server actions.
  - Updated 24 `src/app/stores/[storeId]/**/page.tsx` files to call `checkStoreAccess` and emit `notFound()` / `redirect("/login")` from the page body.
  - Removed `src/app/loading.tsx` so Next.js does not stream the response before `notFound()` / `redirect()` can set the HTTP status.
  - Added `scripts/check-http-status.ts` and wired it into the CI smoke test; it asserts `/stores/{other-tenant-id}` → `404`, `/stores/does-not-exist` → `404`, `/admin/organizations` as non-admin → `307` → `/dashboard`, and verifies 404 bodies do not leak tenant/store data.

- **Audit gap closure — M1/M2, M6/L5 ADRs, H10, L1/L2/L3/L4/L7, M11/M13/M14:**
  - Added `docs/decisions/0007-stripe-api-version-pinning.md` and `docs/decisions/0008-fly-machine-auto-stop.md`.
  - H10: `OrganizationInviteRepository.createWithinSeatLimit` uses Serializable + bounded `P2034`
    retries; `invite-member` sends email only after the transaction commits; test verifies no email
    when the seat limit is reached.
  - L1: created `docs/specs/event-registry.{md,json}` with every declared domain event classified
    Live/Planned and linked to a REQ id; added `src/test/event-registry.test.ts` so new events must
    be classified.
  - L2: `app-shell.tsx` now links `/support` and `/analytics/journeys`, removes the duplicate
    `/stores` destination, and `src/components/app-shell.nav.test.ts` enforces nav coverage with an
    allow-list for detail pages and public routes.
  - L3: removed `sections[5]!` non-null assertion and index-based mutation in `app-shell.tsx`;
    admin nav item is now injected by `sections.find((s) => s.label === "Account")`.
  - L4: added `LOG_LEVEL` to `env.ts`, gated all logger calls in `logger.ts`, added a startup
    warning when `LOG_LEVEL=debug` in production, documented it in `.env.example` and
    `docs/deployment.md`, and added a unit test.
  - L7: escalation detection/stripping is case-insensitive; added `generate-reply.test.ts`; inventoried
    other AI output markers (only `[ESCALATE]` is parsed from model output; prompt delimiters are
    input hardening).

- **Audit gap closure — H2/H7 transactional boundaries:**
  - `ProcessedWebhookEvent.record` + Stripe `fulfillCheckout` side effects now run inside one
    `prisma.$transaction` via `runInTransaction` on the repository. A crash mid-fulfillment
    aborts the transaction, leaving the event unrecorded so Stripe retries safely.
  - `CartRepository.markNotified` now uses `updateMany({ where: { id, notifiedAt: null } })` and
    returns `boolean`; `AbandonedCartSweep` skips `eventBus.publish` when another process already
    marked the cart, preventing duplicate `AbandonedCartDetected` events.

- **Audit gap closure — H5.6 / M6 / L5 / T4/T9/T10 / S2 / S5:**
  - Completed the `prisma.*.delete(` / `deleteMany(` inventory in `TASK-0067` §6; hardened
    `TrackedAccountRepository.delete` to scope by `storeId` in the `where` clause.
  - Pinned Stripe `apiVersion` and set `typescript: true` in `StripePaymentGateway`.
  - Set `auto_stop_machines = "off"` in `fly.toml` alongside `min_machines_running = 1`.
  - Added route-level tests for `/api/export/[id]` covering `getCurrentUser` null → `401`,
    cross-user export id → `404`, and valid export → `200` with `Cache-Control: no-store, private`.
  - Added a route-level test for `/api/auth/[...nextauth]` that proxies `GET /api/auth/session`
    to the `handlers.GET` and returns `200`.
  - Added `src/test/security/cross-tenant-action-census.test.ts`, a static inventory of all
    173 exported `*Action` functions that fails if a mutating action referencing `storeId`
    does not call a tenant or organization guard.
  - Added explicit `requireSuperAdmin()` to every `src/app/admin/**/page.tsx` and a static
    `admin-guards.test.ts` that fails if any admin page omits it.

- **Audit gap closure — M11/M13/M14:**
  - `admin-guards.test.ts` asserts every `src/app/admin/**/page.tsx` calls `requireSuperAdmin()` and
    that the guard precedes any admin data-fetching action.
  - Extracted `publicPaths` to `src/modules/auth/infrastructure/public-paths.ts` with a pure
    `authorizeRoute()` helper; removed `/support` from public paths.

- **Audit gap closure — M4 inbox query and unbounded `findMany` inventory:**
  - `PrismaMessageRepository.listLatestByConversationIds` uses `distinct: ["conversationId"]` with
    `orderBy: [{ conversationId: "asc" }, { createdAt: "desc" }]` so the database returns one row per
    conversation.
  - Added Prisma migration `20260801134601_add_message_conversation_created_at_index` with composite
    index `Message(conversationId DESC, createdAt DESC)`.
  - Integration test creates 3 conversations × 50 messages and asserts exactly 3 rows are read.
  - Audited every `prisma.*.findMany` in `src/modules/*/infrastructure` and added `take`/pagination
    defaults to all list-view methods (stores, users, support tickets, notifications, coupons, orders,
    growth campaigns, product mappings, shoppable media, intelligence definitions/links/decisions,
    etc.). Exceptions (order diff sync, full workspace data export) are documented in `TASK-0068` M4.4.

- **Audit gap closure — M1/M2:**
  - `/api/ready` now returns only `{ name, ok }` per check, logs failure details as
    `readiness.failed`, sets `Cache-Control: no-store`, reuses `getSharedRedis()`, and is
    rate-limited per IP.
  - Telemetry disables tracing in production when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset, logs
    `telemetry.disabled` once, and uses `ConsoleSpanExporter` only outside production. Documented
    the variable in `docs/deployment.md`.

- **REQ-0075 Packages A, B, C, G6, H — Release-engineering foundation:**
  - Fixed `Dockerfile` runner stage so `npx prisma migrate deploy` works inside the image.
    Copied `prisma/`, `scripts/`, the generated Prisma runtime, and `prisma`/`tsx` CLI
    symlinks; chose a single image (size delta 362 MB → 374 MB).
  - Exposed `GIT_COMMIT_SHA` at `/api/health` with no new dependencies and pass it as a
    Docker build arg in the new `.github/workflows/deploy.yml`.
  - Added `.github/workflows/deploy.yml` (workflow_run on CI success) with `staging` auto
    deploy and `production` gated by a GitHub Environment approval.
  - Created `fly.staging.toml`; reduced `deploy.sh` to a thin `flyctl deploy --remote-only` wrapper.
  - Added container vulnerability scanning to `.github/workflows/ci.yml` via Trivy.
  - Updated `docs/deployment.md` with the Docker migration step.
  - Wrote rollback runbook, expand/contract migration policy, alert table, and risk register
    in `docs/operations.md`.
  - Added ADRs 0002–0006 covering worker extraction, transactional outbox, second LLM provider,
    per-tenant AI quotas, and analytics read replicas.
  - Local verification: `npx prisma migrate deploy` inside the container, `/api/health`
    returned the commit SHA, `/api/ready` returned 200, and all quality gates pass.

- **REQ-0075 Packages D, E, F (partial) — Backups, staging docs, and Sentry release tracking:**
  - Added `.github/workflows/backup.yml` for weekly `pg_dump -Fc` to S3 with failure alerting
    via `ALERT_WEBHOOK_URL`.
  - Added `scripts/backup.sh` and `scripts/restore.sh` for one-off backups and restores.
    Both scripts prefer the local `omniconnect-postgres` container's Postgres 16 client to
    avoid `pg_dump`/`pg_restore` version mismatches, and fall back to the host binary or a
    `postgres:16` container as needed.
  - Updated `.github/workflows/backup.yml` to run `pg_dump` from a `postgres:16` image so
    the weekly backup is not tied to the runner's `postgresql-client` version.
  - Updated `docs/operations.md` with managed-backup retention, independent weekly dumps,
    the restore procedure, and a completed restore drill (RTO ~2 s, RPO 0 h on a local
    `pg_dump`; `/api/ready` returned `200` against the restored scratch database).
  - Added staging environment provisioning steps to `docs/deployment.md` and emphasized
    that production customer data is never copied to staging.
  - Wired Sentry release tracking in `src/shared/observability/sentry.ts` using
    `SENTRY_RELEASE` or `GIT_COMMIT_SHA`.
  - Extended `docs/deployment.md` environment variable table with `SENTRY_RELEASE`,
    `GIT_COMMIT_SHA`, and backup-related variables.
  - All local quality gates pass.


### ✅ Done

- **REQ-0073 — Projects and workspace lifecycle decision:**
  - Q1 resolved: removed the orphaned `Project`/`ProjectMember` backend instead of shipping a UI.
  - Deleted `src/modules/organizations/application/project.ts`, `project.repository.ts`, and `project-actions.ts`.
  - Removed all `Project`/`ProjectMember` models, the `ProjectMemberRole` enum, and back-relations from `User`, `Organization`, and `Integration` in `prisma/schema.prisma`.
  - Generated migration `20260801083128_remove_project_models` with `DROP TABLE` statements; SQL reviewed by hand.
  - Row counts were 0/0 before the drop; no backup required.
  - Residual reference sweep returned zero functional matches in `src`.
  - Implemented `STAFF` landing redirect in `src/app/dashboard/page.tsx`: `STAFF` users with a `storeId` are redirected to `/stores/{storeId}`; `STAFF` without a `storeId` falls through to the dashboard (no loop).
  - Documented single-workspace tenancy, onboarding outcome, and Project removal in `docs/specs/current-state.md` and `REQ-0061-product-charter.md`.
  - Cross-referenced `REQ-0067` H5 as resolved by removal.

- **REQ-0074 Package A — CI quality gates and unblockers:**
  - Added `redis:7-alpine` service with a health check to `.github/workflows/ci.yml` so
    `REDIS_URL` finally has a backing server.
  - Added `npm audit --audit-level=moderate` and a `gitleaks/gitleaks-action@v2` secret-scan job.
  - Extended the CI smoke test to assert `/api/health` 200, `/api/auth/session` 200 (C1),
    `/api/ready` 200, and `POST /api/shopify/webhooks` not `3xx` (H9).
  - Stabilized the standalone smoke test on GitHub Actions by forcing `curl -4` against
    `127.0.0.1`, adding per-endpoint diagnostics, and masking generated CI secrets with
    `::add-mask::`.
  - Added `src/shared/redis/client.test.ts` as a Redis-dependent test that runs green when
    `REDIS_URL` is set.

- **REQ-0074 Package B — coverage tooling:**
  - Installed `@vitest/coverage-v8`, added `test:coverage` and `test:integration` scripts.
  - Configured `vitest.config.ts` with V8 coverage, `text`/`lcov` reporters, and zero thresholds
    until Tier 1/2 tests establish a baseline.
  - Added `vitest.integration.config.ts` for `*.integration.test.ts` with `passWithNoTests`.
  - Updated CI to run `npm run test:coverage` and `npm run test:integration` after migrations.

- **REQ-0067 C2 — Redis event bus self-echo:**
  - Stopped `RedisEventBus` from dispatching an event locally and then re-dispatching the same
    message from its own subscriber.
  - Added a Redis-unreachable fallback to a single local dispatch.
  - Switched `dispatchLocal` to `Promise.allSettled` with per-handler error logging.
  - Added `src/shared/events/redis-event-bus.test.ts` with regression tests that fail on the
    old code (handler called twice) and pass on the fix.

- **REQ-0067 H1 — startup resilience:**
  - Wrapped `ensureSuperAdmin` in `instrumentation.ts` in `try/catch` with
    `bootstrap.ensureSuperAdmin.failed` logging so a transient DB outage does not prevent
    `/api/health` from serving.
  - Moved authoritative super-admin seeding into the release phase via `scripts/seed-super-admin.ts`
    so a genuine seed failure blocks the deployment, not the running app.
  - Updated `fly.toml` `release_command` to run `npx prisma migrate deploy && npx tsx scripts/seed-super-admin.ts`.
  - Added a Fly.io `[[http_service.checks]]` block pointing at `/api/ready`.
  - Manually verified the standalone build with Postgres stopped: `/api/health` 200,
    `/api/ready` 503, logged `bootstrap.ensureSuperAdmin.failed`; after Postgres restarted,
    `/api/ready` returned 200 without a process restart.
- **REQ-0067 H4 — export route session revocation:**
  - Replaced `auth()` with `getCurrentUser()` in `/api/export/[id]` so a revoked session cannot
    download personal data.
  - Added a 10 req/min rate limit keyed by user + IP.
  - Added `Cache-Control: no-store, private` to the export response.
  - Confirmed `grep -rn "await auth()" src --include=*.ts --include=*.tsx | grep -v "modules/auth/"` returns nothing.

- **REQ-0067 H10 — atomic seat-limit enforcement:**
  - Added `OrganizationInviteRepository.createWithinSeatLimit` with a serializable Prisma
    transaction and bounded retries on `P2034` serialization failures.
  - `invite-member.ts` now calls `createWithinSeatLimit`, sending the invite email only after
    the transaction commits and returning `SeatLimitError` when the cap is reached.
  - Added `organization-invite.repository.integration.test.ts` firing `teamSeats + 5` parallel
    invites and asserting pending invites never exceed `teamSeats`.
  - Inventoried other `planLimits()` paths: store creation and AI reply counter are already atomic.

- **REQ-0067 H2 + H3 — webhook idempotency and subscription lifecycle:**
  - Added `ProcessedWebhookEvent` Prisma model and `20260801093359_add_processed_webhook_events` migration.
  - Created shared `src/shared/webhooks/processed-events.repository.ts` with unique-constraint-aware `record()`; injected into `billingService` and `applyShopifyWebhook`.
  - Stripe `fulfillCheckout` records `event.id` before fulfillment and early-returns on duplicates.
  - Shopify `/api/shopify/webhooks` deduplicates by `x-shopify-webhook-id`.
  - Meta `/api/meta/webhook` migrated dedup from the Redis raw-body hash guard to the shared ledger.
  - Added `startWebhookRetention` in `src/jobs/retention.ts` and wired it into the worker to prune ledger rows older than 30 days.
  - Extended `billing.ts` to handle `customer.subscription.created`, `customer.subscription.updated`, `invoice.paid`, `invoice.payment_succeeded`, and `invoice.payment_failed`.
  - Implemented `planFromPriceId`, `resolveSubscriptionId`, and `RETAINED_STATUSES` (`active`, `trialing`, `past_due`) so `past_due` keeps the current plan and `unpaid`/`canceled` drops to `FREE`.
  - Pinned the Stripe client to API version `2024-09-30.acacia`.
  - Added `scripts/backfill-past-due.ts` to sync organizations stuck in `past_due`.
  - Documented required Stripe webhook events in `docs/deployment.md` and updated `docs/specs/current-state.md`.
  - Added `src/modules/organizations/application/billing.test.ts` with regression tests for duplicate checkout, coupon idempotency, plan downgrade, `past_due` retention, dunning recovery, `unpaid` downgrade, and unknown-price preservation.

- **Circular dependency mitigation (test failure):**
  - Added `updateMarketingMemory`, `generateDailyBrief`, `businessBrainContextService`, `dailyActionService`, and `journeyService` to `src/modules/intelligence/server.ts`.
  - Switched `src/modules/ai/infrastructure/container.ts` and `src/modules/commerce/presentation/actions.ts` to import those services from `@/modules/intelligence/server` instead of the public barrel, removing the `ai` ↔ `intelligence` ↔ `analytics` runtime initialization cycle.

- **REQ-0067 C1 + H9 (required by the new smoke test):
  - `authConfig` now sets `trustHost: env.AUTH_TRUST_HOST` (default `true`) and adds a
    same-origin `redirect` callback validated against `APP_URL`.
  - Added `AUTH_TRUST_HOST` to `env.ts`, `.env.example`, `fly.toml`, and `docs/deployment.md`.
  - Whitelisted `/api/shopify/webhooks` in the NextAuth middleware `publicPaths` so Shopify
    webhooks reach HMAC verification instead of being redirected to `/login`.

- **REQ-0074 Package C — integration test harness and session revocation regression tests:**
  - Added `src/test/fixtures.ts` with `createTenant`, `createSuperAdmin`, and `bcrypt`-hashed passwords.
  - Added `src/test/reset.ts` with a `resetDatabase` helper that truncates all non-migration tables using `TRUNCATE ... CASCADE`.
  - Added `src/test/session.ts` with `actingAs` and `requestWithSession` helpers that encode a valid `authjs.session-token` JWT for integration tests.
  - Added `src/test/webhooks.ts` with HMAC signers for Meta (`sha256=...`), Shopify (base64), and Stripe (`generateTestHeaderString`).
  - Configured `vitest.integration.config.ts` to use `pool: "forks"` with `singleFork: true` so DB-dependent integration tests run serially and avoid `resetDatabase` deadlocks.
  - Added `src/modules/auth/infrastructure/session.integration.test.ts` covering T9 (stale `tokenVersion` revokes the session) and T10 (soft-deleted user cannot act).
  - Recorded the unit-test coverage baseline: **6.37% statements, 59.49% branches, 50% functions, 6.37% lines**.

- **REQ-0074 Package D — Tier 2 security invariant regression tests:**
  - Added `src/modules/organizations/application/tenant.integration.test.ts` covering `tenantGuard.assertStoreAccess` and `assertOrganizationAccess`.
  - Verified S1/S2 cross-tenant isolation: an owner from tenant A cannot access or mutate a store in tenant B.
  - Verified S3 `STAFF` store pinning: staff can only access their assigned store.
  - Verified S4 owner-only scope: staff cannot access other stores within the same organization.
  - Added `src/modules/auth/infrastructure/session.integration.test.ts` coverage for S5 (`requireSuperAdmin` rejects non-super-admins) and confirmed S6 (`tokenVersion` revocation flows through `getCurrentUser` to all `require*` helpers).
  - Extracted Shopify webhook HMAC verification to `src/shared/security/shopify-webhook.ts` and added unit tests for S7 covering Shopify, Meta (`verify-webhook.test.ts`), and Stripe (`billing.test.ts` invalid signature path).
  - Added `src/shared/security/rate-limit.test.ts` for S8 login rate limiting.
  - Added `src/shared/security/encryption.test.ts` for S9 encryption round-trip and tamper rejection.
  - Added `src/shared/observability/logger.test.ts` for S10 logger redaction of sensitive keys, emails, and phone numbers.
  - Added `src/modules/ai/infrastructure/openai.provider.test.ts` for S11 prompt-injection resistance (delimiters, control-char stripping, length cap, defensive system instruction, output PII redaction).
  - Added `src/app/api/health/route.test.ts` and `src/app/api/ready/route.test.ts` for T4/T5 health and readiness behavior.
  - Updated `vitest.config.ts` coverage thresholds to the measured baseline (`statements: 7`, `branches: 61`, `functions: 52`, `lines: 7`) so CI fails on regression.
  - Updated the testing skill and `AGENTS.md` with the cross-tenant regression-test rule.
  - T15 anonymous Shopify webhook `POST` 401/400 remains covered by the CI smoke test.
  - This completes `REQ-0074` / `REQ-0067 H8` test-coverage and CI quality-gate work.

- **REQ-0067 H6 + H7 — durable event delivery and abandoned-cart correctness:**
  - Added `eventId` to `DomainEvent` and all publishers; `BaseDomainEvent` defaults to `${aggregateId}-${randomId()}`.
  - Implemented `QueueEventBus` on BullMQ with `jobId` dedup, `attempts: 5`, exponential backoff, `removeOnFail: false`, and a `events_failed_jobs` metric at `/api/metrics`.
  - Made `shared/events/index.ts` export a stable `LazyEventBus` that falls back to in-memory on the client and installs `QueueEventBus` server-side via `setEventBus` in `src/server/subscribers.ts` and `src/jobs/worker.ts`; this keeps `bullmq`/`ioredis` out of the Next.js client bundle.
  - Wired the worker to register subscribers before starting the `events` BullMQ worker.
  - Added `Message.inReplyToMessageId` with `@@unique([conversationId, inReplyToMessageId])` and made `generateReply` idempotent by looking up existing replies.
  - Set `fly.toml` `min_machines_running = 1` for the app process.
  - Added the `Cart` model (`@@unique([storeId, cartToken])`, `lastActivityAt`, `notifiedAt`, `convertedAt`) and migrations.
  - Updated `applyShopifyWebhook` to upsert `Cart` on `checkouts/create|update` without publishing events and to mark `convertedAt` on `orders/create|paid` when `cart_token` is present.
  - Added `ABANDONED_CART_THRESHOLD_MINUTES` (default 60) to `env.ts` and an abandoned-cart sweep job (`src/jobs/abandoned-carts.ts`) that runs every 15 minutes.
  - Added `AbandonedCartDetected` subscriber in `notifications/infrastructure/subscribers.ts` that creates `ABANDONED_CART` in-app notifications.
  - Added regression tests: `src/shared/events/queue-event-bus.test.ts` and `src/modules/ecommerce/application/abandoned-cart-sweep.test.ts` and `apply-shopify-webhook.test.ts`.

- **Production readiness audit remediation plan — documented all 33 findings as actionable work:**
  - Re-verified every finding in `PRODUCTION_READINESS_AUDIT.md` against the working tree at
    `33e2e0b`. **All 33 remain open.**
  - Created nine requirement/task/tracker sets:
    - `REQ-0067` — release blockers (C1, C2, H1–H10) with per-finding acceptance criteria,
      code-level implementation steps, and regression tests.
    - `REQ-0068` — medium-severity hardening (M1, M2, M4–M15).
    - `REQ-0069` — low-severity findings (L1–L5, L7) and a domain-event census.
    - `REQ-0070` — identity and account self-service (§8.1–8.3, L6, Q6).
    - `REQ-0071` — billing and monetization completeness (§8.5, §3.4).
    - `REQ-0072` — platform admin, support, and discoverability (§8.6, §8.7, §3.4, §3.5 #7).
    - `REQ-0073` — Projects/workspace lifecycle with an explicit ship-or-remove decision gate (Q1, Q2, M3).
    - `REQ-0074` — test coverage and CI quality gates (H8, missing CI Redis service).
    - `REQ-0075` — release engineering, DR, observability, and residual-risk closure (M12, §1.6
      conditions 3–4, §6.1).
  - Added `docs/audit/2026-07-31-remediation-index.md` — a one-to-one traceability map from every
    audit finding, product gap, decision (Q1–Q6), residual risk, and release condition to its
    owning requirement, with a coverage assertion that nothing is unowned.
  - Recorded four **corrections to the audit report**, each verified against the code:
    - **H9 is not fixed.** `/api/shopify/webhooks` is absent from `publicPaths`, so Shopify
      webhooks are still blocked. The addendum's "Fixed — Awaiting Verification" is wrong; the
      finding is open and release-blocking.
    - **M11 is worse than reported.** No admin page calls `requireSuperAdmin()` — the report
      credits `admin/users/page.tsx` with two guards. Authorization rests entirely on the layout.
    - **Event count is 89, not 88** (23 subscribed).
    - §6.2's "Webhook route reachability ❌ Fail" is correct where §4's H9 addendum is not.
  - Recorded proposed defaults for every blocking product decision (Q1–Q6) so implementation is
    never stalled waiting for an answer.

- **Follow-up to TASK-0007 + TASK-0012 — Close remaining gaps identified in the line-by-line audit:**
  - Persisted marketing-insights domain (`MediaPost`, `MediaInsight`, `AccountInsight`, `TrendSnapshot`, `ContentRecommendation`, `Report`) with Prisma migration `20260729094742_add_marketing_insights_tables`.
  - Implemented `MarketingInsightsRepository`, `marketingInsightsService`, and server actions for `syncMediaCatalog`, `syncAccountAnalytics`, `searchTrendingHashtags`, `analyzeMedia`, `generateReport`, and `createContentRecommendation`.
  - Built `/stores/[storeId]/analytics/content` (with sync), `/trends`, `/reports`, and `/recommendations` dashboard pages; added per-post detail page with AI-generated "why it worked" analysis and slide-by-slide storyboard.
  - Added Shopify webhook handler at `/api/shopify/webhooks` with HMAC-SHA256 verification; handles `products/create`, `products/update`, `products/delete`, `orders/create`, `orders/paid`, and `checkouts/create|update` by normalizing payloads to `ConnectorProduct`/`ConnectorOrder` and emitting `AbandonedCartDetected`.
  - Added `IntegrationRepository.findByShopDomain`, `ProductRepository.findByExternalId`, and `OrderRepository.upsertMany` to support idempotent webhook processing.
  - Split `analytics` public barrel so server-only queries (`analyticsQueries`, `getCompetitorBenchmark`, `marketingInsightsService`, `marketingInsightsRepository`) move to `analytics/server`, preventing client bundles from pulling Node-only dependencies.
  - Quality gates pass: `npm run lint`, `DATABASE_URL=... npm run typecheck` (0 errors), `npm run test` (43), `npm audit --audit-level moderate` (0 vulnerabilities), `npm run build` + `npm run build:worker`.
  - Updated `docs/specs/current-state.md`, `REQ-0007`/`TASK-0007`/`TRACKER-0007`, and `REQ-0012`/`TASK-0012`/`TRACKER-0012`.

- **TASK-0066 — Line-by-line audit of all 61 requirements:**
  - Enhanced `scripts/task-status.ts` to parse and report unchecked acceptance criteria in `REQ-*.md` and subtasks in `TASK-*.md`, not just `TRACKER-*.md`.
  - Checked every `TASK-*.md` subtask against its parent status and every `REQ-*.md` acceptance criterion against the codebase.
  - Marked verifiable/done items `[x]` and left only the items with no concrete evidence unchecked.
  - Created `docs/specs/0066-audit-report.md` with the detailed findings.
  - Final `npx tsx scripts/task-status.ts --summary`: **62 total | 59 done | 0 cancelled | 3 left** (`REQ-0066` audit in progress, `REQ-0007` 3 gaps, `REQ-0012` 1 gap).
  - Quality gates: lint, typecheck, tests, build pass.

- **TASK-0065 — Complete remaining intelligence and daily-marketing work:**
  - Removed cancelled out-of-scope Meta-first requirements/tasks/trackers entirely: `REQ-0019` Orders View, `REQ-0027` Brand Deals, `REQ-0028` Affiliate Center, `REQ-0029` Media Kit.
  - Audited and confirmed the 8 remaining requirements (`0033`, `0034`, `0036`, `0037`, `0046`, `0047`, `0048`, `0050`) are implemented in the intelligence module and supporting UI; updated REQ/TASK/TRACKER statuses to `Implemented`/`Completed`/`Done`.
  - Added `/daily-marketing` and `/stores/[storeId]/daily-marketing` pages that surface the daily brief, today’s actions, recommendations, product opportunities, DM/comment patterns, competitor alerts, trending hashtags, and best time to post.
  - Added **Daily Marketing** link to the sidebar under Home.
  - `npx tsx scripts/task-status.ts --summary` now reports: 61 total | 61 done | 0 left.

- **TASK-0064 — Documentation cleanup and task status reconciliation:**
  - Deleted 28 orphaned `docs/tasks/TASK-*.md` files with no matching requirement.
  - Marked implemented features as `Implemented` in their REQ, `Completed` in their TASK, and `Done` in their TRACKER.
  - Fixed status mismatches where trackers were 100% but requirements were still `Draft`/`In Progress`.
  - Updated `scripts/task-status.ts` to report `Done`, `Cancelled`, and `Left` separately.

- **TASK-0063 — Documentation restructure and workflow automation:**
  - Unified document structure: `docs/specs/current-state.md` (living architecture) + `docs/requirements/REQ-<id>*.md` + `docs/tasks/TASK-<id>*.md` + `docs/trackers/TRACKER-<id>*.md`.
  - Created templates for requirements, tasks, and trackers in `docs/templates/`.
  - Migrated all legacy `docs/specs/<id>-<slug>.md` files into the new REQ/TASK/TRACKER structure.
  - Added `scripts/task-status.ts` to report which requirements are done and which are left (`npx tsx scripts/task-status.ts --summary`).
  - Updated `AGENTS.md`, `CLAUDE.md`, `.windsurfrules`, and `.cursor/rules/*.mdc` to enforce the new requirement-first, task+tracker workflow.

- **TASK-0062 — Universal E-commerce Connectors + Meta Business Growth Analytics:**
  - Extended `Order`/`Coupon` Prisma schema with `attributedMediaId`, `attributionSource`, `couponCode`, `isFirstTimeCustomer`, `usageCount`, `revenueAttributed`, and `lastUsedAt`; generated migration `20260729084750_add_orders_and_coupon_attribution`.
  - New `Order` model and `PrismaOrderRepository`; order-sync marks first-time customers and persists coupon codes.
  - New `EcommerceConnector` providers: `WooCommerceConnector` (REST v3) and `BigCommerceConnector` (v3 store + orders); `getConnector` registry dispatches by provider using `ConnectorCredentials.metadata` (`consumerKey`/`consumerSecret`, `storeHash`).
  - Provider-specific `connect-store` flow and connect form accept WooCommerce/BigCommerce credentials.
  - Extended `MarketingPerformanceView` with `newCustomersFromMeta`, `aov`, `couponConversionRate`, `couponRevenue`, and `topContentByRevenue`.
  - `getMarketingPerformance` attributes orders to Meta posts within a 7-day window and rolls up coupon effectiveness.
  - New `getBestTimeToPost` and `getContentCalendar` analytics use cases plus server actions; surfaced on `/analytics/growth`.
  - New `/analytics/growth` page with unified KPI cards, store breakdown, top content attribution, best-time-to-post windows, and AI content calendar.
  - Extended `TrendIdea` with `predictedRevenue`, `suggestedPublishAt`, `basedOnMediaIds`.
  - Added connector unit tests for WooCommerce and BigCommerce with mocked HTTP responses.
  - Quality gates: lint, typecheck, tests (43), npm audit (0 vulnerabilities), build + build:worker all pass.

- **TASK-0061 — Product Charter and Scope Cleanup:**
  - Replaced top-header navigation with a collapsible hamburger sidebar (`src/components/app-shell.tsx`) grouped Home / Connect / Create / Engage / Analyze / Account.
  - Deleted out-of-scope routes and files: `projects`, `stores/[storeId]/affiliates`, `media-kit`, `growth`, `revenue`, `daily-marketing`, `engagement`, `brand-deals`, `orders`, `commerce/growth`, and unused `settings/rollout`, `operating-model`, `quality`, `unified-context`.
  - Kept Meta-relevant pages: `commerce/catalog` (Meta Commerce sync), `commerce/leads`, `commerce/comments`, `commerce/trends`, `commerce/competitors`, `content`, `campaigns`, `conversations`, `followers`, `analytics`, `integrations`.
  - Simplified `stores/[storeId]/settings` to rename/reconnect only; removed archive/restore/delete actions.
  - Made `stores/[storeId]/products` read-only and updated empty-state copy to Meta-first positioning.
  - Removed generic standalone coupon generation from the store page; kept `/stores/[storeId]/coupons` for campaign-generated coupons.
  - Removed `AgencyPortfolioPanel` (media-kit), `AppHeader`, `MobileNav`, `StoreWorkflowNav` components.
  - Quality gates: lint, typecheck, tests, build + build:worker all pass.

- **TASK-0054 — Audit fixes continuation (PR-1/2/3/4):**
  - `getCurrentUser()` now loads the canonical DB record and verifies `tokenVersion`, so password/role/super-admin changes invalidate existing sessions.
  - `requireRole()` and `requireSuperAdmin()` use the fresh user returned by `getCurrentUser()`.
  - `SessionUser` and next-auth JWT/session types now include `storeId`; `tenantGuard.assertStoreAccess()` enforces staff store scoping.
  - Role/super-admin mutations increment `tokenVersion`.
  - Meta Graph API calls use the `Authorization: Bearer <token>` header and `URL` objects instead of putting `access_token` in the query string.
  - Shopify connector builds API URLs with `URL` and validates `*.myshopify.com` hostnames.
  - `VerificationToken.consume()` is atomic (`deleteMany` with expiry guard).
  - SaaS coupon usage increment is atomic and guarded by `maxUses`.
  - `createStore` plan-limit check is now enforced in a serializable Prisma transaction to prevent race-condition overages.
  - `src/middleware.ts` generates a per-request nonce and sets `Content-Security-Policy` with `script-src 'nonce-...' 'strict-dynamic'` and `style-src 'nonce-...'`, removing `unsafe-inline`/`unsafe-eval` from production. `next.config.ts` no longer sets CSP statically.
  - `src/app/layout.tsx` reads `headers()` and the `x-nonce` request header so Next.js stamps its internal scripts/styles with the matching nonce.
  - `Organization` now tracks `aiRepliesThisMonth` and `aiRepliesResetAt`; `OrganizationRepository.incrementAIReplies()` atomically resets/enforces/increments the monthly quota.
  - The `ai` generate-reply flow calls `organizationUsage.consumeAIReply()` before invoking the LLM and escalates to a human handoff when the plan limit is reached.
  - `src/middleware.ts` adds route-level auth guards using NextAuth's `authorized` callback.
  - `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`, and `src/app/loading.tsx` provide global UX fallbacks.
  - Form error messages now include `role="alert"` and `aria-live` regions for accessibility.
  - `node:crypto` replaced with Web Crypto in `verification.ts`, `verify-webhook.ts`, and `webhook-guard.ts` so dev/build bundles are Edge/runtime-agnostic.
  - Credentials password hasher is lazy-loaded in `auth.ts` to keep `bcryptjs` out of the middleware bundle.
  - Added continuation spec `docs/requirements/REQ-0054-audit-fixes-continuation.md` and tracker `docs/trackers/TRACKER-0054-audit-fixes-continuation.md`.

- **TASK-0057 — Product Completeness Roadmap Phase 4 (final)** (spec `0057`):
  - **P4-1 (GDPR / account lifecycle):** `User.deletedAt`, `ExportRequest` model, `dataExportService` JSON export, `deleteAccountService` 30-day soft-delete grace period, `/settings/account` UI (`AccountActions`, `requestDataExportAction`, `deleteAccountAction`), and `/api/export/[id]` download route.
  - **P4-2 (team / invite lifecycle):** `OrganizationInvite.storeId`, `revokeInvite`/`resendInvite` use cases, seat-limit enforcement in `inviteMember`, `/settings` resend/revoke/remove member buttons, and audit logging.
  - **P4-3 (notification preferences):** `NotificationPreference` per `(userId, channel, eventType)`, notification service honors disabled preferences, `/settings/notifications` preference toggles and `/notifications` history.
  - **P4-4 (integration token encryption):** `Integration.accessToken` and `refreshToken` encrypted at rest using `encryptString`/`decryptString` (AES-256-GCM) with legacy-plaintext backwards compatibility; `ConnectorCredentials` and `ShopifyConnector` accept `refreshToken`.
  - **P4-5 (MFA / reset code separation):** `MfaCode` and `PasswordResetCode` tables; `VerificationCodeRepository` persists/consumes from the correct table based on `mfa:<email>` vs `reset:<email>` prefixes.
  - **P4-6 (CI smoke):** GitHub Actions `ci.yml` now runs `npm run build`, `npm run build:worker`, and a `/api/health` smoke test.
  - **P4-7 (Sentry / OpenTelemetry):** `initSentry` with PII header redaction, `initTelemetry` with OTLP/console exporter and `trace.setGlobalTracerProvider`; initialized in `instrumentation.ts`, `src/jobs/worker.ts`, and wrapped around OpenAI, Meta, and Shopify outbound calls.
  - **P4-8 (operations runbook):** Created `docs/operations.md` with health probes, PostgreSQL/Redis backup & restore, rollback, dependency-failure, secrets-rotation, and incident-escalation guidance.
  - Added `scripts/export-user-data.ts` and `scripts/cleanup-deleted-accounts.ts` referenced by the runbook.
  - Generated and applied Prisma migration `20260729035410_phase4_invite_store_id` for `OrganizationInvite.storeId`.
  - All quality gates pass: `npm run lint`, `DATABASE_URL=... npm run typecheck`, `npm run test` (35), `npm audit` (0 vulnerabilities), `npm run build`, `npm run build:worker`.

### 🚧 In Progress

- **TASK-0055 — Production Readiness Audit fixes (spec `0055`):**
  - `REDIS_URL` and a non-console `EMAIL_PROVIDER` (with complete SMTP config) are now required in production.
  - Added `@@unique([subscriptionId])` and `@@index([aiRepliesResetAt])` on `Organization`; Stripe billing webhook now looks up the org by indexed `subscriptionId` instead of scanning all rows.
  - `aiRepliesThisMonth` reset now uses UTC month boundaries.
  - Narrowed CSP `connect-src` to `'self'` and public API allowlist to explicit webhook/auth prefixes; `style-src` now allows `'unsafe-inline'` so Next.js dev/runtime inline style attributes (route announcer, dev overlay) do not violate the policy.
  - Project management actions now require `STORE_OWNER`, validate target users belong to the workspace, and guard against duplicate memberships.
  - `commerce` and `conversations` store-scoped actions now use `tenantGuard.assertStoreAccess()` for staff store scoping.
  - `package.json` declares `sideEffects: ["*.css"]` so webpack can tree-shake server-only module code out of the client bundle, reducing first-load JS and preventing Node-only packages from being bundled for the browser.
  - `password-hasher.ts` now lazy-loads `bcryptjs` so it is not pulled into the client bundle at build time.
  - `app/layout.tsx` adds `suppressHydrationWarning` to `<body nonce>` to silence the CSP nonce mismatch between server and client.
  - `app/providers.tsx` now accepts and forwards the CSP `nonce` to `next-themes` `ThemeProvider` so its injected script tag satisfies `script-src`.
  - `app/providers.tsx` disables `next-themes` color-scheme inline styles (`enableColorScheme={false}`) to avoid `style-src` CSP violations.
  - `next.config.ts` provides a no-op `crypto` fallback for the Edge runtime so the dev server stops warning about `bcryptjs` requiring Node `crypto` in the middleware bundle.
  - `fly.toml` now defines `app` and `worker` process groups, and `npm run build` bundles `src/jobs/worker.ts` into `.next/standalone/worker.cjs` so the BullMQ worker deploys alongside the web service.
  - Added `PaginationInput`/`PaginatedResult` to the shared kernel and paginated all admin list endpoints (organizations, users, coupons, tickets) with Prisma `skip`/`take` + count and previous/next controls on the admin pages.
  - Added `resolveStoreScope` helper in `intelligence/presentation/actions.ts` and standardized store-scoped authorization across intelligence actions (metrics, feed, recommendations, predictions, goals, daily actions, business brain context, next-best-actions, quality checks, feature profiles, etc.). Staff are restricted to `user.storeId`; owners/admins use `tenantGuard.assertStoreAccess`.
  - Added `src/shared/redis/client.ts` and implemented Redis-backed `RedisEventBus` (Pub/Sub), `RedisRateLimitStore`, and Redis-backed Meta webhook deduplication. These replace in-memory state for multi-instance deployments; dev/test fall back to in-memory when `REDIS_URL` is not set.
  - `next.config.ts` aliases `ioredis` to `false` in client/edge chunks and lists it in `serverExternalPackages`, keeping the Node-only Redis client out of the browser bundle.
  - `register-user.ts` now receives `eventBus` via dependency injection instead of importing it directly, preventing the public `auth` barrel from pulling `ioredis` into client chunks.
  - `getQueue()` now throws in production if `REDIS_URL` is missing.
  - Password reset email no longer includes the 6-digit reset code in the URL; the link only carries `email`, and the user enters the code from the email body.
  - `package.json` sets `"type": "module"` so Vitest loads Vite's ESM API, eliminating the CJS deprecation warning.
  - `npm run lint` now runs `eslint . --max-warnings=0` instead of the deprecated `next lint`; `eslint.config.mjs` ignores generated declaration files and one-off `scripts/`.
  - `ProjectActionState` now carries `fieldErrors` and project actions (`createProjectAction`, `addProjectMemberAction`) return `zod` `flatten().fieldErrors` instead of a single `error` string. `/projects/page.tsx` renders per-field errors with `aria-invalid`/`aria-describedby` for the create-project and add-member forms.
  - Implemented `teamSeats` enforcement with an organization invite flow: `OrganizationInvite` model, `inviteMember` use case with `planLimits(...).teamSeats` guard, `registerWithInviteAction`, `/settings` invite form, and `/register?inviteToken=...` acceptance flow.
  - Fixed a client-bundle leak caused by `node:crypto` in `organizations/infrastructure/container.ts` by using the global `crypto.randomUUID()` instead.

- **TASK-0056 — Production Readiness Audit remediation** (spec `0056`):
  - Enforced `Customer.consent === DECLINED` before outbound AI replies (`ai/application/generate-reply.ts`), welcome/first-follower DMs (`coupons/application/welcome-first-follower.ts`), and comment-unlock rewards (`growth/application/service.ts`).
  - Hardened `clientIp` extraction (`shared/security/rate-limit.ts`): configurable `RATE_LIMIT_IP_HEADER` and rightmost untrusted `X-Forwarded-For` hop; updated all callers (`auth/presentation/actions.ts`, `auth/infrastructure/auth.ts`, `meta/infrastructure/webhook-guard.ts`, `app/api/stripe/checkout/route.ts`).
  - Classified Stripe webhook errors (`organizations/application/billing.ts`) and route (`app/api/stripe/webhook/route.ts`) to return `400` for signature/configuration errors, `500` for transient failures, and `503` when billing service is absent.
  - Replaced `Math.random()` with Web Crypto (`crypto.getRandomValues` / `crypto.randomUUID`) for coupon codes and job IDs (`shared/security/random.ts`).
  - Expanded production env validation (`shared/config/env.ts`) to include `NEXTAUTH_URL`, `APP_URL`, Meta/Stripe/super-admin credentials, and `RATE_LIMIT_IP_HEADER`.
  - Added `/onboarding` route and `completeOnboardingAction` so new users without an organization can create their workspace synchronously (`organizations/application/create-organization.ts`, `app/onboarding/page.tsx`, `components/onboarding-form.tsx`).
  - Made `growth/presentation/actions.ts` `parseForm` safe against non-string `FormData` values and duplicate keys.
  - Validated support ticket `assignedTo` against the user repository and organization membership.
  - Hardened the OpenAI provider (`ai/infrastructure/openai.provider.ts`) with allowed-model allowlist, user-message delimiters, and output PII redaction.
  - Converted dashboard/reports/media-kit/AI workspace context to database `count` queries (`countProducts`, `countCoupons`, `countConversations`, `countFollowers`) instead of loading large lists into memory.
  - Wired `redactValue` into `SystemLog` persistence (`shared/observability/system-log.ts`) and exported it from the public barrel.
  - Made `RedisEventBus.publish` await local event handlers before publishing to Redis to avoid race conditions during provisioning.
  - Replaced stray `process.env.NODE_ENV` checks in store pages with the validated `env` object.
  - E2E follow-up fixes: credentials registrations now set `UserRegistered.autoProvisionOrganization: false` so new users reach `/onboarding`; OAuth sign-ins keep `autoProvisionOrganization: true` so the JWT callback still provisions synchronously. `completeOnboardingAction` calls `unstable_update({})` after linking the workspace so the refreshed session carries the new `organizationId`/`tokenVersion`.
  - Added `/analytics/page.tsx` redirect to `/analytics/journeys` so the authenticated header link no longer 404s.
  - All quality gates pass: `npm run lint`, `DATABASE_URL=... npm run typecheck`, `npm run test`, `npm audit` (0 vulnerabilities), and `npm run build`.

- **TASK-0058 — PR #75 Follow-up Blockers** (spec `0058`):
  - Hardened CI `quality` smoke step with all required production env vars and the standalone server binary.
  - Refactored `ProductRepository` to expose `sync()` which atomically upserts fetched products and soft-deletes stale ones in a single Prisma transaction, preventing `syncProducts` from deleting products it just inserted.
  - Added `AccountRecord.deletedAt`, `findByEmailIncludingDeleted`, and `restoreAccount` to the auth `AccountRepository` port.
  - Credentials sign-in (`auth.ts` `authorize` and `loginAction`) now restores soft-deleted accounts within a 30-day grace period and bumps `tokenVersion` to invalidate old sessions.
  - Split `<AccountActions />` into `mode="export"` and `mode="delete"` so `/settings/account` no longer renders the component twice.
  - All quality gates pass: `npm run lint`, `DATABASE_URL=... npm run typecheck`, `npm run test` (35), `npm audit` (0 vulnerabilities), `npm run build`, `npm run build:worker`, and `/api/health` smoke.

- **TASK-0059 — Bulk Delete Success Message** (spec `0059`):
  - Moved bulk-delete success feedback from `BulkDeleteToolbar` into `ProductList` and `CouponList` parents so it survives `router.refresh()` and the empty-list transition.
  - `BulkDeleteToolbar` now accepts `onSuccess(message)` and removes its local 3-second timer and `state.ok` display.
  - Success message auto-dismisses after 3 seconds; toolbar errors still render inline.
  - All quality gates pass: `npm run lint`, `DATABASE_URL=... npm run typecheck`, `npm run test` (35), `npm audit` (0 vulnerabilities), `npm run build`, `npm run build:worker`, and `/api/health` + `/api/ready` smoke.

- **TASK-0057 — Product Completeness Roadmap** (spec `0057`):
  - Master spec and task tracker created to close remaining product-completeness gaps from `PRODUCTION_READINESS_AUDIT.md`.
  - Phase 1 (staff/tenant isolation):
    - Created `src/modules/organizations/presentation/require-store-access.ts` to centralize login, tenant-guard, and store lookup for all store-scoped pages.
    - Applied `requireStoreAccess` across every `app/stores/[storeId]/**/page.tsx` route.
    - Updated `getOrganizationOverview` to accept an optional `SessionUser` and filter `stores` to `user.storeId` for `STAFF` roles.
    - Updated `getUnifiedInbox` and `listCustomersByOrganization` to scope store IDs by staff assignment.
    - Added `src/modules/organizations/application/queries.test.ts` proving staff only see their assigned store and cannot read another store via `getOrganizationOverview`.
    - Fixed `listTrackedCompetitorsAction` to use `tenantGuard.assertStoreAccess` instead of `requireRole("STORE_OWNER")` so assigned staff can view the `Competitor Benchmarks` panel.
    - Fixed `requireStoreAccess` to catch `ForbiddenError` and render a clean 404 (`notFound()`) when a `STAFF` user visits an unassigned store, instead of a generic 500.
  - Added `storeId` to the invite flow and user settings:
    - `inviteMemberSchema` accepts an optional `storeId` and `sendInviteEmail` appends it to the `/register?inviteToken=...&storeId=...` link.
    - `/register` reads `storeId` from the query string and `AuthForm` forwards it as a hidden field.
    - `registerWithInviteAction` validates the `storeId` belongs to the inviting organization before creating the user with `User.storeId` set.
    - `/settings` fetches the organization stores and shows a store dropdown in the invite form and per-member store assignment form.
    - `changeUserStoreAction` lets owners/admins reassign a team member to a store and writes an audit log entry.
    - Added `UserProfileRepository.setStore` and `setUserStore` container helper.
  - Phase 2 (store lifecycle):
    - Added `archivedAt` and `deletedAt` nullable columns to `Store`; generated and applied Prisma migration `20260728190228_add_store_lifecycle_fields`.
    - Updated `StoreRepository` and `PrismaStoreRepository` to support `update`, `archive`, `restore`, and soft-delete with `findById`/`listByOrganization` filtering out deleted stores by default.
    - Added `updateStore`, `archiveStore`, `restoreStore`, `deleteStore` use cases and server actions guarded by `tenantGuard.assertStoreAccess`.
    - Added `/stores/[storeId]/settings/page.tsx` and `StoreSettingsForm` component for owners to update, archive, restore, or delete a store.
    - Added a settings link on the store detail page header.
  - Phase 2 — product and coupon lifecycle:
    - `Product` and `Coupon` now have `deletedAt` for soft-delete; `Store` has `lastProductSyncAt` (migration `20260728193000_product_coupon_lifecycle`).
    - `ProductRepository` supports `update`, `findById`, `delete`, and `markDeletedNotInBatch`; `listByStore` filters deleted products by default.
    - `CouponRepository` supports `findById`, `update`, `delete`, and status-correct `listByStore` filtering.
    - New use-cases `updateProduct`, `deleteProduct`, `updateCoupon`, `deleteCoupon` with store-ownership guard.
    - Server actions `updateProductAction`, `deleteProductAction`, `updateCouponAction`, `deleteCouponAction` write audit logs (`PRODUCT_UPDATED`, `PRODUCT_DELETED`, `COUPON_UPDATED`, `COUPON_DELETED`) via `auditCommands`.
    - New `/stores/[storeId]/products/page.tsx` with inline edit/delete; new `/stores/[storeId]/coupons/page.tsx` with edit/delete; added `Product` and `Coupons` links on the store detail page.
  - Phase 3 — AI guard and sync hardening:
    - Added `AIUsageGuard` (`src/modules/ai/application/usage-guard.ts`) and routed all AI calls (`generateCaptionsAction`, `generateTrendsAction`, `generatePostIdeasAction`, `askBusinessBrainAction`, `analyzeCompetitorAction`, `content idea generation`, `welcome-first-follower`) through `aiUsageGuard.assertAvailable(organizationId)`.
    - `welcome-first-follower` now asserts AI quota before generating the welcome message text.
    - Product sync marks products not present in the provider as `deletedAt = now` and returns `{ count, deleted }`; `ProductsSynced` subscriber updates `Store.lastProductSyncAt`.
    - `MarketingPerformanceView` now carries `dataQuality` (`live`/`partial`/`simulated`) based on whether live Meta media data was available; the analytics page renders a `DataQualityBadge`.
  - Phase 3 — Meta insights integration:
    - `MetaService.getPageInsights` fetches page-level `followers_count`, `posts_impressions`, and `profile_visits` from the Meta Graph API with error handling and logging.
    - `MetaService.getAudienceInsights` fetches lifetime demographics breakdown by age/gender/city/country.
    - `MetaService.getAccountMedia` fetches connected-account media and enriches each post with `fetchMediaInsights` (`likes`, `comments`, `shares`, `impressions`, `reach`).
    - `getMarketingPerformance` merges live media/page/audience data with simulated fallback values and sets `dataQuality` accordingly.
    - `app/analytics/page.tsx` and `app/stores/[storeId]/analytics/page.tsx` display a `DataQualityBadge` so users can tell when metrics are live versus simulated.
  - Phase 3 — server-side pagination, search, and bulk actions:
    - Added `PaginationInput`/`PaginatedResult` helpers to `src/shared/kernel/` and reusable `PaginationControls`/`ListSearch` components in `src/components/pagination-controls.tsx`.
    - Implemented DB-level pagination with `skip`/`take` and search `where` clauses for: admin organizations/users/coupons/tickets, `/stores/[storeId]/products`, `/stores/[storeId]/coupons`, `/stores/[storeId]/followers`, and `/notifications`.
    - Added `CustomerDirectory.listCustomersByOrganizationPaginated` (in-memory filter + slice) and wired `/customers` with `ListSearch`, `PaginationControls`, and filter-preserving URLs (`q`, `page`, `limit`, `lifecycleStage`, `consent`, `segment`).
    - Added `EcommerceQueries.listOrdersPaginated` (fetch from connector, in-memory filter/slice) and wired `/stores/[storeId]/orders` with search + pagination controls.
    - Added `getUnifiedInboxAction` pagination and wired `/inbox` with search, channel/status filters, and pagination controls.
    - Implemented bulk actions on `/stores/[storeId]/products` (select/delete selected) and `/stores/[storeId]/coupons` (select/delete selected) using new server actions `deleteSelectedProductsAction`/`deleteSelectedCouponsAction`.
    - Added `/notifications` “Mark all as read” action and unread badge counter in the shell header.
  - Phase 2 — organization-level dashboard for owners with multiple stores:
    - `WorkspaceKpiSnapshot.stores` is now `WorkspaceStoreSnapshot[]` with per-store product/follower/conversation/coupon counts and connection status.
    - `/dashboard` “Your stores” card now shows each store’s KPIs, integration status, and last product sync date, giving owners with multiple stores a single overview.
  - Phase 4 (operations readiness) — completed; see TASK-0057 Phase 4 entry under ✅ Done above.
    - Added public `/api/health` (liveness) and `/api/ready` (readiness) route handlers.
    - `/api/ready` checks PostgreSQL (`$queryRaw SELECT 1`) and Redis (`PING`) before returning `200 OK`; returns `503` with per-check diagnostics when a dependency is unreachable.
    - Sentry and OpenTelemetry initialized at app startup and in the worker; outbound AI/Meta/Shopify calls wrapped in spans.

- **Project governance & foundation**
  - Canonical engineering standard (`AGENTS.md`) — single source of truth for humans + AI tools.
  - Tool-specific rule files pointing back to `AGENTS.md`: `.cursorrules`, `.cursor/rules/*.mdc`,
    `.windsurfrules`, `CLAUDE.md`.
  - Changelog-first workflow (this file).
  - Spec-first scaffolding: `docs/specs/` (template + project overview + per-module stubs).
  - Task tracking: `docs/tasks/` (template + backlog).
  - Architecture docs: `docs/architecture/` (overview, DDD layers, module boundaries,
    event-driven, loose-coupling rules).
  - ADR process: `docs/decisions/` (template + ADR-0001).

### ✅ Done (continued)

- **TASK-010 — App scaffold** (spec `0010`):
  - Next.js 15.5.21 (patched) + TypeScript (strict) + TailwindCSS + ShadCN-style UI.
  - Dark/light theming via `next-themes` + theme toggle; PWA manifest; landing page.
  - DDD module skeleton for all 12 modules (`domain/application/infrastructure/presentation`
    - public `index.ts` barrel + README each).
  - Shared kernel (`Entity`, `AggregateRoot`, `UniqueId`, `DomainEvent`, `Result`),
    in-memory event bus, validated config (`zod`), structured logger, Prisma client singleton.
  - Prisma schema with all core tables + enums.
  - ESLint import-boundary rule blocking deep cross-module imports; Prettier config; `.env.example`.
  - `npm run lint`, `typecheck`, and `build` all pass; 0 npm audit vulnerabilities.
- **TASK-020 — Authentication module** (spec `0001`):
  - NextAuth (Auth.js) v5 + Prisma adapter, **JWT session strategy**.
  - Credentials provider (email + **bcrypt**, cost 12); **Google** auto-enabled when configured.
  - RBAC: `Role` (Admin/Store Owner/Staff) in JWT + session; `roleSatisfies` hierarchy;
    `getCurrentUser`/`requireUser`/`requireRole` session guards exposed via the barrel.
  - Domain events `UserRegistered`/`UserLoggedIn` on the shared event bus.
  - Pages `/login`, `/register`, protected `/dashboard`, route handler `/api/auth/[...nextauth]`;
    server actions for login/register/sign-out; auto sign-in after registration.
  - Prisma: `emailVerified` + NextAuth `Account`/`Session`/`VerificationToken` models (migrations
    `init`, `auth_models`).
  - Verified end-to-end against Dockerized Postgres; lint + typecheck + build pass; 0 audit vulns.
- **TASK-030 — Users + Organizations + Stores** (multi-tenant foundation) (spec `0011`):
  - New **`organizations`** module (owns `Organization` + `Store`): create/list stores,
    `getOrganizationOverview`, events `OrganizationCreated`/`StoreCreated`, `createStoreAction`.
  - New **`users`** module (owns profile/membership/role on `User`): `updateProfile`,
    `changeUserRole`, `getUserProfile`, `listOrganizationUsers`, events
    `UserProfileUpdated`/`UserRoleChanged`, profile + admin role-change server actions.
  - **Event-driven provisioning (loose coupling):** `UserRegistered` → organizations creates an
    Organization → `OrganizationCreated` → users links the owner. Modules never write each
    other's tables; cross-module payloads imported as **types only**; handlers subscribe by
    event name. Wired at the app composition root (`src/server/subscribers.ts`, idempotent).
  - Auth session now carries the tenant claim (`organizationId`) so presentation can scope
    work without a module cycle.
  - Prisma: `User.storeId` (Staff scoping) + `Store.staff` back-relation (migration
    `users_orgs_stores`).
  - Pages `/stores` (list + create, RBAC-gated) and `/settings` (profile + admin-only team
    role management); dashboard nav links.
  - `UniqueId` now uses Web Crypto (`globalThis.crypto`) — edge/runtime-agnostic.
  - Verified end-to-end: register → org auto-created + linked → store created (tenant-scoped);
    lint + typecheck + build pass; 0 audit vulns.
- **TASK-040 — eCommerce connector framework + Shopify** (spec `0002`):
  - Provider-agnostic **`EcommerceConnector`** contract (`getProducts`/`getOrders`/
    `getCustomers`/`generateCoupon`/`disableCoupon`/`fetchDiscounts`/`fetchStoreInfo`) with
    pure-domain DTOs.
  - **Provider registry** (`getConnector`) — adding a provider = implement the interface +
    register; callers never depend on a concrete provider. **ShopifyConnector** (Admin REST
    API) + **MockConnector** (deterministic dev data) shipped.
  - Use-cases `connectStore` / `syncProducts` / `generateCoupon` + queries
    (`getStoreConnection`/`listProducts`/`listCoupons`); events `StoreConnected`/
    `ProductsSynced`/`CouponGenerated`/`CouponDisabled`.
  - Prisma repositories for `Integration` (per-store connection + token), `Product`
    (upsert on sync, `@@unique([storeId, externalId])`), `Coupon` (persist + disable).
  - Store detail page `/stores/[storeId]`: connect (Mock by default, or paste Shopify
    domain+token), sync catalog, generate coupons — all RBAC-gated + tenant-checked.
  - Credentials read from per-store `Integration` records via the infra layer only; never
    logged. Verified end-to-end (connect → 6 products synced → coupon created, persisted).
- **TASK-050 — Meta integration** (spec `0003`):
  - **`meta`** module: webhook **verification** (GET `hub.challenge`) + **signature** check
    (`X-Hub-Signature-256`, HMAC-SHA256 with app secret, constant-time; invalid → 401, no
    side effects). Route handler `/api/meta/webhook` (GET + POST, Node runtime).
  - Normalizes raw payloads (zod, rejects malformed) into domain events
    `MetaMessageReceived`/`MetaFollowReceived`/`MetaCommentReceived` (channel INSTAGRAM |
    FACEBOOK); resolves the owning store via a `META` `Integration` (channel in `provider`,
    page/IG id in `externalId`, token in `accessToken` — infra-only, never logged).
  - `connectMeta` use-case + `metaQueries.getMetaConnection`; outbound `MetaService.sendMessage`
    Graph API adapter (config-gated, no-op without a token); **dev simulator** action.
  - **`crm`** module (owns `Customer` + `Follower`): subscribes to Meta events → upserts
    Customer, records Follower, emits `FirstTimeFollowerDetected` (for TASK-080). `crmQueries`.
  - **`conversations`** module (owns `Conversation` + `Message`): subscribes to
    `MetaMessageReceived` → upserts Conversation, appends CUSTOMER Message. `conversationQueries`.
  - Loose coupling: `meta` never writes crm/conversations tables; consumers subscribe by event
    name and import payload **types only**. Subscribers wired at `src/server/subscribers.ts`.
  - Store detail page: Meta connection form, dev inbound simulator, recent conversations +
    followers — RBAC-gated + tenant-checked. Lint + typecheck + build pass.
- **TASK-060 — Customer Memory (CRM) refinement** (spec `0006`):
  - `CustomerMemory` port (`getProfile`, `tag`, `recordCouponSent`, `recordCouponUsed`) + `CustomerProfileUpdated` event.
  - `PrismaCustomerRepository` aggregates coupons/usages by store + external id + channel and merges tags/interests.
  - CRM subscribes to `CouponGenerated` to tag the customer.
- **TASK-070 — AI Customer Assistant** (spec `0004`):
  - `AIConfiguration` repository (Prisma), `AIProvider` interface, `OpenAIProvider` (fetch, dev fallback when no `OPENAI_API_KEY`).
  - `generateReply` use-case assembles system prompt + CRM memory + recent messages + products/coupons.
  - `NewMessage` event from `conversations` triggers AI reply; `ReplyGenerated` / `EscalationRequested` events emitted.
  - AI replies appended to `Conversation`, outbound `metaService.sendMessage` attempted, and status set to `HUMAN_ACTIVE` on `[ESCALATE]`.
  - Store detail page `/stores/[storeId]`: AI configuration form (RBAC-gated) + `updateAIConfigurationAction`.
  - Subscribers wired at `src/server/subscribers.ts`; lint + typecheck pass.
- **TASK-080 — First-time Follower Campaign** (spec `0005`):
  - Expanded spec; `Campaign` schema with `type` enum and `@@unique([storeId, type])`; `Follower` fields for coupon/message audit.
  - New `coupons` module: `CampaignRepository`, `updateCampaign`, `welcomeFirstFollower` orchestrator, `FirstTimeFollowerDetected` subscriber.
  - Event-driven flow: Meta follow → CRM emits `FirstTimeFollowerDetected` → coupons generates a local coupon via `ecommerce.generateCoupon`, composes AI welcome message via `ai.generateWelcome`, calls `metaService.sendMessage`, records enrollment in CRM, and creates a conversation with the AI message.
  - New `/stores/[storeId]/campaigns/first-follower` page with RBAC-gated campaign settings + dev simulator; linked from store detail page.
  - `generateCoupon` extended with `pushToProvider` flag so welcome coupons can be created locally without a live Shopify connection.
  - `AIProvider.complete` accepts an optional `fallback` for deterministic offline welcome copy.
  - Verified end-to-end in the dev simulator (screenshots captured); lint + typecheck + build pass.
- **TASK-090 — Human Takeover** (spec `0008`):
  - Expanded spec with `ConversationService` port, `ConversationTakenOver` / `AIResumed` events, and RBAC rules.
  - `Conversation` record now exposes `customerId` and `assignedHumanId`; repository adds `takeOver` and `resumeAI`.
  - `ConversationCommands.takeOver` and `resumeAI` append audit `HUMAN` messages and publish domain events.
  - AI `generateReply` already checks `conversation.status`; verified that new customer messages in `HUMAN_ACTIVE` conversations do not trigger AI replies.
  - New `/stores/[storeId]/conversations` list page and `/stores/[storeId]/conversations/[conversationId]` detail page with "Take over" / "Resume AI" controls.
  - Store detail page links to the conversations list.
  - Verified end-to-end (screenshots captured): take over → simulate message → no AI reply; resume AI → simulate message → AI dev reply.
- **TASK-100 — Notifications** (spec `0009`):
  - Expanded spec for in-app + email notifications with `NotificationService` port, channel adapters, and RBAC.
  - Added `Notification` Prisma model with `title`, `body`, `payload`, `storeId`, `read` state and `@@index([userId, read, createdAt])`.
  - New `notifications` module: repository, organization-member resolver, in-app + email (stub) channel adapters, `notify` service, queries, and domain-event subscribers.
  - Subscribes to `NewMessage`, `FirstTimeFollowerDetected`, `CouponGenerated`, `EscalationRequested`, `ConversationTakenOver`, `AIResumed` to create per-user notifications.
  - New global `AppHeader` with unread notification badge; new `/notifications` page to list and mark notifications as read.
  - Verified end-to-end: simulate follow/message/takeover/resume/escalation events and watch unread badge increment; mark as read clears badge (screenshots captured).
- **Phase 2A/B/C — Meta Commerce & Engagement** (spec `0012`):
  - Expanded Prisma schema with Phase 2 aggregates: `MetaCatalogSync`, `MetaProductMapping`, `ShoppableMedia`, `SocialComment`, `SocialMention`, `SocialLead`, `UgcAsset`, `Ambassador`, `ReferralOrder`, `DmCampaign`, `BackInStockSubscription`.
  - New `commerce` module: `CommerceAutomationService` with `syncProductCatalog` and `createShoppableMedia`; stub Meta Commerce client; `/stores/[storeId]/commerce/catalog` UI for sync + shoppable posts.
  - New `social` module: `SocialAutomationService` classifies comments (intent/sentiment), suggests auto-replies, and supports reply/hide; auto-captures leads from DMs, comments, and follows; `/stores/[storeId]/commerce/comments` and `/stores/[storeId]/commerce/leads` UIs.
  - Verified end-to-end: product sync creates 6 mappings, shoppable media publishes with tags, comments classify and generate leads, DM/follow events auto-score leads.
- **Phase 2D/E — UGC, Ambassadors, and Conversational Commerce** (spec `0012`):
  - New `growth` module with `GrowthService` covering UGC collection, rights workflow, ambassador enrollment, referral tracking, DM campaigns, and back-in-stock subscriptions.
  - New `/stores/[storeId]/commerce/growth` UI with sections for UGC assets, ambassadors/referrals, DM campaigns (welcome, abandoned cart, back-in-stock, review, re-engage), and back-in-stock alerts.
  - Domain events: `UgcAssetCollected`, `UgcRightsRequested`, `UgcRightsApproved`, `AmbassadorEnrolled`, `ReferralConverted`, `DmCampaignCreated`, `DmCampaignSent`, `BackInStockSubscribed`, `BackInStockAlertSent`.
  - Verified end-to-end: collect and approve UGC, enroll ambassador, record referral with commission, create and send an abandoned-cart DM campaign, subscribe to back-in-stock and notify.
- **UI polish & SaaS deployment:**
  - Replaced raw IDs and `JSON.stringify` payloads on commerce/catalog, commerce/leads, and commerce/growth with readable product names, ambassador codes, and formatted lead details.
  - Ambassador referral codes now use a readable numeric suffix instead of a random hash.
  - Added a searchable `/help` page with in-depth guides for every app area.
  - Added `Dockerfile`, `fly.toml`, `.dockerignore`, and `deploy.sh` for one-command Vercel/Fly/Docker builds.
  - Added `docs/deployment.md` with SaaS architecture, environment variables, and multi-tenant checklist.
- **OAuth sign-up / login:**
  - Added Google, Facebook, Apple, and GitHub providers to NextAuth.
  - Replaced the single Google button with an "Or continue with" grid that renders all configured OAuth providers.
  - Updated `.env.example` and `docs/deployment.md` with OAuth client setup instructions.
- **Phase A — Viral Growth MVP** (spec `0013`):
  - AI caption/hook generator with optimal posting time and hashtag suggestions, wired into the shoppable-media composer (`/stores/[storeId]/commerce/catalog`).
  - Comment-to-DM unlock loop: `CommentUnlockCampaign` + `CommentUnlockRedemption` Prisma models, `GrowthService.processCommentUnlock`, and a `MetaCommentReceived` subscriber that matches keywords and triggers a reward DM.
  - New `/stores/[storeId]/commerce/growth` section to create and list unlock campaigns.
- **Social media trends & ideas** (spec `0007`):
  - New `ai/application/generate-trends` use-case that returns trending content ideas (hook, format, why it works, hashtags, audio suggestion, predicted engagement score, best time to post, CTA) for any niche.
  - New `/stores/[storeId]/commerce/trends` page linked from the store detail page.
  - Added "Trending posts & competitor monitor" search that uses Meta's hashtag top/recent media endpoint and supports filtering by creator handle (competitor tracking). No connected IG account falls back to realistic dev sample media.
  - Inline media previews (image/video thumbnail) on the Trends page.
  - New "AI idea from this post" button on each media card: sends the post caption, hashtags, metrics, and type to the AI and returns fresh content ideas inspired by that post.
- **Competitor analysis page** (spec `0007`):
  - New `analytics` module with `TrackedAccount` Prisma model, repository, and server actions.
  - New `/stores/[storeId]/commerce/competitors` page linked from the store detail page.
  - Track competitor handles (with niche/notes), fetch their latest posts via Meta's business discovery fallback, and run an AI strategy analysis.
  - AI analysis returns summary, strengths, weaknesses, content patterns, posting strategy, recommendations, hashtags, audio suggestion, and best time to post.
  - Reuses "AI idea from this post" on competitor posts.
  - "Discover competitors" feature: enter a niche/hashtag to find the most influential accounts posting about it, ranked by average likes/comments, and track them in one click.
- **Module barrel client-safety fix:**
  - Split `ai` module into a client-safe public barrel (`@/modules/ai`) and a server-only composition barrel (`@/modules/ai/server`) so client pages importing AI server actions no longer pull in `node:crypto`/Prisma/OpenAI provider bundles.
  - Split `meta` module the same way: `@/modules/meta` is client-safe (events, types, schemas, server actions), while `@/modules/meta/server` exports `connectMeta`, `processMetaWebhook`, `metaQueries`, `metaService`, and webhook verification functions.
  - Updated server consumers (`coupons`, `growth`, `ai`, `route.ts`, store detail page) to import wired services from `@/modules/meta/server`.

### ✅ Done (continued)

- **TASK-170 / TASK-180 — Executive Dashboard + AI Business Brain** (specs `0014` and `0015`):
  - New `analyticsQueries.getWorkspaceKpis` aggregates tenant-scoped store, product, conversation, follower, coupon, integration, and notification counts.
  - `/dashboard` rebuilt as an Executive Dashboard with KPI cards, recent stores list, and quick-action navigation.
  - New `/business-brain` page with natural-language question form, preset prompts, and grounded answers built from workspace context.
  - `askBusinessBrainAction` and `makeAskBusinessBrain` use-case in the `ai` module, with deterministic fallback when `OPENAI_API_KEY` is absent.
  - Global nav (`AppHeader`) updated with Dashboard and AI Brain links.
- **TASK-190 — Unified Inbox** (spec `0016`):
  - New `/inbox` page lists all conversations across stores with channel/status/search filters and take-over/resume actions.
- **TASK-200 — AI CRM Refinements** (spec `0017`):
  - Customer lifecycle stage, consent flag, engagement/lead scoring, and derived segment labels in the customer directory.
  - New `/customers` directory and `/customers/[customerId]` detail page with edit forms.
- **TASK-210 — Content Studio MVP** (spec `0018`):
  - New `/stores/[storeId]/content` page with AI post-idea and caption generators, reusing existing AI actions and product multi-select.
- **TASK-220 — Orders View** (spec `0019`):
  - New `/stores/[storeId]/orders` page showing live connector orders (mock fallback in dev).
  - `ecommerceQueries.listOrders` added to fetch orders through the provider interface.
- **TASK-230 — Store Analytics** (spec `0020`):
  - New `/stores/[storeId]/analytics` page with KPI cards and recent activity.
- **TASK-240 — INR Currency Support** (spec `0021`):
  - New shared `formatCurrency` utility defaults to `INR` and uses Indian locale (`en-IN`).
  - Store detail page and AI reply context now format prices with `₹`.
  - `syncProducts` falls back to store currency; mock connector returns INR prices and totals.
- **TASK-250 / TASK-260 / TASK-270 / TASK-271 — Store Hub Pages** (specs `0022`–`0025`):
  - `/stores/[storeId]/campaigns` lists active campaigns.
  - `/stores/[storeId]/coupons` lists discount codes.
  - `/stores/[storeId]/followers` lists Meta followers.
  - `/reports` gives a workspace-wide KPI and per-store breakdown view.
  - Store detail page links to all of the above plus Content, Orders, and Analytics.
- **TASK-280 — Automation Hub** (spec `0026`):
  - `/stores/[storeId]/automations` gives a single view of welcome, DM, back-in-stock, comment-to-DM unlock, and AI automations with links to their configuration pages.
  - Placeholder card for the future visual workflow builder.
  - Store detail page links to Automations.
- **TASK-290 — Brand Deals** (spec `0027`):
  - New `BrandDeal` Prisma model + `branddeals` module with list/create use-cases, repository, and server actions.
  - `/stores/[storeId]/brand-deals` page with a multi-column status pipeline (Lead, Negotiating, Contracted, Delivered, Paid, Closed) and an add-deal form.
  - Store detail page links to Brand Deals.
- **TASK-300 — Affiliate Center** (spec `0028`):
  - New `/stores/[storeId]/affiliates` page reusing the `growth` module's ambassador/referral infrastructure.
  - Enroll ambassador and record referral forms; actions now also revalidate the affiliates page.
  - Lists ambassadors (code, discount/commission, referrals, earnings) and referral orders (order id, amount, commission, status) with INR formatting.
  - Store detail page links to Affiliate Center.
- **TASK-310 — Media Kit** (spec `0029`):
  - New `/stores/[storeId]/media-kit` page with store KPIs (followers, products, conversations, revenue), about section, top products, and ready-made collab pitch.
  - Print-friendly layout and linked from the store detail page.
- **TASK-320 — Integrations Catalog** (spec `0030`):
  - New `/stores/[storeId]/integrations` page showing eCommerce and Meta connection status, provider/channel, domain/account id, product count, and connected-at date.
  - Health summary with connected count; linked from the store detail page.
- **TASK-330 — Settings & Administration** (spec `0031`):
  - New `AuditLog` Prisma model + `audit` module (repository, use-cases, actions).
  - `changeUserRoleAction` now records an audit entry; role changes revalidate `/settings/audit`.
  - New `/settings/audit` page listing admin/system events, and `/settings/billing` placeholder page.
  - Settings page now links to Audit and Billing for `ADMIN` and `STORE_OWNER` roles.
  - `changeUserRoleAction` now requires `STORE_OWNER` or higher, so store owners can manage their team.
- **TASK-340 — Mobile/PWA Polish** (spec `0032`):
  - New `/manifest.webmanifest` generated from `src/app/manifest.ts`.
  - Added `MobileNav` hamburger menu for small screens; desktop nav remains horizontal.
  - `AppHeader` updated to hide horizontal links on mobile and show the mobile menu toggle.
- **TASK-351 — Unified Intelligence Layer Phase 1: Shared Context MVP** (spec `0033`):
  - New Prisma models `Signal`, `EntityLink`, `DataQualityIssue`, `MetricDefinition`, `MetricSnapshot` + migration.
  - New `intelligence` module with DDD layers: domain events (`SignalIngested`, `DataQualityIssueDetected`, `EntityLinked`), value types, repository ports.
  - Signal ingestion subscribes to `MetaMessageReceived`, `MetaFollowReceived` (via `FirstTimeFollowerDetected`/`CustomerProfileUpdated`), `CouponGenerated`, `CouponDisabled`, `ProductsSynced`, `NewMessage`, `ConversationTakenOver`, `AIResumed`.
  - Entity resolution with `VERIFIED`/`PROBABLE`/`POSSIBLE`/`REJECTED` confidence and manual `merge`/`split` workflows.
  - Unified customer timeline grouped by journey stage; shared semantic metric service with freshness/SLA status; data-quality service for freshness/quality issues.
  - Customer intelligence summary (next best action, risks, opportunities, preferred channel, linked entities) and cross-module deep links.
  - UI widgets: `CustomerIntelligence` on `/customers/[customerId]`, `ConversationContext` on conversation detail, `DataQualityAlerts` + deep-link cards on `/dashboard`, profile link in `/inbox`.
  - Validated end-to-end: signal/entity-link creation from events, summary/timeline/metrics/quality in a single Node script; `npm run lint`, `npm run typecheck`, `npm run build` pass.
- **TASK-352 — Unified Intelligence Layer Phase 2: Explanatory Intelligence** (spec `0033`):
  - New `BusinessInsight` model/migration (`InsightType`, `InsightSeverity`, `InsightStatus`), repository, and `BusinessInsightGenerated` domain event.
  - `DetectionService` with rule-based detectors: no orders in 24h, high-intent unanswered conversation, no new followers in 7 days, stale metrics.
  - `IntelligenceFeedService` ranks open insights by severity and recency, supports dismiss.
  - Server actions `getIntelligenceFeedAction` and `dismissInsightAction`.
  - UI components `TodayFeed` + `IntelligencePanel` embedded on `/dashboard` and `/stores/[storeId]`, with severity badges, evidence drawer, and cross-module deep links.
  - Validated end-to-end with seeded signals; `npm run lint`, `npm run typecheck`, `npm run build` pass.
- **TASK-353 — Unified Intelligence Layer Phase 3: Next Best Action & goals** (spec `0033`):
  - Prisma models + migration for `Recommendation`, `ActionPlan`, `Decision`, `Outcome`, `Goal` with enums.
  - Domain types/events and Prisma repositories for the new aggregates.
  - `RecommendationService` maps open `BusinessInsight` records to ranked recommendations with risk tiers and action parameters.
  - `DecisionPolicyService` (risk tier + role), `ActionPlanService`, `OutcomeService`, and `GoalService` (pacing against metric snapshots).
  - `WorkspaceActionExecutor` adapter that invokes public services from `ecommerce`, `conversations`, and `growth` without cross-module internal imports.
  - Server actions: `getRecommendationsAction`, `approveRecommendationAction`, `dismissRecommendationAction`, `executeActionPlanAction`, `getGoalsAction`, `createGoalAction`.
  - UI components `RecommendationsPanel` + `GoalsPanel` wired into `/dashboard` and `/stores/[storeId]`.
  - End-to-end validation: insight → recommendation → approved plan → executed action → outcome; `npm run lint`, `npm run typecheck`, `npm run build` pass.
- **TASK-354 — Unified Intelligence Layer Phase 4: Predictions & Learning** (spec `0033`):
  - Prisma models + migration for `Prediction`, `Hypothesis`, `BusinessLearning` with enums.
  - Domain types/events and Prisma repositories for the new aggregates.
  - `PredictionService` for churn, stock-out, purchase-propensity, and revenue-forecast rule-based predictions with probability bands, confidence/calibration metadata, and abstention when history is insufficient.
  - `HypothesisService` generates/testable hypotheses from open `BusinessInsight` records.
  - `BusinessLearningService` closes the loop: outcomes update rule weights; `ActionPlanService` calls it after every execution.
  - Server actions: `getPredictionsAction`, `getHypothesesAction`, `getBusinessLearningAction`.
  - UI components `PredictionsPanel` + `LearningPanel` wired into `/dashboard` and `/stores/[storeId]`.
  - End-to-end validation: insight → prediction → action → outcome → `BusinessLearning` weight update; `npm run lint`, `npm run typecheck`, `npm run build` pass.
- **TASK-355 — Unified Intelligence Layer Phase 5: Scale & Optimization** (spec `0034`):
  - Prisma models + migration for `CompetitorInsight`, `PortfolioSnapshot`, `SystemMetric`.
  - Domain types/events and Prisma repositories for the new aggregates.
  - `PortfolioService` for cross-store rollups using predictions and recommendations.
  - `CompetitorIntelligenceService` derives benchmarks from public `analytics` tracked-account data.
  - `CostLatencyMonitor` records and summarizes operation latency/cost.
  - Server actions: `getAgencyPortfolioAction`, `getCompetitorIntelligenceAction`, `getSystemHealthAction`.
  - UI components `AgencyPortfolioPanel`, `CompetitorIntelligencePanel`, `SystemHealthPanel` wired into `/dashboard` and `/stores/[storeId]`.
  - End-to-end validation: multi-store portfolio snapshot, competitor insights, and system-health summary; `npm run lint`, `npm run typecheck`, `npm run build` pass.
- **TASK-120 — UI Pages and Dark/Light Mode** (spec `0035`):
  - Audited core UI routes; all listed pages exist and build.
  - Added `Reports` and `Settings` links to desktop and mobile navigation.
  - Verified `ThemeProvider`/`ThemeToggle` wiring and no hard-coded light-mode colors.
  - `npm run lint`, `npm run typecheck`, `npm run build` pass.
- **TASK-360 — Product Availability & Demand Mismatch** (spec `0036`):
  - Extended `ProductsSynced` event to carry per-product inventory snapshots.
  - `intelligence` subscribers now ingest `ProductInventory` signals per product.
  - `DetectionService` detects out-of-stock/low-stock products that are mentioned in recent `NewMessage` signals.
  - `RecommendationService` maps the insight to a `CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN` recommendation, picking the in-stock product with the highest inventory as the alternative.
  - `WorkspaceActionExecutor` and `ActionPlanService` support the new action type and create a `DmCampaign` of type `ALTERNATIVE_PRODUCT` through the public `growth` service.
  - Added `DmCampaignType.ALTERNATIVE_PRODUCT` enum and migration.
  - End-to-end validation (`scripts/verify-task360.ts`) confirms product sync → message mention → insight → recommendation → executed campaign.
  - `npm run lint`, `npm run typecheck`, `npm run build` pass.
- **TASK-361 — Revenue Decline & Funnel Diagnosis** (spec `0037`):
  - Added `revenue_7d`, `order_count_7d`, `aov_7d` semantic metrics computed from `ecommerce.listOrders`.
  - Extended `MetricSourceProvider` with `getRevenue`, `getOrderCount`, `getAverageOrderValue`.
  - Created `DiagnosisService` that compares current and previous 7-day windows, decomposes revenue into orders × AOV and new/repeat customer mix, and flags product availability as a driver.
  - Wired `DiagnosisService` into `DetectionService` as `detectRevenueDecline`.
  - `RecommendationService` maps revenue-decline insights to the dominant-driver action: `GENERATE_COUPON` for AOV decline, `CREATE_DM_CAMPAIGN` for order-volume decline, `CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN` when availability is the driver.
  - End-to-end validation (`scripts/verify-task361.ts`) confirms revenue decline → insight → recommendation → executed action plan.
  - `npm run lint`, `npm run typecheck`, `npm run build` pass.
- **TASK-362 — Next Best Action for Inbox, Orders, and CRM** (spec `0038`):
  - Created `NextBestActionService` (`intelligence/application/next-best-action.ts`) with `forConversation`, `forStoreOrders`, and `forCrm` methods using only public module contracts.
  - Exposed server actions `getInboxNextBestActionAction`, `getOrdersNextBestActionAction`, `getCrmNextBestActionAction`, and `getStoreMetricsAction`.
  - Wired UI panels into `/stores/[storeId]/conversations/[conversationId]`, `/stores/[storeId]/orders`, and `/customers`.
  - Implemented Inbox ↔ CRM identity resolution and Inbox ↔ Orders/Products product-mention detection in `onNewMessage`.
  - Added `ProactiveNotificationService` with delivery tiers, dedup/cooldown, and quiet-hour guard; wired to `BusinessInsightGenerated` and `RecommendationGenerated` events.
  - Extended `Notification` model/migration with `NotificationDeliveryTier`, `tier`, and `dedupKey` plus `User.notificationPreferences`.
  - Added `crmCommands.upsertByExternalId` so Inbox participants can resolve to CRM contacts through the public `crm` contract.
  - End-to-end validation (`scripts/verify-task362.ts`) confirms Inbox, Orders, and CRM NBA plus proactive notifications.
  - `npm run lint`, `npm run typecheck`, `npm run build` pass.
- **TASK-363 — Next Best Action for Content, Campaigns, Brand Deals, and Competitor Intelligence** (spec `0039`):
  - Extended `NextBestActionService` with `forContent`, `forCampaigns`, `forBrandDeals`, and `forCompetitorIntelligence`.
  - Added server actions and UI panels on `/stores/[storeId]/content`, `/stores/[storeId]/campaigns`, `/stores/[storeId]/brand-deals`, and `/stores/[storeId]/commerce/competitors`.
  - Ingested cross-module signals for `DmCampaignCreated`, `DmCampaignSent`, `UgcAssetCollected`, `AmbassadorEnrolled`, `ReferralConverted`, `BrandDealCreated`, and `CompetitorInsightGenerated`.
  - `BrandDealCreated` event is now published from the `branddeals` application command.
  - End-to-end validation (`scripts/verify-task363.ts`) confirmed all four NBA outputs and 13+ cross-module signals.
  - `npm run lint`, `npm run typecheck`, `npm run build` pass.
- **TASK-364 — Goal-based Automation Templates and Guardrails** (spec `0040`):
  - Added `GoalAutomationService` with eight outcome-first templates (repeat purchase, abandoned cart, response time, re-engage, product launch, reviews, affiliates, brand-deal follow-up).
  - `createFromTemplate` generates a `Goal`, `Recommendation`, and `ActionPlan` draft.
  - `AutomationGuard` validates audience size, consent, discount exposure, frequency/fatigue, and actions per day.
  - Added `/stores/[storeId]/automations/goals` page and a card on `/stores/[storeId]/automations`.
  - Server actions `getAutomationTemplatesAction` and `createGoalAutomationAction`.
  - End-to-end validation (`scripts/verify-task364.ts`) confirmed template listing, goal/recommendation/action-plan creation, and guardrail blocking.
  - `npm run lint`, `npm run typecheck`, `npm run build` pass.
- **TASK-365 — KPIs and Operating Rhythm** (spec `0041`):
  - Added `KpiService` and `PrismaKpiRepository` computing IAVA and supporting KPIs over 24h/7d/30d windows.
  - North-star IAVA combines successful outcomes, accepted recommendations, and executed action plans.
  - Supporting KPIs include insights generated/acted, recommendation accept/dismiss counts, action-plan execution/success, outcome linkage, signal freshness %, identity-confidence average, and high-confidence entity links.
  - Added `getWorkspaceKpisAction` and `WorkspaceKpis`/`WorkspaceKpisSection` components rendered on `/dashboard` and `/business-brain`.
  - Refactored `/business-brain` to a server page with a client `AskBusinessBrainForm` child so server-only KPI code is not pulled into the client bundle.
  - End-to-end validation (`scripts/verify-task365.ts`) confirmed KPI counts after seeding signals, insights, recommendations, action plans, outcomes, and entity links.
  - `npm run lint`, `npm run typecheck`, `npm run build` pass.
- **TASK-366 — AI Governance, Trust, and Workflow Acceptance** (spec `0042`):
  - Added `AiGovernanceService` with `formatResponse`, `validateToolCall`, `enforceRiskTier`, `applyTrustLanguage`, and `sanitizeInput`.
  - AI response contract now returns conclusion, evidence period, likely drivers, confidence/uncertainty, missing/stale data, recommended action, expected result range, and preview/execute link.
  - Tool allowlist validates tool name, params object, idempotency key, and caller role.
  - Risk tier enforcement returns tier, allowed flag, approval requirement, and reason.
  - Trust-language rewrite converts unsupported causal claims ("caused", "will increase", "guaranteed") into guarded phrasing.
  - Basic prompt-injection pattern detection and PII redaction in `sanitizeInput`.
  - Added workflow acceptance validator to `GoalAutomationService` checking supported actions, goal events, entry/exit conditions, duplicate suppression, send-time suppression, estimated audience, and assumptions.
  - `/stores/[storeId]/automations/goals` displays risk tier badge and workflow acceptance report per template.
  - Server actions `formatAiResponseAction`, `validateToolCallAction`, `validateWorkflowAction`.
  - End-to-end validation (`scripts/verify-task366.ts`) covers response contract, trust language, tool allowlist, risk tiers, sanitization, and workflow acceptance.
  - `npm run lint`, `npm run typecheck`, `npm run build` pass.
- **TASK-367 — Testing, Rollout, and Risk Mitigations** (spec `0043`):
  - Added `QualityAssuranceService` with `runAll` / `runCategory` covering data, intelligence, AI, action, and UAT checks.
  - Data checks cover schema compatibility, freshness/staleness, event lineage, and entity resolution merge/split.
  - Intelligence checks cover known-scenario detection, revenue driver decomposition, recommendation deduplication, and ranking stability.
  - AI checks cover uncertainty language, prompt-injection resistance, tool allowlist, permission boundaries, and trust language.
  - Action checks cover approval rules, idempotent execution, and outcome linkage.
  - UAT scenarios cover data-failure handling, campaign risk gates, and high-value customer entity linkage.
  - Added `RolloutService` with SHADOW/INTERNAL/PILOT/BETA/GA gates, environment/risk-tier checks, and rollback controls.
  - Added `RiskMitigationRegistry` with tracked failure modes, mitigations, owners, and status.
  - UI pages `/settings/quality` and `/settings/rollout` plus links on `/settings`.
  - Client-safe barrel `src/modules/intelligence/client.ts` re-exports the new actions and types without pulling server-only dependencies into the browser bundle.
  - Server actions `runQualityChecksAction`, `getRolloutGatesAction`, `setRolloutGateAction`, `getRiskMitigationsAction`.
  - End-to-end validation (`scripts/verify-task367.ts`) confirmed `QualityAssuranceService` PASS, default rollout gates disabled, and risk mitigations present.
  - `npm run lint`, `npm run typecheck`, `npm run build` pass.
- **TASK-368 — Operating Model, 30-Day Plan, and Success Criteria** (spec `0044`):
  - Added `OperatingModelService` with governance squads, 90-day milestones, first three intelligence stories, integration health inventory, offline evaluation cases, risk/approval matrix, thin-slice review checklist, and first-year success criteria.
  - Added `runWeek4ThinSlice` orchestrator and `scripts/verify-thin-slice-week4.ts` that seeds a store with out-of-stock products and an inbox message, runs `DetectionService` with a shifted reference time to produce a revenue-decline insight driven by availability, and flows through `RecommendationService`, `ActionPlanService`, and `OutcomeService` to create and measure an alternative-product DM campaign.
  - Added `/settings/operating-model` page displaying governance, plan, stories, integration health, risk matrix, and success criteria.
  - Server actions `getOperatingModelAction` and `getRiskMatrixAction`.
  - `npm run lint`, `npm run typecheck`, `npm run build` pass.

### ✅ Done

- **TASK-375 — Platform admin, SaaS coupons, support tickets, and system logging** (spec `0051`):
  - New `User.isSuperAdmin` flag, `requireSuperAdmin()` guard, and super-admin session token/session types.
  - New `SaaSCoupon` Prisma model/migration with Stripe coupon + promotion code sync, flexible percentage discount, `appliesTo` plan filtering, expiration, and max-uses tracking.
  - New `SupportTicket`, `TicketComment`, `SystemLog` models/migrations with admin triage statuses, priorities, categories, internal comments, and structured log levels.
  - New `support` module (application services, Prisma repository, server actions) and `src/shared/observability` system-log repository and helpers (`logSystem`, `logSystemError`, `listSystemLogs`).
  - Admin pages `/admin`, `/admin/organizations`, `/admin/users`, `/admin/coupons`, `/admin/tickets`, `/admin/logs` with super-admin-only layout and navigation.
  - User `/support` page for creating/viewing tickets; `/settings/billing` now accepts a SaaS coupon code and applies the Stripe promotion code at checkout.
  - Server actions for user/organization listing, super-admin toggle, SaaS coupon CRUD, ticket workflow, and log filtering.
  - `AppHeader` exposes Support and Admin links.
  - `/help` help center updated with billing/coupons, support tickets, platform admin, system logs, and existing workflow sections (Daily Marketing, Content Studio, Orders, Brand Deals, Affiliates/Media Kit, Automations, Journeys, Inbox, Customers/CRM, Integrations, Settings/quality/rollout).
  - `npm run lint`, `npm run typecheck`, `npm run build` pass.
- All Unified Intelligence Layer phases (TASK-350/351/352/353/354/355) implemented and merged.
- TASK-120 (UI pages + dark/light mode) completed.
- TASK-360 (Product availability & demand mismatch) completed.
- TASK-361 (Revenue decline & funnel diagnosis) completed.
- TASK-362 (Next Best Action for Inbox, Orders, and CRM) completed.
- TASK-363 (Next Best Action for Content, Campaigns, Brand Deals, and Competitor Intelligence) completed.
- TASK-364 (Goal-based Automation Templates and Guardrails) completed.
- TASK-365 (KPIs and Operating Rhythm) completed.
- TASK-366 (AI Governance, Trust, and Workflow Acceptance) completed.
- TASK-367 (Testing, Rollout, and Risk Mitigations) completed.
- TASK-368 (Operating Model, 30-Day Plan, and Success Criteria) completed.
- TASK-369 (Validation-Driven Additions) completed: unified context, knowledge graph, feature profiles, goal-plan versioning with test/holdout launch, learning evidence hierarchy, model ops, prediction prioritization/abstention, intelligence feedback KPIs, Today feed drill-downs and dismissal reasons, chart acceptance rules, and data-quality gate before high-priority insight generation.

### 🔨 In Progress

- **TASK-370 — Intelligence Domain Ownership Refactor** (spec `0046`):

  - Architecture review identified `intelligence` becoming a decision monolith.
  - Plan: move domain-specific detection/recommendation into `ecommerce`, `crm`, `conversations`, `growth`, `branddeals`; reframe `intelligence` as cross-domain prioritizer/scorer/conflict resolver; add recommendation lifecycle and expiration; connect `Business Brain` to intelligence outputs; harden security (token encryption, AI data consent, webhook rate limiting, production env validation).
  - **Phase 0 (security hardening) implemented:**
    - `Integration.accessToken` / `refreshToken` encrypted at rest with `src/shared/security/encryption.ts` (Web Crypto AES-256-GCM), backward-compatible with legacy plaintext tokens.
    - `generate-reply` respects `Customer.consent` and excludes profile data when consent is `DECLINED`.
    - `generate-reply` writes an `AuditLog` entry with prompt metadata and no PII.
    - `/api/meta/webhook` gets in-memory rate limiting and payload idempotency via `webhookGuard`.
    - `env.ts` exposes `validateProductionSecrets()`; `src/instrumentation.ts` calls it at runtime startup so missing production secrets fail fast without breaking `next build`.
  - **Phase 1 (domain detection/recommendation ownership) started:**
    - `ecommerce/application/detect-insights.ts` created with `detectCommerceInsights` that owns no-orders and revenue decline detection.
    - `CommerceInsightGenerated` and `CommerceRecommendationGenerated` domain events added to `ecommerce`.
    - `crm/application/detect-insights.ts` created with `detectCrmInsights` that owns stale-follower detection.
    - `CrmInsightGenerated` and `CrmRecommendationGenerated` domain events added to `crm`.
    - `conversations/application/detect-insights.ts` created with `detectConversationInsights` that owns high-intent conversation detection.
    - `ConversationInsightGenerated` and `ConversationRecommendationGenerated` domain events added to `conversations`.
    - `growth/application/detect-insights.ts` created with `detectGrowthInsights` that owns DM campaign staleness and UGC presence detection.
    - `GrowthInsightGenerated` and `GrowthRecommendationGenerated` domain events added to `growth`.
    - `branddeals/application/detect-insights.ts` created with `detectBrandDealInsights` that owns stuck-negotiation detection.
    - `BrandDealInsightGenerated` and `BrandDealRecommendationGenerated` domain events added to `branddeals`.
    - `intelligence/application/detection.ts` removed all domain-specific detection helpers (no-orders, revenue decline, stale followers, high-intent conversations, stale DM campaigns, no UGC, stuck brand deals) and now delegates to each module's `detect*Insights` service, mapping the results into `BusinessInsight` records.
    - `intelligence/application/diagnosis.ts` now maps `CommerceInsight` results into `BusinessInsight` records instead of computing revenue itself.
  - **Phase 2 (recommendation lifecycle) implemented:**
    - Added `producedByModule`, `producedByService`, `validFrom`, `validUntil`, `invalidatedAt`, and `invalidatedByEvent` to the `Recommendation` Prisma model and `RecommendationRecord` type.
    - Created `intelligence/application/recommendation-lifecycle.ts` with `prioritizeRecommendations`, `resolveConflicts`, and `expireStaleRecommendations`.
    - Added `RecommendationExpired` and `RecommendationConflictDetected` domain events.
    - Updated `PrismaRecommendationRepository` with `listActive` and `invalidate` and wired the lifecycle service through `intelligence/infrastructure/container.ts` and the public barrel.
    - `recommendationService` now sets `producedByModule`/`producedByService`/`validFrom` when generating recommendations from insights.
  - **Phase 3 (Business Brain consumes Intelligence) implemented:**
    - Created `intelligence/application/business-brain-context.ts` exposing `businessBrainContextService.getContext(organizationId, storeId)` that returns top insights, active recommendations, predictions, recent outcomes, business learning, and active goals.
    - Added `OutcomeRepository.list` and `outcomeService.list` to support context.
    - `ai/application/ask-business-brain.ts` now optionally consumes `BusinessBrainContextPort` and injects intelligence summaries into prompts and fallback answers.
    - Wired `businessBrainContextService` through `intelligence/infrastructure/container.ts` and the public barrel; connected in `ai/infrastructure/container.ts`.
  - **Phase 3b (Business Brain memory) implemented:**
    - Added `BrainConversationMemory` Prisma model and migration.
    - Created `ai/application/brain-memory.ts` service and `PrismaBrainMemoryRepository` with save/list/update feedback methods.
    - `askBusinessBrain` now loads recent memory into the prompt and persists each Q/A pair with `userId`/`organizationId`/`storeId`.
  - **Phase 4 (cleanup, vocabulary deduplication, and action-executor shrink) implemented:**
    - Centralized `SUPPORT_KEYWORDS`, `INTENT_KEYWORDS`, and `detectProductMentions` in `intelligence/application/vocabulary.ts` and updated `subscribers.ts`, `next-best-action.ts`, and `detection.ts` to use them.
    - Shrunk `WorkspaceActionExecutor` to an `execute` dispatcher; moved risk/approval gating into `decision-policy.ts` and removed `canExecute` from the `ActionExecutor` port.
    - Added `scripts/verify-task370.ts` end-to-end validation script covering detection, recommendation lifecycle, and Business Brain context wiring.
    - Updated `intelligence/index.ts` public barrel and validated `npm run lint`, `npm run typecheck`, `npm run build`.
  - **Phase 5 (remaining architectural items) implemented:**
    - Added `expiresAt` to `BrainConversationMemory` with `brainMemoryService.purgeExpired` / `PrismaBrainMemoryRepository.purgeExpiredBefore` retention.
    - Added `RecommendationConflict` table and surfaced conflicts via `getRecommendationConflictsAction` and `RecommendationConflictCard` on Daily Marketing.
    - Refactored action execution so `WorkspaceActionExecutor` dispatches through domain action handlers: `executeEcommerceAction`, `executeConversationAction`, `executeGrowthAction`.
    - Added `ReadModelRefresher` service and `refreshReadModelsAction` to recompute `MetricSnapshot`, `BusinessInsight`, and `Recommendation` from canonical signals.
  - **Async intelligence lifecycle (Phase 5 follow-up):**
    - Added shared `QueueService` abstraction (`src/shared/queue`) with `BullMQQueue` (Redis) and `InMemoryQueue` (fallback) backends, plus `JobRegistry`, `BullMQ` worker, and `src/jobs/worker.ts` entry point.
    - `intelligence` registers `REFRESH_READ_MODELS`, `REFRESH_PREDICTIONS`, and `LEARN_FROM_OUTCOME` queue handlers; `refreshReadModelsAction` now enqueues jobs and returns immediately instead of blocking.
    - Added `WORKER_CONCURRENCY` to `env.ts`, `serverExternalPackages` for `bullmq`/`ioredis` in `next.config.ts`, and `npm run worker` script.
    - Created `@/modules/analytics/server` and `@/modules/intelligence/server` server-only barrels plus `@/modules/ai/events` lightweight events barrel to break a module cycle that surfaced under `tsx`/`npm run worker`.
    - `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run worker` startup all pass.

- **TASK-371 — Marketing Intelligence Connectivity** (spec `0047`, `0048`):
  - Repositioned OmniConnect as the **AI Marketing & Commerce Platform for Instagram and Facebook Businesses**.
  - Defined the 12 product gaps and the connecting architecture: Content Intelligence, Analytics loop, active Competitor Analysis, DM → marketing, comments as research, marketing analytics, product promotion scores, Marketing Memory, inbox multi-insight, competitor benchmarking, AI explanation, Business Brain → Marketing Brain daily brief.
  - Added UI workflow spec `0048` reorganizing the product around four workflows: Daily Marketing, Engagement, Growth, Revenue.
  - **UI shell implemented:**
    - `StoreWorkflowNav` tabs for Daily Marketing, Engagement, Growth, Revenue.
    - `/stores/[storeId]/daily-marketing` dashboard with Today’s Brief, Products To Push, DM Insights, Comment Insights, Followers, Best Time To Post, Competitor Changes, Trending Hashtags, and Content Next Best Action.
    - `/stores/[storeId]/engagement`, `/growth`, `/revenue` workflow entry pages.
    - Rebranded `/business-brain` to Marketing Brain and updated `AppHeader`.
  - **Marketing Memory wired:**
    - New `intelligence` aggregate `MarketingMemory` with `updateMarketingMemory()` computes product scores, DM patterns, comment patterns, trending hashtags, competitor changes, and campaign/coupon history from `ecommerce`, `conversations`, `social`, `analytics`, and `crm` public contracts.
    - New `generateDailyBrief()` builds a daily marketing brief with sections, content idea, recommended product, best posting time, trending hashtags, and priorities.
    - `ai.askBusinessBrain` now consumes `MarketingMemory` and `DailyBriefRecord` when a store is selected; prompt persona rebranded to Marketing Brain and includes top products, DM/comment patterns, and today's brief.
    - PII redaction for pattern samples.
    - `getAccountMedia` added to the analytics server barrel; `updateMarketingMemory` fetches the connected Meta account's own media and computes `topPerformingPosts`.
    - `detectCompetitorChanges` enriches `CompetitorChange` with each tracked competitor's top post caption, media type, and engagement.
    - `ai.generatePostIdeas` now consumes `MarketingMemory` (top products, DM/comment themes, trending hashtags, own best-performing posts, competitor changes) and the daily brief, and returns an `evidence` string.
    - `ContentStudioForms` displays a "Why these ideas" panel with the memory signals that influenced the suggestions.
    - Product promotion scores are now displayed in `/stores/[storeId]/commerce/catalog` via `listCommerceCatalogAction`, which consumes `updateMarketingMemory()`.
    - Marketing analytics view (`getMarketingPerformance`) reorganizes metrics around Content, Audience, Product, and Campaign, adds per-section `why`/`nextRecommendation`, an overall `explanation`, and publishes `MarketingPerformanceUpdated`.
    - New `/stores/[storeId]/analytics/content`, `/audience`, `/product`, and `/campaign` subpages answer the four marketing analytics questions.
    - `/stores/[storeId]/analytics` dashboard links to subpages and surfaces the overall AI marketing explanation.
    - Competitor benchmark (`getCompetitorBenchmark`) computes post frequency, Reel ratio, hook/caption length, engagement, top hashtags, and consistency, and produces actionable adaptation suggestions.
    - `CompetitorChangeDetected` and `CompetitorBenchmarkReady` domain events published from `analytics`.
    - Competitor page displays benchmark panel with recommendations.
    - Reusable workflow cards extracted: `WorkflowCard`, `BriefSectionCard`, `ProductPromotionCard`, `DmOpportunityCard`, `CommentInsightCard`, `CompetitorAlertCard`, `TrendingHashtagCard`, `BestTimeCard`, `FollowerLinkCard`.
    - Daily Marketing, Engagement, Growth, and Revenue pages refactored to use shared card components.
    - `scripts/verify-task371.ts` end-to-end validation script created (typechecked; requires PostgreSQL connection to run).
- **Task tracker audit**:
  - Synced `TASK-350-unified-intelligence-layer.md` statuses from `TASK-350-progress.md`.
  - Marked verified items done: `FeatureService` (67), AI-generated workflow acceptance criteria (96), brand-deal follow-up + CRM advocate NBA (137).
  - Active `TASK-370`/`TASK-371` trackers updated to reflect current remaining work.
- **Follow-up fixes**:
  - Replaced `eslint-config-next` / `@eslint/eslintrc` with direct `@next/eslint-plugin-next` + `typescript-eslint` flat config; upgraded `eslint` to v10. `npm audit` now reports 0 high-severity findings; `npm run lint` / `typecheck` / `build` still pass.
  - Computed `winningPostingTimes` in `MarketingMemory` from own post engagement timestamps and surfaced the top slot in the `DailyBrief` and `generatePostIdeas` prompt.
  - Added `tenantGuard` to the `organizations` module and hardened tenant isolation for `coupons` (`updateCampaignAction`, `simulateFirstTimeFollower`) and `users` (`changeUserRole` now enforces same-organization target); added explicit store-ownership checks to `intelligence` read actions (`getUnifiedContextAction`, `getKnowledgeGraphAction`, `getFeatureProfileAction`).
  - Built post-to-order attribution foundation: `getMarketingPerformance` now fetches own Meta media, computes richer per-post metrics (likes, comments, shares, plays, reach, impressions), attributes orders to the nearest preceding post within a 7-day window, and exposes `orders`/`revenue` per post in the Content analytics subpage.
  - `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run worker` startup all pass; `npm audit` reports 0 vulnerabilities.
- **TASK-372 — SaaS landing page, pricing, payments, and onboarding docs** (spec `0049`):
  - Replaced the generic feature-card landing page with a marketing-focused `/` page: hero,
    positioning, capability grid, and transparent pricing.
  - Added `/pricing` with Free, Starter ($4.99/mo), and Pro ($9.99/mo) tiers plus FAQ.
  - Added Stripe Checkout integration behind `/api/stripe/checkout` and webhook handling at
    `/api/stripe/webhook` (signature verified, plan updated via `OrganizationRepository`).
  - Added `Plan` enum + `plan`, `subscriptionId`, `subscriptionStatus` columns to `Organization`
    with a Prisma migration.
  - Extended `OrganizationRecord`, `OrganizationOverview`, and `billingService` in the `organizations`
    module; exposed `PLAN_FEATURES` from the public barrel.
  - Updated `/settings/billing` to show the current plan and upgrade cards (Stripe-disabled state
    when keys are missing).
  - Expanded `/help` with pricing, Marketing Brain, analytics/attribution, security, and deployment
    sections.
  - Rewrote `README.md` with SaaS positioning, quick start, plans, and env templates.
  - Rewrote `docs/deployment.md` with local → test → production steps for Vercel, Fly.io, and Docker,
    plus Stripe webhook and production checklist.
  - Created `.env.local`, `.env.test`, and `.env.production` templates (gitignored) and updated
    `.env.example` with Stripe variables.
  - `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run worker` startup pass; screenshots
    of landing, pricing, help, dashboard, billing, and stores captured.
- **TASK-374 — Daily Marketing Operating Rhythm** (spec `0050`) — in progress
  (see `docs/tasks/TASK-374-progress.md` for the full checklist and remaining follow-ups):
  - **Persistence:** added `DailyAction`, `ActionOutcome`, `Journey`, `JourneyStep` models,
    the `BusinessObjective`/`DailyActionStatus`/`ActionOutcomeStatus` enums, recommendation
    objective/confidence/context columns, and a Prisma migration.
  - **Daily rhythm:** `dailyActionService.generate/complete/skip` (objective + confidence
    prioritization, idempotent per day, Marketing-Memory-fed) and `actionOutcomeService.measure`
    with a configurable observation window; completing an action schedules a measured outcome.
  - **Resilience fix:** metric provider catches `StoreNotConnectedError` and returns `0` for order/revenue/AOV reads, so `completeDailyActionAction` works for stores without a connected eCommerce integration.
  - **Decision quality:** objective tagging, `recalculateConfidence`, objective+confidence
    conflict resolution, and market-trend vs competitor-advantage vs self-mistake diagnosis.
  - **Journey attribution:** `journeyService.appendTouchpoint/getJourney`, with Meta post
    views, follows, DMs, coupon sends, and referral orders linked into one journey via
    domain-event subscribers.
  - **Surfaces:** Today feed on the dashboard (`TodayFeed`/`TodayActionCard`, objective badge,
    confidence meter), `/analytics/journeys` explorer, and Business Brain answers grounded in
    Daily Brief / Marketing Memory / Journeys / Recommendations with visible source citations.
  - **Server actions:** `getTodayActionsAction`, `completeDailyActionAction`,
    `skipDailyActionAction`, `getJourneysAction`, `getJourneyAction`,
    `getBusinessBrainContextAction`, `getRecommendationDetailAction` (tenant/store guarded).
  - **Content cohesion:** `ai/generatePostIdeas` now consumes `DailyAction` objectives and
    `Journey` context to ground content ideas in today's priorities and recent customer paths.
  - **Production maturity:** Vitest setup + domain/service tests (27 tests), a GitHub Actions
    CI workflow (lint, typecheck, test, Postgres migration dry-run), security response headers,
    a reusable rate limiter (applied to Stripe checkout), and plan-based store-limit enforcement.
  - **Deferred follow-ups:** inbox/coupons/analytics deeper cohesion,
    AI-reply-quota and team-seat metering, Redis-backed production queue/bus wiring, and the
    full tenant-isolation audit.

- **TASK-376 — Super-Admin Login, Workspaces/Projects, and Auth Improvements** (spec `0052`):
  - Added `User.phone`, `Project`, and `ProjectMember` models + Prisma migration
    `add_user_phone_project_projectmember`.
  - Added env-driven super-admin seed `ensureSuperAdmin()` wired into `src/instrumentation.ts`;
    creates the hardcoded admin with `isSuperAdmin = true`, `phone`, and a bcrypt hash.
  - Added `EmailSender` port with `console` and lazy-loaded `SMTP` (`nodemailer`) implementations
    in `src/shared/email`.
  - Added `VerificationToken`-based MFA and password-reset flows (purpose-scoped identifiers
    `mfa:<email>` and `reset:<email>`, 10-minute MFA and 1-hour reset TTLs).
  - Updated credentials provider to require an emailed MFA code for the super-admin email;
    `loginAction` sends the code when absent and verifies on the second step.
  - Added `requestPasswordResetAction` and `resetPasswordAction` + `/forgot-password` and
    `/reset-password` pages.
  - Added `Project` management use-cases, `ProjectRepository`, and server actions
    (`createProjectAction`, `listProjectsAction`, `getProjectAction`, `archiveProjectAction`,
    `addProjectMemberAction`, `removeProjectMemberAction`) exposed from the `organizations` barrel.
  - Added `/projects` workspace-scoped page with create/list/archive and member assignment.
  - Updated `.env.example` with `SUPER_ADMIN_*` and `SMTP_*` variables.
  - `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass.

- **TASK-0053 — Production Readiness Audit Fixes** (spec `0053`, partial):
  - **Auth & Session Hardening:** OAuth `signIn` event provisions organization synchronously;
    `NEXTAUTH_SECRET` mapped to `authConfig.secret`; `User.tokenVersion` added with migration;
    password reset bumps `tokenVersion` to invalidate existing sessions; MFA/reset requests
    rate-limited; `VerificationToken` limited to one active code per email/purpose.
  - **RBAC:** Removed `setUserSuperAdmin` and `changeUserRole` from the `users` public barrel;
    `changeUserRole` enforces hierarchy, self-change guard, and last-admin protection;
    `requireRole`/`requireSuperAdmin` re-validate against the DB.
  - **Billing:** Stripe Checkout Session carries top-level `metadata` (`organizationId`, `plan`,
    `couponCode`); webhook fulfillment updates `Organization.plan`, handles `customer.subscription.deleted`
    and `invoice.payment_failed`, and increments coupon usage only after successful payment;
    ungated coupon actions removed from public barrel.
  - **IDOR / Tenant Scoping:** Mutations in `conversations`, `crm`, `support`, `projects`, and
    selected `intelligence` repositories (`BusinessInsight`, `EntityLink`, `DailyAction`) now
    require and scope by `storeId`/`organizationId`.
  - **External API Security:** `ShopifyConnector` validates `*.myshopify.com` domains, rejects
    path traversal, and sets request timeouts; Meta Graph API calls encode dynamic values and
    time out; OpenAI provider adds `AbortSignal` timeout and a defensive system-prompt guard.
  - **Infrastructure Hardening:** `next.config.ts` adds `Content-Security-Policy`, removes
    HSTS `preload`, and disables `X-Powered-By`; header/mobile sign-out uses `signOut` from
    `next-auth/react`; `SmtpEmailSender` enforces TLS 1.2+; `logger` redacts emails, phones,
    and sensitive keys; `setRolloutGateAction` now requires `requireSuperAdmin()`.
  - `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass.
  - **Deferred follow-ups:** remaining `growth` and `intelligence` repository tenant scoping,
    full DB persistence for in-memory intelligence/goal/feedback state, Prisma index migration,
    and `npm audit` dev-dependency cleanup.

- **TASK-0053-follow-up — Audit Fixes Follow-up** (spec `0053`):
  - **Growth IDOR scoping:** `UgcRepository.updateRights`, `AmbassadorRepository.findById` and
    `incrementEarnings`, `DmCampaignRepository.markSent`, `BackInStockRepository.markNotified`,
    and `CommentUnlockRepository.markSent`/`markReferred` now require `storeId` and include it in
    the `where` clause.
  - `GrowthService.recordReferral` validates that the ambassador belongs to the provided store
    before creating a referral and atomically increments earnings using Prisma `update` with `increment`.
  - `GrowthService.processCommentUnlock` escapes the campaign keyword before building the regex
    to prevent ReDoS/regex injection.
  - `Ambassador` code generation switched from `Math.random()` to `crypto.getRandomValues()`.
  - **Prisma indexes:** added indexes for high-cardinality foreign keys and common filters
    (`Account.userId`, `Session.userId`, `VerificationToken.identifier`/`expires`, `Store.organizationId`,
    `Integration.storeId`+`type`+`provider`, `Customer.storeId`+`igUserId`+`fbUserId`,
    `Conversation.storeId`+`customerId`+`assignedHumanId`, `Message.conversationId`/`createdAt`,
    `CouponUsage.couponId`/`customerId`, `Report.storeId`+`generatedAt`) in migration
    `20260728081713_audit_fixes_additional_indexes`.
  - `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass.
  - **Still deferred:** remaining `intelligence` repository tenant scoping and full DB persistence
    for in-memory intelligence/goal/feedback/rollout state.

- **TASK-0053-follow-up-2 — Dev Dependency Security Cleanup** (spec `0053`):
  - Updated `vitest` to `^3.2.6` and added `npm` overrides for `esbuild` (`^0.25.0`) and `vite`
    (`^6.2.0`) to remove the SSRF-affected `esbuild` version and the arbitrary-file-read
    `vitest` vulnerability reported by `npm audit`.
  - `npm audit` now reports 0 vulnerabilities; `npm run lint`, `typecheck`, `test`, and `build`
    still pass.

- **TASK-0053-follow-up-3 — Intelligence IDOR scoping** (spec `0053`):
  - `PrismaRecommendationRepository` and `PrismaActionPlanRepository` mutations (`findById`,
    `updateStatus`, `updateObjective`, `updateConfidence`, `invalidate`) now require
    `organizationId` and use `where: { id, organizationId }`.
  - `recommendationService` (`dismiss`, `tagObjective`, `recalculateConfidence`) and
    `actionPlanService` (`createFromRecommendation`, `approve`, `execute`) updated to thread
    `organizationId` through to repositories.
  - Remaining `intelligence` repository mutations (`Outcome`, `Goal`, `Prediction`,
    `Hypothesis`, `BusinessLearning`, `CompetitorInsight`, `DataQualityIssue`, `ActionOutcome`,
    `Journey`) now require `organizationId` for `findById`, `updateStatus`, `updateMeasured`,
    `updatePacing`, `expire`, `updateOutcome`, and `appendStep`.
  - `OutcomeService.measure`, `GoalService.updatePacing`, `JourneyService.getJourney`,
    `ActionOutcomeService` queue handler, and `BusinessLearningService.learnFromOutcome` updated
    to pass `organizationId`.
  - Presentation actions (`approveRecommendationAction`, `executeActionPlanAction`,
    `dismissRecommendationAction`, `getJourneyAction`) pass `user.organizationId`;
    `queue-handlers.ts` uses the persisted `outcome.organizationId` to scope lookups.
  - Verification scripts and unit-test fakes updated to pass the tenant context.
  - `npm run lint`, `typecheck`, `test`, and `build` pass.

- **TASK-0053-follow-up-4 — Intelligence in-memory state persistence** (spec `0053`):
  - Added Prisma models `IntelligenceFeedback`, `IntelligenceDismissal`, `GoalPlanVersion`, and `RolloutGate`,
    plus migration `20260728085245_audit_fixes_intelligence_state_persistence`.
  - Added repository ports and Prisma implementations in `src/modules/intelligence/infrastructure/repositories_extended.ts`.
  - Rewrote `makeIntelligenceFeedbackService`, `makeIntelligenceFeedInteractionService`,
    `makeGoalPlanGenerationService`, and `makeRolloutService` to use the new repositories and require `organizationId`.
  - Updated `container.ts`, presentation actions (`submitIntelligenceFeedbackAction`,
    `getIntelligenceFeedbackKpisAction`, `dismissInsightWithReasonAction`, `createGoalPlanWorkflowAction`,
    `testGoalPlanWorkflowAction`, `launchGoalPlanWorkflowAction`, `getRolloutGatesAction`, `setRolloutGateAction`),
    and verification scripts to pass the tenant context.
  - `RolloutGate` now defaults to organization-scoped persisted settings; super-admin toggles are stored per organization.
  - `npm run lint`, `typecheck`, `test`, and `build` pass.

### ⏭️ Next (proposed build order)

1. ~~Scaffold the app~~ ✅ done (TASK-010).
2. ~~**Module 1 — Auth**~~ ✅ done (TASK-020).
3. ~~**Users + Organizations + Stores**~~ ✅ done (TASK-030).
4. ~~**Module 2 — eCommerce connector framework** + Shopify provider~~ ✅ done (TASK-040).
5. ~~**Module 3 — Meta integration** (webhooks, FB Pages + IG Business, events)~~ ✅ done (TASK-050).
6. ~~**Module 6 — Customer Memory (CRM)** + **Module 4 — AI Assistant** (per-page system prompts)~~ ✅ done (TASK-060/070).
7. **Module 5 — First-time follower campaign** (event-driven: follow → coupon → message).
8. **Module 8 — Human takeover**, **Module 9 — Notifications**.
9. **Module 7 — Marketing insights dashboard** + **Reports**.
10. UI pages (Login, Dashboard, connections, AI settings, conversations, customers, coupons,
    reports, analytics, notifications, account) with dark/light mode.

> Each item above must start with its own spec (`docs/specs/`) and task (`docs/tasks/`)
> before implementation, per `AGENTS.md` §0.

### 🎯 Next

- **TASK-0062 — Universal E-commerce Connectors + Meta Business Growth Analytics** (req `docs/requirements/REQ-0062-universal-ecommerce-meta-analytics.md`):
  - Add WooCommerce, BigCommerce, and Magento `EcommerceConnector` providers.
  - Extend `Order`/`Coupon` schema with attribution fields (`attributedMediaId`, `attributionSource`, `couponCode`, `isFirstTimeCustomer`, `usageCount`, `revenueAttributed`).
  - Build business growth analytics: revenue, new customers, AOV, content-to-sale attribution, coupon effectiveness.
  - Add trending content discovery, best-time-to-post, AI content calendar, and “new customers from Meta” insights.
  - Extend Meta media insights with reel/video/story metrics and public hashtag/audio research.
  - Quality gates: lint, typecheck, tests, build, build:worker.

---

## Release history

_No releases yet._
