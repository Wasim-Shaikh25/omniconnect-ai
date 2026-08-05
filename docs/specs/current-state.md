# OmniConnect AI — Current State and Architecture

- **Status:** Living document
- **Owner:** Devin
- **Last updated:** 2026-08-05
- **Changelog:** `CHANGELOG.md`
- **Product charter:** `docs/requirements/REQ-0061-product-charter.md`

> This document is the single source of truth for how the application works today. Update it whenever the architecture, public contracts, or critical flows change.

---

## 1. Product Goal

OmniConnect AI is a **universal Meta-first growth platform** for creators and merchants. It connects any major e-commerce store (Shopify first; WooCommerce, BigCommerce, Magento planned) and Meta (Instagram/Facebook) accounts to an AI assistant that helps users:

1. Create better Instagram/Facebook content from real trends.
2. Engage followers with AI replies and coupon campaigns.
3. Analyze which posts/reels/videos drive new customers, leads, and revenue.
4. Run automated Meta campaigns using real product and coupon data.

It is **not** a customer-facing storefront, a Shopify/e-commerce admin replacement, or a vendor portal.

---

## 2. Target Users and Roles

| Role | Description |
|------|-------------|
| `ANONYMOUS` | Visitor on landing/pricing pages. |
| `USER` | Workspace/project owner; can create workspaces, connect projects (stores), invite team, manage billing, view analytics. |
| `SUPER_ADMIN` | Platform-level support; can triage tickets, manage users, view system logs. |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 15 App Router + React Server Actions (BFF)          │
│  TailwindCSS + ShadCN UI + next-themes (dark/light)          │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  DDD Modules (Presentation → Application → Domain ← Infra)  │
│  auth, users, organizations, ecommerce, meta, ai, coupons,  │
│  crm, conversations, analytics, reports, notifications,   │
│  commerce, social, growth, branddeals, content,           │
│  intelligence, support                                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  PostgreSQL (Prisma ORM) + Redis (BullMQ, Pub/Sub, rate       │
│  limits, webhook dedup) + S3-compatible storage (future)      │
└─────────────────────────────────────────────────────────────┘
```

### Key architectural rules

- **Loose coupling:** Modules communicate via public application ports or domain events. No deep imports of another module's internals.
- **DDD layering per module:**
  - `presentation/` — Next.js pages, route handlers, server actions.
  - `application/` — use cases, command/query handlers, ports.
  - `domain/` — entities, value objects, domain events, pure business rules (no Prisma/fetch/env).
  - `infrastructure/` — Prisma repositories, external API clients, queue adapters.
- **Repository pattern** for persistence. All repository list/query methods reachable from list views enforce a `take`/pagination bound (defaults of 50–1000) to prevent unbounded `findMany` loads. Exceptions that must read the full set (e.g., order diff sync, full workspace data export) are documented in `TASK-0068` M4.4.
- **Event-driven** across module boundaries via the shared event bus. Client builds use a no-op in-memory bus; the server installs a durable `QueueEventBus` backed by BullMQ (or an in-memory fallback when Redis is unavailable). Events carry a stable `eventId` and are deduplicated by BullMQ `jobId`.
- **Provider/connector extensibility:** e-commerce (`EcommerceConnector`) and AI (`AIProvider`) providers sit behind interfaces. Adding a provider requires only implementing the interface and registering it.

---

## 4. Tech Stack

| Concern | Choice |
|---------|--------|
| Frontend | Next.js 15 App Router, React 19, TypeScript strict, TailwindCSS, ShadCN UI, next-themes |
| Backend | Next.js route handlers + React Server Actions |
| Database | PostgreSQL (Prisma ORM) |
| Cache / Queue / Pub-Sub | Redis (BullMQ, ioredis) |
| Auth | NextAuth.js v5 (Auth.js), JWT sessions, bcrypt, token version invalidation |
| AI | OpenRouter gateway via `AIProvider` interface (`OpenRouterProvider`; model routing centralized) |
| Payments | Stripe subscriptions + promotion codes |
| E-commerce | Shopify Admin REST API (live) + webhooks for catalog/orders/abandoned cart + Mock connector (dev) |
| Meta | Meta Graph API + Instagram webhooks (HMAC-SHA256 verified) |
| Observability | JSON logger, `SystemLog`, Sentry, OpenTelemetry |
| Deployment | Docker multi-stage, standalone Next.js output, Fly.io (`app` + `worker` groups) |

---

## 5. Modules and Responsibilities

| Module | Owns |
|--------|------|
| `auth` | User credentials, sessions, password reset, MFA, super-admin OTP, role checks. |
| `users` | User profile, organization membership, role changes, store assignment, GDPR export/delete. |
| `workspaces` | Replaces `organizations`; workspace lifecycle, projects/stores, tenant guard, plan limits, team invites. |
| `ecommerce` | `EcommerceConnector` framework, Shopify/Mock connectors, product/order/customer sync, coupons. |
| `meta` | Meta Graph API client, inbound webhook verification, outbound messaging. |
| `ai` | `AIProvider` interface, OpenRouter provider, content/trend/competitor generation, `AIUsageGuard`. |
| `coupons` | First-follower and DM campaign coupon orchestration. |
| `crm` | Customer and follower records, `CustomerMemory`, tags/stages. |
| `conversations` | Unified inbox, messages, human takeover/resume. |
| `analytics` | `getMarketingPerformance`, workspace KPIs, competitor tracking, growth dashboard, `MediaPost`/`MediaInsight`/`TrendSnapshot`/`ContentRecommendation`/`Report` domain, AI “why it worked” storyboards. |
| `reports` | AI-generated weekly/on-demand reports. |
| `notifications` | In-app and email notifications, preference toggles. |
| `support` | Support tickets, admin triage, system logs. `/support` is authenticated-only and not in `publicPaths`. |

---

## 6. Data Model (Summary)

Core tables (see `prisma/schema.prisma` for full model):

- `User` — authentication, RBAC role (`USER` | `SUPER_ADMIN`), `userId` (owning-tenant id), `projectId` (selected active project), plan/subscription fields, AI quota counters, `deletedAt`, `tokenVersion`.
- `Workspace` — tenant boundary; owned by a `userId`; carries plan/subscription metadata.
- `Project` — a connected e-commerce or Meta source (replaces `Store`); `workspaceId`, `provider`, `domain`, `archivedAt`/`deletedAt` for soft lifecycle.
- `EcommerceConnection` — OAuth/API tokens for Shopify/Meta; `accessToken`/`refreshToken` encrypted at rest; `projectId` scoped.
- `Product` / `Order` / `Customer` / `Coupon` — synced from e-commerce connectors; `externalId` + `projectId` uniqueness.
- `Conversation` / `Message` — DM/comment threads; status `AI_ACTIVE` or `HUMAN_ACTIVE`.
- `Follower` / `Campaign` — first-follower campaign tracking.
- `MediaPost` / `MediaInsight` / `AccountInsight` / `TrendSnapshot` / `ContentRecommendation` / `Report` — Meta content intelligence, trends, AI ideas, and generated reports.
- `Notification` / `NotificationPreference` — in-app notifications and per-user/channel settings.
- `SystemLog` / `AuditLog` — structured operational and security-relevant logs.
- `ProcessedWebhookEvent` — provider-scoped idempotency ledger for Stripe, Shopify, and Meta webhooks; pruned after 30 days.
- `ExportRequest` — GDPR data-export jobs.

---

## 7. Authentication and Authorization

- **NextAuth v5 JWT strategy** with `tokenVersion` invalidation.
- `getCurrentUser()` loads the canonical DB record including `userId`/`projectId` and verifies `tokenVersion`; password/role/super-admin changes invalidate existing sessions.
- `tenantGuard.assertStoreAccess(user, projectId)` enforces: owners (`user.userId === user.id`) access any project in their workspace; staff (`user.userId` points to the owner) are pinned to `user.projectId`; super-admins bypass.
- `requireRole()` / `requireSuperAdmin()` helpers for pages and actions.
- Store pages use `checkStoreAccess(projectId)` — a pure predicate that returns a discriminated union — and call `notFound()` / `redirect("/login")` directly in the page body. A thin `requireStoreAccess(projectId)` wrapper remains for server actions that need throwing semantics.
- The global `src/app/loading.tsx` was removed so Next.js does not stream the response before `notFound()` / `redirect()` can set the HTTP status.
- The `authorized` middleware callback redirects authenticated non-super-admins away from `/admin*` to `/dashboard` (`307`) before any admin page streams.
- `RootLayout` does not call `getCurrentUser()`; the app is wrapped in `next-auth/react` `SessionProvider` and `AppShell` fetches the session client-side. This keeps the server-rendered 404/error HTML from embedding the authenticated user's name/email/store data, satisfying the M7 smoke-test assertions in `scripts/check-http-status.ts`.
- Super admin requires email-based OTP in addition to login; if `SUPER_ADMIN_PHONE` is set, an SMS is also sent, otherwise an unverified `account.phone` is never used as an SMS destination.
- Phone verification issues a 6-digit OTP with a per-request random salt and stores `hash(salt:code)`; verification is performed by looking up the user's pending `phone_verify` request and comparing the salted hash, with a 5-attempt cap and a `verifyPhoneAction` rate limit. Expired/invalid requests are consumed before issuing a new code to avoid collisions.
- Account soft-delete (`deleteAccount`) preserves the original email so the 30-day grace-period restore path in `authorize()` works; it erases `name`, `phone`, `phoneVerified`, `mobile`, `mobileVerified`, and `image` and bumps `tokenVersion`.
- `SMS_PROVIDER=twilio` now fails loudly at startup if any Twilio credential is missing instead of silently falling back to the console sender.

### 7.5 Tenancy and Workspace Model

- A user is the root tenant (`userId` equals their own id for owners, or the owner id for invited staff). A `Workspace` is created automatically during onboarding.
- Inviting an existing user to a project updates their `projectId` / `userId` (and bumps `tokenVersion`); staff are pinned to a single project.
- The invite email sender is best-effort: `sendInviteEmail` catches provider errors, logs them, and resolves so the `OrganizationInvite` record is still created and the `/settings` form does not 500.
- Owners can access any project in their workspace. Assigned `USER` staff are pinned to a single `projectId`; on login they are redirected from `/dashboard` to `/stores/{projectId}`. Staff with no `projectId` are redirected from `/dashboard` to `/stores` and the **Add a store** card is hidden.
- `/stores` and `/dashboard` scope the store list and KPIs by `projectId` for staff; `/settings` lists all workspace members by `userId` so the owner can reassign a staff member's project.
- Old `Organization`/`Store`/`Staff`/`StoreIntegration` models have been removed; `Workspace` + `Project` + `EcommerceConnection` provide the same scoping.

---

## 8. Key User Flows

### 8.1 Registration and Onboarding
1. `/register` → `registerUserAction` → `UserRegistered` event.
2. `workspaces` module auto-creates a `Workspace` and links the owner.
3. Immediately after signup the user has a `User` and a `Workspace`, but no `Project` and no `EcommerceConnection`.
4. `/onboarding` prompts the user to create a project (or connect an existing source).
5. `completeOnboardingAction` updates the session with new `userId`/`projectId`/`tokenVersion`.

### 8.2 Connect E-commerce Store
1. Owner visits `/stores` or `/stores/[projectId]`.
2. Chooses provider and enters credentials.
3. `connectStoreAction` validates hostname/domain and persists an encrypted `EcommerceConnection`.
4. `syncProductsAction` calls `EcommerceConnector.getProducts()` and upserts `Product` records.

### 8.3 Connect Meta
1. Store detail Meta connection form.
2. `connectMetaAction` persists `EcommerceConnection` with page/IG ID and access token.
3. `/api/meta/webhook` receives verified `MetaMessageReceived`/`MetaFollowReceived`/`MetaCommentReceived` events.

### 8.4 First-Follower Campaign
1. Meta webhook → `crm` records follower and emits `FirstTimeFollowerDetected`.
2. `coupons` module generates a coupon via `ecommerce.generateCoupon` (or local if no live connector).
3. `ai` composes welcome message.
4. `metaService.sendMessage` sends DM with coupon code.
5. `conversations` records the AI message.

### 8.5 AI Reply in Inbox
1. Customer DM/comment → `MetaMessageReceived` event.
2. `conversations` appends customer message.
3. Subscriber calls `ai.generateReply` if conversation status is `AI_ACTIVE` and `AIUsageGuard` allows.
4. AI reply appended; `metaService.sendMessage` attempted.
5. Staff can `takeOver` to set `HUMAN_ACTIVE`; `resumeAI` flips back.

### 8.6 Analytics
1. `getMarketingPerformance(projectId)` fetches live Meta page/media/audience insights and Shopify orders.
2. `attributeOrdersToMedia` attributes orders to the most recent media within a 7-day window.
3. Returns `MarketingPerformanceView` with `dataQuality` (`live`/`partial`/`simulated`) badge.
4. Project-scoped analytics pages (`/stores/[projectId]/analytics/content`, `/trends`, `/reports`, `/recommendations`, `/competitors`, `/mentions`) list `MediaPost`, `TrendSnapshot`, `Report`, `ContentRecommendation`, `TrackedAccount`, and `SocialMention` records and trigger `syncMediaCatalog`, `searchTrendingHashtags`, `generateReport`, `createContentRecommendation`, `getCompetitorComparisonDashboard`, and `listMentionsWithSentimentAction` / `syncMentionsAction`.
5. Per-post detail page runs `analyzeMedia`, which now computes `single_post_analysis` deterministically (engagement score, percentile, z-score, verdict) against a baseline of the project's other `MediaPost` records. The LLM receives the computed `AnalysisResult` and is allowed to narrate `whyItWorked`, suggest improvements, and generate the slide-by-slide storyboard, but it cannot invent new numbers.
6. Trend generation (`generateTrends`) computes `predictedEngagementScore` from the percentile rank of the top-performing recent posts, `predictedRevenue` from the median order total, and `bestTimeToPost` from the `best_time` engine. The LLM writes titles, hooks, descriptions, and CTAs using those pre-computed numbers; the parsed output is overwritten with the deterministic values so no invented metrics reach the user.
7. A reusable `AnalysisEngine` (`makeAnalysisEngine`) interprets a closed `AnalysisSpec` vocabulary (`single_post_analysis`, `top_n`, `compare_period`, `anomaly_check`, `cohort_trend`, `attribution_breakdown`, `best_time`, `correlation`, `profile_quality`) with pure deterministic operations. Implemented operations include `single_post_analysis`, `top_n`, `best_time`, `compare_period`, `anomaly_check`, `correlation`, `cohort_trend`, `attribution_breakdown`, and `profile_quality`. `OperationResolver` maps natural-language analytics questions to an `AnalysisSpec` with a confidence score and an `unsupported` fallback; it uses the `EmbeddingProvider` port with a dependency-free `KeywordEmbeddingProvider` adapter. `queryAnalytics` and `generateDashboard` wire the resolver to the engine and transform the deterministic `AnalysisResult` into a `DashboardSchema` of KPI, line_chart, and table widgets. `makePrismaDatasetFetcher` provides a project-scoped `DatasetFetcher` adapter that loads orders, media, account insights, followers, and comments through the existing `EcommerceQueries`, `CrmQueries`, `SocialQueries`, and `MarketingInsightsRepository` ports; the adapter is constructed in `analytics/infrastructure/container.ts` and injected into `makeQueryAnalytics` so the use-case stays free of infrastructure imports. The operation map now uses typed adapters that read `AnalysisSpec.topN` for `top_n`/`best_time`, `compare_period` uses a correctly abutting previous window, and the default `dateRange` includes today's data by ending at 23:59:59.999. `analytics` exposes `queryAnalyticsAction` (server action) and the `/analytics/dashboard` page uses it with an NL input form, tenant-guarded by the current user's `projectId` and rendered with `DynamicDashboard`. The `DynamicDashboard` React component in `src/components/dashboard` renders any `DashboardSchema` using inline SVG for line, bar, pie, and sparkline widgets, plus KPI cards and a data table.
8. The new `inspector` module exposes `inspectProfile` for deterministic profile/reel inspection. It reuses `profileQuality` from `analytics` to compute an audience-quality score, estimates demographics from public signals, classifies a growth trend from follower snapshots, and emits a deterministic narration via a `ProfileNarrator` port. The `ProfileFetcher` and `ProfileNarrator` ports keep the core testable and allow Meta/OpenRouter integrations later.
9. `analytics` exports a `TransformersEmbeddingProvider` (`@xenova/transformers`) that loads a local MiniLM model with `local_files_only: true` and falls back to the keyword provider if no model is configured or loading fails. `inspector` exports `makeMetaProfileFetcher` (Meta Business Discovery API) and `makeOpenRouterProfileNarrator` (LLM narration) as infrastructure adapters behind the existing ports. `MetaService` exposes `getAccessToken` and `getAccountId` (server-only) so the fetcher can call Graph API without exposing internals.
10. `inspectProfileAction` composes `makeMetaProfileFetcher` + `inspectProfile` + `makeOpenRouterProfileNarrator` (falling back to `deterministicProfileNarrator` when OpenRouter is not configured). AI-powered narration is gated by `AIUsageGuard` and consumes one `monthlyAiReplies` entitlement; quota errors are returned to the UI. The `/stores/[projectId]/analytics/audience/inspector` page renders a username form and a results dashboard with confidence labels for metrics and demographics. Unknown operations are rejected (`UnsupportedOperationError`).
11. Brand mention monitoring (`/stores/[projectId]/analytics/mentions`) is project-scoped through `social` module ports: `BrandMentionSource` defines how public mentions are collected; `MentionSentimentAnalyzer` returns `POSITIVE` / `NEGATIVE` / `NEUTRAL` / `MIXED` with confidence and a short summary. `makeMentionService` wires the source, repository, and analyzer into idempotent `syncMentions` and `listMentionsWithSentiment` queries. `syncMentionsAction` and `listMentionsWithSentimentAction` are tenant-guarded and revalidate the page after sync. Adapters: `HeuristicMentionSentimentAnalyzer` (keyword-based, always available), `OpenRouterMentionSentimentAnalyzer` (calls `aiProvider.complete` and falls back to the heuristic), and `MockBrandMentionSource` (deterministic dev data). A live Meta Mentions API adapter can be added later behind the same `BrandMentionSource` port.
12. Dashboard export: the `/analytics/dashboard` page includes a `DashboardExportToolbar` with client-side PNG image and PDF download using `html-to-image` and `jspdf`. A tenant-guarded `createDashboardShareAction` persists a `DashboardSchema` snapshot as a `DashboardShare` row and returns a public `/share/d/[token]` link; the share page renders the stored dashboard read-only. Expired or missing tokens return 404.

---

## 9. External Integrations

### E-commerce
- `EcommerceConnector` interface: `fetchStoreInfo`, `getProducts`, `getOrders`, `getCustomers`, `fetchDiscounts`, `generateCoupon`, `disableCoupon`.
- Implemented: dynamic `EcommerceConnector` interface with `ShopifyConnector` (Admin REST API v2024-01), `WooCommerceConnector`, `BigCommerceConnector`, and `MockConnector` (deterministic dev data).
- Shopify webhooks: `POST /api/shopify/webhooks` verifies HMAC-SHA256, maps shop domain to `Integration`, and handles `products/create`, `products/update`, `products/delete`, `orders/create`, `orders/paid`, `checkouts/create|update`, and the four GDPR/compliance topics `customers/data_request`, `customers/redact`, `shop/redact`, and `app/uninstalled`. Delivery is deduplicated by `x-shopify-webhook-id` using the shared `ProcessedWebhookEvent` ledger. Product/order payloads are normalized and persisted. Checkout payloads upsert a `Cart` row and do **not** publish domain events; `orders/create|paid` marks the matching cart `convertedAt` when `cart_token` is present. A periodic sweep identifies idle, unconverted, unnotified carts and publishes `AbandonedCartDetected` exactly once. `CartRepository.markNotified` uses `UPDATE ... WHERE notifiedAt IS NULL` and returns whether this call made the update, so concurrent sweeps cannot double-notify; a notification subscriber creates an in-app alert. Compliance webhooks are routed through `makeApplyShopifyWebhook` with a `PrismaShopifyComplianceRepository` that erases/anonymizes PII, deletes shop-scoped data and tokens, disconnects the integration, and writes an `AuditLog` record for each action. Unhandled `customers/*`, `shop/*`, and `app/*` topics return a non-2xx result instead of `{ ok: true }`.

### Meta
- Webhook verification: HMAC-SHA256, constant-time compare, payload dedup via the shared `ProcessedWebhookEvent` ledger.
- Graph API: page/account media, per-media insights, audience demographics, outbound messaging.
- Permissions: `instagram_business_basic`, `instagram_business_manage_insights`, `pages_read_engagement`; optional `ads_management`/`ads_read` for ad insights.
- Rate limits: ~200 calls/hour/user; cache aggressively; mark `dataQuality` `partial` on failure.

### OpenRouter
- `OpenRouterProvider` implements `AIProvider` and `ContentModerator`.
- All AI chat completions route through `OpenRouterClient` (`POST /api/v1/chat/completions`)
  with normalized model aliases, user-message delimiters, output PII redaction, and a
  configurable default model.
- `OpenRouterClient` supports non-streaming chat, streaming, tool calling, and response formats.
- Per-feature model routing (`selectModel` / `getModelForFeature`) chooses a model from the
  AI configuration override, environment variable, or `AI_DEFAULT_MODEL`.
- Token usage is persisted per completion (user, project, feature, model, prompt/completion/total
  tokens, cost) via `PrismaTokenUsageRepository` wired into `OpenRouterProvider`; super admins can
  view the last 30 days of usage and recent calls on `/admin/ai-usage`.
- Prompt-injection defences: `sanitizePromptFragment` / `escapePromptDelimiters` / `wrapUserMessage` /
  `wrapExternalData` live in `src/modules/ai/domain/prompt-safety.ts` (pure, no IO). The reply
  system prompt instructs the model that `<<<USER_MESSAGE>>>` and every `<<<DATA>>>` region are
  untrusted data, not instructions, and that discounts must come from `<<<COUPONS>>>`.
- Output moderation: `OpenRouterProvider.moderate` uses a JSON classification prompt via
  OpenRouter; `generateReply` withholds flagged output, logs the categories (not the text),
  writes an audit log without PII, and escalates to a human before any Meta send.

### Stripe
- Checkout sessions for plan upgrades; webhook fulfillment updates `Organization` subscription.
- Webhook handlers: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`.
- Subscription lifecycle derives the plan from the active `price.id` via `planFromPriceId`; `past_due` retains the current plan, while `canceled`/`unpaid`/`incomplete_expired` drops entitlement to `FREE`.
- Stripe client pinned to `2024-09-30.acacia` API version.
- SaaS promotion codes (`SaaSCoupon`) validated at checkout.

---

## 10. Deployment and Operations

- **Dockerfile:** multi-stage, non-root, standalone output. The runner stage copies `prisma/`,
  `scripts/`, the Prisma runtime, and `prisma`/`tsx` CLI symlinks so `npx prisma migrate deploy`
  runs inside the image. Size delta is ~12 MB (362 MB → 374 MB); a single image is used.
- **Fly.io:** `app` web process + `worker` BullMQ process. `fly.staging.toml` defines the staging
  environment; `fly.toml` defines production.
- **Continuous deployment:** `.github/workflows/deploy.yml` triggers after CI passes on `main`,
  auto-deploys to staging, then deploys to production through a GitHub Environment approval.
- **Health checks:** `/api/health` (liveness; returns `version` = `GIT_COMMIT_SHA`) and `/api/ready`
  (DB + Redis).
- **Backups:** PostgreSQL `pg_dump`, Redis `BGSAVE`. `.github/workflows/backup.yml` runs a weekly
  `pg_dump -Fc` to S3. Restore and rollback runbook + migration compatibility policy in
  `docs/operations.md`; `scripts/backup.sh` and `scripts/restore.sh` support one-off operations.
- **Observability:** Sentry + OpenTelemetry initialized in app and worker; spans around AI, Meta,
  and Shopify calls. Alert table and risk register in `docs/operations.md`.
- **Secrets:** all tokens encrypted at rest using HKDF-derived AES-GCM keys with the `enc:v2:` format; `decryptString` falls back to `ENCRYPTION_KEY_PREVIOUS` for key rotation and still reads legacy `enc:` (v1 SHA-256) and plaintext tokens. The rotation runbook and `scripts/reencrypt-credentials.ts` are in `docs/operations.md`. No secrets in logs; `env.ts` validates required production variables. `.dockerignore` excludes `.env*` from the image.

---

## 11. Current Limitations and Known Gaps

- Only **Shopify** e-commerce connector is live; WooCommerce/BigCommerce/Magento are planned (REQ-0062).
- Analytics `couponsUsed` and strict coupon-to-order attribution are not yet implemented (TASK-0062).
- Out-of-scope UI routes (affiliates, media-kit, brand-deals, UGC growth, revenue, daily-marketing, engagement, orders) have been removed. The remaining navigation is grouped in a collapsible sidebar (Home / Connect / Create / Engage / Analyze / Account).
- Direct Meta content publishing/scheduling is out of scope for MVP.
- Real load and penetration testing has not been performed.
- Accessibility hardening (`REQ-0068` M8) is in place: a skip link targets `<main id="main-content" tabIndex={-1}>`, the collapsed sidebar preserves link labels via `aria-label` with `aria-hidden` icons, and the mobile drawer is a Radix `Dialog` that traps focus, closes on `Escape`, and restores focus to the trigger. Manual keyboard traversal and a colour-contrast spot-check on primary surfaces were recorded.
- Encryption (`REQ-0068` M9) uses HKDF (`enc:v2:`), supports dual-key decryption with `ENCRYPTION_KEY_PREVIOUS` for rotation, and documents a re-encryption procedure.
- Login throttling (`REQ-0068` M10) applies a per-IP (5/15min) and per-account (20/hour) fixed-window counter in `authorize`; `RateLimitError` surfaces "Too many attempts. Try again in N minutes." without revealing account existence.
- AI prompt safety (`REQ-0068` M15) uses `<<<USER_MESSAGE>>>` and `<<<DATA>>>` delimiter regions,
  escapes `&`/`<`/`>` in user-editable fragments and external data, adds a system instruction that
  only delimited user input is untrusted, and runs generated replies through an OpenRouter-hosted
  JSON classification prompt before sending to Meta; flagged content is withheld and escalated.
- Identity self-service (`REQ-0070`) Package A/B/C is complete. Registration now requires a
  matching confirm password, enforces an optional E.164 phone number, verifies Cloudflare Turnstile
  on the server (no-op when unconfigured), and is enumeration-safe (existing emails receive a
  "someone tried to register" notice without leaking account existence).
- Email verification at signup: credential users are created with `emailVerified: null`, receive a
  24-hour hashed token by email, and consume it at `/verify-email`. `authorize` returns a
  distinguishable `unverifiedEmail` code with a resend affordance; resends are rate-limited to
  3/hour/address. `requireVerifiedEmail()` gates AI generation, store creation, and Stripe checkout.
- Password and email self-service (`REQ-0070` Package D): `/settings/account` exposes forms to
  change password and request an email change. Password change requires the current password and is
  rate-limited; it bumps `tokenVersion` and re-issues the current session's JWT. Email change sends
  a confirmation link to the new address and a notice to the old; it only takes effect after the
  new address is confirmed, bumps `tokenVersion`, and writes an `AuditLog` entry.
- Phone verification (`REQ-0070` Package E): `auth` exposes a `PhoneVerificationService`
  behind the `SmsSender` port. `ConsoleSmsSender` logs only a redacted destination; `TwilioSmsSender`
  sends via the Twilio REST API. OTPs are 6 digits, expire in 10 minutes, allow 5 attempts, and are
  rate-limited to 3 sends/hour/number. `/settings/account` shows a phone-verification card when
  `SMS_PROVIDER` is not `disabled`; users can add, verify, and remove a phone number. `User.phone`
  and `User.phoneVerified` are updated only on successful verification; the plaintext OTP is never
  stored or logged.
- Session management (`REQ-0070` Package F): the minimal "sign out everywhere" flow bumps
  `User.tokenVersion`, writes an `AuditLog` entry, and calls `next-auth` `signOut` on the client to
  clear the current session cookie and redirect to `/login`.
- Super-admin reconciliation (`REQ-0070` Package G): `ensureSuperAdmin` is gated by
  `SUPER_ADMIN_RECONCILE` and can update an existing super admin's password hash, role, and phone
  on bootstrap. The super-admin MFA flow sends the code via email and, when `SUPER_ADMIN_PHONE`
  is set and an SMS provider is configured, by SMS as well. The break-glass procedure is documented
  in `docs/operations.md`. The `/settings` page no longer links to dead routes.
- Privacy / GDPR (`REQ-0070`): `phone` is included in the `UserDataExport`; account deletion erases
  `email` (to a unique anonymous placeholder), `name`, `phone`, `phoneVerified`, `mobile`,
  `mobileVerified`, and `image`, and bumps `tokenVersion` so existing sessions are invalidated.
- `User.phoneVerified` and the `VerificationRequest` table are in place; `dateOfBirth` remains
  omitted for the MVP; new env vars (`REQUIRE_EMAIL_VERIFICATION`, `TURNSTILE_*`, `SMS_PROVIDER`,
  `TWILIO_*`, `SUPER_ADMIN_RECONCILE`) are configured.

### 11.1 Production readiness — 🔴 NO-GO as of 2026-07-31

`PRODUCTION_READINESS_AUDIT.md` returned a NO-GO verdict. All 33 findings were re-verified as
**open** at commit `33e2e0b`. The release-blocking defects are:

- **C1** — `trustHost` is now set from `AUTH_TRUST_HOST` (default `true` off Vercel) and the
  `redirect` callback enforces same-origin against `APP_URL`; the CI smoke test asserts
  `/api/auth/session` returns `200` on the standalone build.
- **C2** — `RedisEventBus` no longer echoes its own published messages back to handlers on the
  publishing instance (handlers fire once via Pub/Sub, or once locally when Redis is unreachable).
  Durable, exactly-once delivery across the cluster (BullMQ `jobId` dedup) is still pending H6.
- **H1** — `ensureSuperAdmin` in `instrumentation.ts` is now wrapped in `try/catch` and only fails
  the release via `scripts/seed-super-admin.ts`; `/api/health` stays up during a transient DB outage.
- **H2/H3** — `ProcessedWebhookEvent` ledger deduplicates Stripe, Shopify, and Meta webhook deliveries. Stripe `fulfillCheckout` now records the event and performs plan/coupon side effects inside one `Prisma` transaction so a crash mid-fulfillment does not mark an event processed while losing the update. Stripe subscription lifecycle handles `customer.subscription.created/updated`, `invoice.paid/payment_succeeded/payment_failed`, `planFromPriceId`, `resolveSubscriptionId`, and `past_due` retains the current plan. A `scripts/backfill-past-due.ts` backfill is available.
- **H4** — `/api/export/[id]` now uses `getCurrentUser()`, enforces a 10 req/min rate limit, and
  returns `Cache-Control: no-store, private`, so revoked sessions cannot download exports.
- **H5** — `Project`/`ProjectMember` removed; no destructive archive path remains.
- **H6** — `DomainEvent` now carries a stable `eventId`; `QueueEventBus` persists events to a BullMQ queue with `jobId` dedup, retries, and DLQ. The worker wires subscribers before consuming the `events` queue, and `/api/metrics` exports `events_failed_jobs`. `generateReply` is idempotent via `Message.inReplyToMessageId` and a composite unique constraint.
- **H7** — Shopify `checkouts/create|update` upsert a `Cart` row without emitting events; `orders/create|paid` marks the matching cart `convertedAt`. The `Cart` model tracks `lastActivityAt`, `notifiedAt`, and `convertedAt`. A background sweep (every 15 minutes, threshold `ABANDONED_CART_THRESHOLD_MINUTES`, default 60) publishes `AbandonedCartDetected` exactly once per idle cart; the notifications module subscribes and creates an `ABANDONED_CART` in-app notification.
- **H8** — Package A addressed: `redis:7-alpine` is now a CI service, `npm audit` and gitleaks
  secret scanning run in CI, and the smoke test covers `/api/health`, `/api/auth/session`,
  `/api/ready`, and `POST /api/shopify/webhooks`. A Redis ping test is added; Tier 1–2 regression
  suites are still pending.
- **H9** — `/api/shopify/webhooks` is now in `publicPaths`, so anonymous Shopify webhooks reach
  HMAC verification; the CI smoke test asserts the route does not return `3xx`.
- **H10** — `invite-member.ts` now uses `createWithinSeatLimit`, a serializable transaction with
  bounded retries, so concurrent invites cannot exceed `teamSeats`. Other `planLimits()` callers
  (`create-store`, AI reply counter) are already atomic.
- **H8** — Package A addressed: `redis:7-alpine` is now a CI service, `npm audit` and gitleaks
  secret scanning run in CI, and the smoke test covers `/api/health`, `/api/auth/session`,
  `/api/ready`, and `POST /api/shopify/webhooks`. A Redis ping test is added; Tier 1–2 regression
  suites are still pending.

Remediation is planned across `REQ-0067` … `REQ-0075`. The complete finding-to-requirement
traceability map is `docs/audit/2026-07-31-remediation-index.md`.

---

## 12. Where Work Is Tracked

- **Product charter:** `docs/requirements/REQ-0061-product-charter.md`
- **Implementation specs:** `docs/requirements/REQ-0062-universal-ecommerce-meta-analytics.md`
- **Requirements:** `docs/requirements/REQ-*.md`
- **Tasks:** `docs/tasks/TASK-*.md` (code snippets + references)
- **Trackers:** `docs/trackers/TRACKER-*.md` (progress)
- **Status checker:** `scripts/task-status.ts`
- **Changelog:** `CHANGELOG.md`
- **Production readiness audit:** `PRODUCTION_READINESS_AUDIT.md`
- **Domain event registry:** `docs/specs/event-registry.{md,json}` (89 declared events classified
  Live/Planned with a REQ id; `src/test/event-registry.test.ts` enforces registration).
- **Audit remediation index:** `docs/audit/2026-07-31-remediation-index.md` (maps every finding to
  its owning REQ/TASK/TRACKER)

---

## 13. Editing This Document

Update this file when:
- A new module, provider, or integration is added.
- A public contract or data model changes.
- A critical user flow changes.
- Deployment, security, or observability behavior changes.

Always pair updates with an entry in `CHANGELOG.md`.
