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

### ✅ Done

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
  - Added continuation spec `docs/specs/0054-audit-fixes-continuation.md` and tracker `docs/tasks/0054-audit-fixes-continuation-progress.md`.

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
  - **Remaining:** `teamSeats` enforcement (needs invite flow), M2 (per-field form errors), M3 (index verification).

- **TASK-0054 — Audit fixes continuation (remaining):**
  - Enforce `teamSeats` when adding members to an organization (requires an invite/add-member flow that does not yet exist).

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

---

## Release history

_No releases yet._
