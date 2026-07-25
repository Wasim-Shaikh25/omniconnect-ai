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

### ✅ Done (all UIL phases complete)

- Phases 1–5 of the Unified Intelligence Layer are implemented and merged.

### 🔨 In Progress

- Local infra: Postgres + Redis run as Docker containers (`omni-pg`, `omni-redis`).
- Next: stabilize, harden, and address feedback from merged PRs.

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
