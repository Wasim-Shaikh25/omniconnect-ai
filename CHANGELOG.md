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

- `REQ-0078` **Dynamic E-Commerce Adapters — Batch 1** on `devin/req-0078-dynamic-adapters-batch1-1786085000`:
  implemented the safe HTTP `ConfigInterpreter` (`buildUrl`, `buildHeaders`, `extractPath`, `mapFields`, `interpolate`)
  so an `AdapterConfigMapping` can execute every `EcommerceConnector` method without arbitrary code;
  added a Zod validation schema for `AdapterConfigMapping`;
  added `OpenRouterAdapterGenerator` that converts API documentation text into a validated config via
  the public `AIProvider` port;
  added `testAdapterConfigAction` to exercise `fetchStoreInfo` + `getProducts` with user credentials and
  tenant-guarded project access. UI persistence and hardcoded connector removal queued for Batch 2.

- `REQ-0067` **Release blockers — remaining tests and hardening** on `devin/req-0067-release-blockers-c2-tests-1786083000`:
  - added `src/shared/events/redis-event-bus.integration.test.ts` proving two `RedisEventBus` instances on one Redis each dispatch a published event exactly once;
  - added `src/modules/ecommerce/application/apply-shopify-webhook.integration.test.ts` proving a valid HMAC `products/create` payload persists a product and `x-shopify-webhook-id` deduplication works;
  - added route-level regression tests for `/api/export/[id]` covering stale `tokenVersion` and soft-deleted users returning `401`;
  - added `generate-reply` idempotency unit test asserting duplicate invocations reuse the existing AI `Message` and do not call the provider or send a second DM;
  - hardened `ChatSessionRepository.delete` to scope by `projectId` and updated `ChatAssistantService.deleteSession` / `deleteChatSessionAction` signatures accordingly (H5.6 delete-site inventory);
  - added `scripts/backfill-past-due.ts` to reconcile organizations stuck in `past_due` against live Stripe subscription status (H3.6).

- `REQ-0076`, `REQ-0077`, `REQ-0067`, `REQ-0078`, `REQ-0075` **Remaining V2 foundation batch** on `devin/features-branch-remaining-5req-1786011015`:
  - `REQ-0076` Auth & Registration Overhaul: registration accepts `companyName`, `age`, and `gender`;
    password policy now requires lowercase, uppercase, number, and special character; email and
    mobile OTP are gated by `ENABLE_EMAIL_OTP` and `ENABLE_MOBILE_OTP`; social login buttons are
    hidden when provider credentials are absent; default workspace auto-provisioning on registration.
  - `REQ-0077` Workspace & Project System: added `ProjectSwitcher` in the app shell,
    `switchProjectAction`, and `listMyStoresAction`; `createStore` enforces the stricter of
    `maxStores`/`maxProjects`; default `AIConfiguration` is auto-created on `StoreCreated` via the
    `ai` module subscriber.
  - `REQ-0067` Release blockers: H1 startup resilience (super-admin seed is best-effort),
    H9 Shopify webhook public-path prefix matching so `/api/shopify/webhooks` is not caught by
    NextAuth redirects, and H10 atomic seat-limit enforcement counting members by `userId`.
  - `REQ-0078` Dynamic E-Commerce Adapters: defined `AdapterConfigMapping` and the `ConfigInterpreter`
    scaffold implementing `EcommerceConnector`; exported from the `ecommerce` barrel.
  - `REQ-0075` Release engineering: documented rollback/backups/deploy topology in
    `docs/operations.md` and aligned CI/workflow artifacts.

- `REQ-0080` **Mobile PWA optimization for messaging UI (T-075)** on `devin/batch-0085-0080-0070-1786007108`:
  added `OnlineStatus` (`src/components/online-status.tsx`) to show an offline alert on the
  conversations list and detail pages, made conversation list items stack with full-width action
  buttons on small screens, and improved the message feed with sender-aligned bubbles and
  `break-words`. `ConversationTakeoverButton` and `ConversationMessageForm` buttons now span the
  full width on mobile and shrink to auto on larger screens.

- `REQ-0069` **Navigation reachability hardening (L2/L3)** on `devin/batch-0085-0080-0070-1786007108`:
  verified `/support` and `/analytics/journeys` are present in the authenticated sidebar, no two
  nav entries share a destination, active-state matching is exact (`pathname === item.href`), and
  the admin item is injected by section label (`Account`) with an explicit `if` check. Updated
  `TASK-0069` and `TRACKER-0069` to reflect completion; `L5.2/L5.3` memory sizing remains a
  post-launch ops task.

- `REQ-0085` **Profile & Reel Inspector closeout** on `devin/batch-0085-0080-0070-1786007108`:
  marked the `CHANGELOG.md updated` checkbox in `TASK-0085` and updated `TRACKER-0085` last-updated;
  the feature was already implemented and the existing `CHANGELOG.md` entry was confirmed present.

- `REQ-0079` **Meta Growth Engine — Content Publishing API** on `devin/req-0079-content-publishing-1786062600`:
  added `MetaService.publishMedia` to the `meta` port and implemented it in `GraphApiMetaService` with the
  full Instagram Content Publishing API flow: create media container, poll `status_code` until `FINISHED`,
  and `media_publish`. Supports `IMAGE`, `VIDEO`, `REEL`, `CAROUSEL`, and `STORY` media types. Added
  `makePublishMedia` in the `content` module, `publishMediaAction` tenant-guarded through `organizationQueries`,
  and the `PublishPostForm` UI on `/stores/[projectId]/content`. Unit tests added for `publish-media.ts`.

- `REQ-0079` **Meta Growth Engine — Content Scheduling (T-024)** on `devin/req-0079-content-scheduling-1785999995`:
  added the `ScheduledPost` Prisma model + migration; `schedulePost` use-case enforces the plan's
  `maxContentSchedulesPerMonth` and either enqueues a delayed `publish-scheduled-post` job or publishes
  immediately when the scheduled time is in the past. `InMemoryQueue` now supports `delay` for local/test runs;
  the BullMQ worker (`src/jobs/worker.ts`) starts a `content-schedule` worker. The `PublishPostForm` UI adds a
  schedule picker and a scheduled-posts list on `/stores/[projectId]/content`. Unit tests added for
  `schedule-post.ts`. Next up in REQ-0079: hashtag intelligence (T-058) and best-time-to-post (T-059).

- `REQ-0079` **Content Publishing API review fixes** on `devin/fix-content-publishing-review-1786000600`:
  `GraphApiMetaService.publishMedia` builds the `media_publish` URL with `URL` and sends the access token in
  the `Authorization: Bearer` header instead of the query string; `createMediaContainer` and
  `pollContainerStatus` also use the `Authorization` header. Polling short-circuits on any status other than
  `FINISHED` (`ERROR` or `TIMEOUT`), and `makePublishMedia` uses `safeParse` so users see friendly validation
  messages (e.g., for more than 10 carousel slides) instead of a raw Zod JSON dump.
- `REQ-0079` **Meta OAuth review fixes** on `devin/fix-content-publishing-review-1786000600`:
  `/api/meta/auth` now generates a signed, random-nonce `state` and stores the nonce in an `HttpOnly`
  `meta_oauth_state` cookie; `/api/meta/callback` verifies the state against the cookie before accepting the
  `projectId`, preventing CSRF account-linking. The access token is sent via the `Authorization: Bearer` header,
  `fetchGraph` no longer logs URLs or raw response bodies (only status and a sanitized error code), the redirect
  URI falls back to `APP_URL` rather than a hardcoded `localhost` default, `exchangeMetaOAuthCode` uses POST
  form bodies, and `fetchInstagramAccount` no longer falls back to a Facebook Page id when no Instagram
  Business account is linked.
- `REQ-0079` **Content Scheduling review fixes** on `devin/fix-content-scheduling-review-1786001674`:
  fixed timezone handling by converting the `datetime-local` value to an ISO UTC string on the client and storing
  the browser's IANA timezone in `ScheduledPost.scheduledAtTimezone`; rejected missing/empty schedule times
  (previously `null` coerced to 1970-01-01 and published immediately); capped `InMemoryQueue` delays to the
  maximum `setTimeout` value so far-future posts do not fire instantly in dev/test; marked `ScheduledPost`
  rows as `FAILED` when enqueueing throws; and removed the unused `User.contentSchedulesThisMonth` /
  `contentSchedulesResetAt` columns.
- `REQ-0079` **Hashtag intelligence, best time to post, and content calendar UI** on `devin/req-0079-hashtag-besttime-calendar-1786001674`:
  added `makeHashtagIntelligence` use-case that searches the Meta Hashtag API, fetches top media, and scores
  tags with deterministic competition/reach/relevance metrics plus an optional OpenRouter AI scorer; exposed
  as `hashtagIntelligenceAction` and rendered in the `HashtagIntelligence` panel on `/stores/[projectId]/content`.
  Added `ContentBestTime` (server component) wired to `getBestTimeToPostForStore` and `ContentCalendar`
  (client, drag-to-reschedule) wired to `getContentCalendarForStore`. Added `makeReschedulePost` use-case,
  `reschedulePostAction`, and `QueueService.remove(jobId)` so delayed jobs can be cancelled and re-enqueued.
  Unit tests added for `hashtag-intelligence.ts` and `reschedule-post.ts`.
- `REQ-0079` **Graph API rate limiting** on `devin/req-0079-graph-api-rate-limiting-1786065200`:
  added `MetaRateLimitError` and a per-project 200 calls/hour fixed-window limit to every outbound
  `graph.facebook.com` request made by `GraphApiMetaService`. Uses the shared `rateLimit` helper with
  `RateLimitStore` (Redis in production, in-memory fallback in dev/tests) keyed by `meta:graph:<projectId>`.
  Unit tests added in `src/modules/meta/infrastructure/meta.service.test.ts`.

- `REQ-0079` **Trending Reels / Audio Analysis (T-071)** on `devin/req-0079-trending-reels-1786006431`:
  added `makeAnalyzeTrendingReels` AI use-case and exported it from `ai/server`; `MarketingInsightsService`
  fetches recent `REEL` `MediaPost` rows (last 30 days), calls the AI for niche pattern detection, and stores
  a `TrendSnapshot` of type `NICHE` plus up to three `ContentRecommendation` rows of type `REEL`. New
  `TrendingReelsAnalyzed` domain event is registered in `event-registry.json`. Added
  `analyzeTrendingReelsAction` (tenant-guarded + AI usage-guarded), `AnalyzeTrendingReelsForm`, and wired
  the `/stores/[projectId]/analytics/trends` page so users can analyze a niche and get AI recommendations.
  Unit tests added for `analyze-trending-reels.ts`.

- `REQ-0080` **Unified Messaging Board — manual reply + AI channel gating** on `devin/req-0080-unified-messaging-send-1785995189`:
  added `sendMessage` use-case in `conversations/application/send-message.ts` that appends a `HUMAN`/`AI`
  message and routes `INSTAGRAM`/`FACEBOOK` replies through `MetaService.sendMessage`; wired it in the
  `conversations` container using `metaService`; added `sendConversationMessageAction` with `tenantGuard`
  validation and a `ConversationMessageForm` component rendered on `/stores/[projectId]/conversations/[conversationId]`
  when the conversation is `HUMAN_ACTIVE`. `ai.generateReply` now reads the conversation's `channelSettings`
  from `AIConfiguration` and returns an empty reply without calling the LLM when the channel is disabled
  or the current time is outside the configured business hours. Unit tests added for `sendMessage` and
  `generateReply` channel gating. WhatsApp webhook/sender remains deferred.
- **fix(conversations):** `makeSendMessage` now returns `{ message, delivered }` so the action and UI can
  distinguish a persisted message from a successful channel delivery; the form shows an amber warning
  "Saved, but delivery to the channel failed" when `MetaService.sendMessage` throws, instead of a green
  "Message sent." confirmation.

- `REQ-0089` **Intelligence Layer — plan-tier gating** on `devin/req-0089-intelligence-layer-1785995189`:
  added `canUseIntelligenceFeature(plan, feature)` in `intelligence/domain/access.ts` with unit tests;
  added `plan` to `SessionUser` so all pages/actions can read the current plan without an extra DB call;
  gated `askBusinessBrainAction`, `getRecommendationsAction`, `getPredictionsAction`, `getHypothesesAction`,
  `getBusinessLearningAction`, `getTodayActionsAction`, `getGoalsAction`, `getBusinessBrainContextAction`,
  and the mutating actions `createGoalAction`, `createGoalAutomationAction`, `createGoalPlanWorkflowAction`,
  `launchGoalPlanWorkflowAction`, `approveRecommendationAction`, `executeActionPlanAction`,
  `completeDailyActionAction`, and `skipDailyActionAction`.
  Free users see `dailyBrief` only; Pro users unlock Marketing Brain, Next Best Action, Signal Detection,
  Hypotheses, and Business Learnings; Business adds `predictions`. The `/business-brain` page shows an
  upgrade card for Free users and the `/stores/[projectId]/daily-marketing` page hides Actions,
  Opportunities, and Market Signals for Free users.

- `REQ-0081` **AI Assistant & Tools — Batch 2** on `devin/req-0081-batch2-tools-coupon-ui-1786020000`:
  implemented the `ToolExecutor` with guardrail enforcement from `AIConfiguration.enabledSkills` and
  `salesRules`; added `completeWithToolCalls` to the `AIProvider` contract and implemented it in
  `OpenRouterProvider`; the chat assistant now runs a tool loop for `createCoupon`, `injectCoupon`,
  `sendMessage`, `queryAnalytics`, and `generateDashboard`. Real-time coupon flow supports creating a
  coupon, pushing it to the connected e-commerce platform, generating an attribution checkout link, and
  sending it to a customer. Fixed PR #159 streaming delta parsing (empty/partial replies were being saved),
  `AI_TOOLS` domain/infrastructure type leak, and `updateTitle` crash on a deleted session.
  Added a full-screen chat UI at `/chat` with message bubbles, streaming replies, basic markdown rendering,
  and a session history sidebar with create/rename/delete. Also fixed `sendChatMessageAction` message
  duplication in the tool loop and `ChatMessageRecord.toolCalls` typing.


- `REQ-0087` **Super Admin Panel — Batch 1 (user management + system health)** on `devin/req-0087-super-admin-panel-1785984848`:
  added `User.suspendedAt` and `User.banned` columns with migration; auth `authorize()` and `getCurrentUser()`
  reject suspended/banned accounts; `UserProfile` includes `plan` and moderation state; super-admin `/admin/users`
  page supports search, role/superAdmin/plan/status filters, pagination, and suspend/ban toggle actions with audit logs;
  new `/admin/users/[id]` detail page; new `/admin/health` dashboard shows user counts, 24h errors, BullMQ queue
  depth, and AI token usage/cost for 24h/7d/all-time via `aiQueries.summarizeTokenUsageTotal`. `TokenUsageRepository`
  gained `summarizeTotal`; `QueueService` gained `getJobCounts`.
- `REQ-0087` **Super Admin Panel — Batch 2 (impersonation)** on `devin/req-0087-batch2-impersonation-1785989634`:
  super admins can impersonate a non-super-admin user from `/admin/users/[id]`; the JWT stores `impersonatedUserId`
  and the `session` callback swaps the session to the target user (`isImpersonating`, `impersonatedBy`);
  `AppShell` displays an impersonation banner with an exit button; `exitImpersonationAction` returns the admin to their
  own session and writes `IMPERSONATION_ENDED` audit log entries. Admin `/admin*` routes are blocked while impersonating.
- `REQ-0082` + `REQ-0088` **Knowledge-base upload + Stripe billing lifecycle** on `devin/remaining-followups-0082-0088-1786060200`:
  added `AIConfiguration.productKnowledge` and `User.stripeCustomerId` columns with migrations;
  `extractKnowledgeBaseFiles` server action extracts PDF (via `pdfjs-dist`), Markdown, and text files
  and appends them to the AI knowledge base; `AISettingsForm` supports multi-file upload with a text
  preview; `ProductsSynced` event subscriber writes the product catalog into `productKnowledge` and
  `buildSystemPrompt` appends it to the system prompt. Stripe lifecycle completed with
  `createPortalSession` and `listInvoices` on `BillingService`/`StripePaymentGateway`, plus
  `/api/stripe/portal` and `/api/stripe/invoices` routes; `/settings/billing` now shows a
  "Manage subscription" button and paid invoice history. Worker path for `pdfjs-dist` resolved via
  `fileURLToPath`/`path.resolve` so PDF extraction works inside Next.js server actions.
- `REQ-0084` **Attribution & Checkout Links** on `devin/attribution-checkout-links-1785956172`:
  new `attribution` module with `AttributionLink` Prisma model, `makeCreateAttributionLink` use-case
  that builds checkout URLs with coupon auto-apply (platform-specific `couponUrlPattern`) + UTM parameters,
  `makeRecordConversion` that listens to `OrderSynced` events, matches coupon codes to links, increments
  conversion/revenue, and forwards to `MetaService.sendPurchaseEvent`; `GraphApiMetaService` sends
  server-side Meta Conversions API `Purchase` events with SHA-256 hashed `em`/`external_id`, stable
  `event_id` dedup, and `custom_data` (currency, value, line items); new
  `/stores/[projectId]/analytics/attribution` page and `AttributionLinkForm` to create links and view
  revenue per campaign, coupon, and channel.
- `REQ-0083` **Dashboard export review fixes** on `devin/fix-dashboard-export-review-1785961880`:
  added `/share` to `PUBLIC_PATHS` so shared dashboard links work for anonymous visitors;
  moved `DashboardSchema` import to the top of `analytics/application/ports.ts`; broadened
  `cross-tenant-action-census.test.ts` to scan all `*.actions.ts` files under `presentation/`;
  added a Zod schema validation to `createDashboardShareAction` so malformed dashboard snapshots
  are rejected before persistence.
- `REQ-0083` **Dashboard share follow-up fixes** on `devin/fix-dashboard-share-followup-1785965485`:
  fixed the cross-tenant action census filter so it still covers `presentation/actions.ts` and `actions.tsx`
  alongside `*.actions.ts` split files; moved the `DashboardSchema` Zod validator into
  `src/modules/ai/application/generate-dashboard.ts` as a discriminated union by widget `type`
  and re-exported it; `createDashboardShareAction` now uses the typed schema without a forced cast.
- `REQ-0070` **Phone verification (Package E)** on `devin/cleanup-task-status-1785946663`:
  added the `SmsSender` port with `ConsoleSmsSender` and `TwilioSmsSender` (Twilio REST API) adapters;
  `PhoneVerificationService` issues 6-digit OTPs with 10-minute expiry, 5-attempt cap, and 3-sends/hour
  rate limit; `/settings/account` renders a phone card when `SMS_PROVIDER` is not `disabled`; users can
  add, verify, and remove a phone number. Unit tests assert expiry, attempt cap, replay, rate-limit,
  and that the OTP body never reaches the logs.
- `REQ-0070` **Session management (Package F)** on `devin/cleanup-task-status-1785946663`:
  minimal "sign out everywhere" implemented by bumping `User.tokenVersion`, writing an `AuditLog`
  entry, and calling `next-auth` `signOut` from the client to clear the current session and redirect
  to `/login`.
- `REQ-0070` **Super-admin reconciliation and settings cleanup (Package G)** on
  `devin/cleanup-task-status-1785946663`: `ensureSuperAdmin` now reconciles an existing super admin
  when `SUPER_ADMIN_RECONCILE=true`, updating the password hash, role, and phone and writing an
  `AuditLog` entry; super-admin MFA sends the code via SMS when `SUPER_ADMIN_PHONE` and an SMS
  provider are configured; the break-glass procedure is documented in `docs/operations.md`;
  `/settings` removes the four dead links (`/settings/quality`, `/settings/rollout`,
  `/settings/operating-model`, `/settings/unified-context`) and adds a test that every link resolves
  to an existing route.
- `REQ-0070` **Privacy / GDPR export** on `devin/cleanup-task-status-1785946663`: `phone` is included
  in the `UserDataExport`; account deletion erases `name`, `phone`, `phoneVerified`, `mobile`,
  `mobileVerified`, and `image` while preserving the original `email` for the 30-day recovery window
  and bumping `tokenVersion` to invalidate sessions; integration tests cover both behaviors.
- `REQ-0091` **Deterministic Analysis Engine (Batch 11)** on `devin/cleanup-task-status-1785946663`:
  wired `AIUsageGuard` into `inspectProfileAction` so AI-powered profile narration consumes one
  `monthlyAiReplies` entitlement; deterministic narrator remains the fallback when `OPENROUTER_API_KEY`
  is unset or the quota is exhausted.
- `REQ-0070` **Devin Review security fixes** on `devin/cleanup-task-status-1785946663`:
  phone OTPs now use a per-request random salt and user-scoped lookup, `verifyPhoneAction` is
  rate-limited, the 5-attempt cap is enforced on wrong guesses, and `phone-verification-form.tsx`
  JSX `pattern` attributes are fixed; account soft-delete preserves the original email so the 30-day
  recovery window works; super-admin MFA SMS only uses `SUPER_ADMIN_PHONE` or a verified
  `account.phone`; `.env.example` uses `TWILIO_FROM_NUMBER`; `SMS_PROVIDER=twilio` fails loudly at
  startup when credentials are missing. Adds migration `20260805165952_add_verification_request_salt`.
- `REQ-0091` **Deterministic Analysis Engine (Batch 1)** on `devin/deterministic-analysis-1785938129`:
  closed `AnalysisSpec` vocabulary, `validateSpec`, `UnsupportedOperationError`, and a safe
  `AnalysisEngine` dispatcher (`makeAnalysisEngine`); pure deterministic `single_post_analysis`
  operation with engagement-score/percentile/z-score/verdict evidence; refactored
  `analyze-media.ts` to compute `single_post_analysis` against the project's `MediaPost` baseline
  before asking the LLM to narrate `whyItWorked`/storyboard/suggestions; new `@/modules/analytics/pure`
  public barrel for side-effect-free analytics exports. Unit tests added for stats, single-post
  analysis, the engine, and `analyze-media`.
- `REQ-0076`–`0090` **Platform V2 Rewrite** — Owner/tenant mapping hotfix merged via PR #127.
  Canonical `User.userId`/`projectId` loaded from DB, onboarding sets owner `userId` to self, and
  owner/staff checks use `user.userId === user.id` with `isStaff()`.
- `REQ-0076`–`0090` **Platform V2 Rewrite** — Staff isolation and audit follow-up merged via PR #128.
  `/stores` and `/dashboard` scope staff by `projectId`, `/settings` lists all workspace members,
  `npm audit` findings fixed, M7 smoke-test `scripts/check-http-status.ts` restored, and
  `RootLayout`/`AppShell` fetch the session client-side so 404 bodies do not leak user/tenant data.
- `REQ-0077` **Invite member email resilience** merged via PR #129: `/settings` invite form no longer
  500s when the configured email provider cannot deliver. `sendInviteEmail` catches and logs
  provider errors, and `inviteOrganizationMemberAction` returns a friendly form error.
- `REQ-0090` **Phase 1 cleanup batch** on `devin/batch-2-cleanup-openrouter-1785936345`:
  deleted product CRUD actions/use-cases (`updateProduct`, `deleteProduct`, `bulkDeleteProductsAction`)
  and unused store lifecycle actions (`archiveStore`, `restoreStore`, `deleteStore`); replaced
  `OpenAIProvider` with `OpenRouterProvider` backed by `OpenRouterClient`; updated `env.ts`
  production-required secrets from `OPENAI_API_KEY` to `OPENROUTER_API_KEY`; help page now refers to
  OpenRouter model ids.
- `REQ-0086` **OpenRouter Integration** on `devin/ai-usage-tracking-1785936345`:
  completed T-062 by persisting `TokenUsage` rows per user/project/feature/model/day through
  `PrismaTokenUsageRepository` wired into `OpenRouterProvider`; added `/admin/ai-usage` super-admin
  dashboard showing totals, daily summary, and recent calls.
- `REQ-0091` **Deterministic Analysis Engine (Batch 2)** on `devin/deterministic-trends-1785939993`:
  `generate-trends.ts` now computes `predictedEngagementScore` from the percentile rank of the top
  recent posts, `predictedRevenue` from median order total, and `bestTimeToPost` from the
  deterministic `best_time` engine; parsed LLM output is overwritten with those deterministic
  values. Added `best_time` and `top_n` pure operations plus unit tests for both. `getBestTimeToPost`
  now accepts a generic `BestTimeMediaInput`/`BestTimeOrderInput` interface so the engine can call
  it without a Meta API round-trip.

### ✅ Done

- `REQ-0091` **Deterministic Analysis Engine (Batch 3)** on `devin/deterministic-operations-1785940945`:
  added pure deterministic `compare_period`, `anomaly_check`, and `correlation` operations to the
  `AnalysisEngine` vocabulary, with unit tests and public exports via `@/modules/analytics/pure`.
- `REQ-0091` **Deterministic Analysis Engine (Batch 4)** on `devin/deterministic-cohort-attribution-1785941345`:
  added pure deterministic `cohort_trend` (linear regression over time series) and
  `attribution_breakdown` (revenue/order aggregation by key) operations, with unit tests and
  public exports via `@/modules/analytics/pure`.
- `REQ-0091` **Deterministic Analysis Engine (Batch 5)** on `devin/deterministic-profile-quality-1785941725`:
  added pure deterministic `profile_quality` operation (audience authenticity, spam risk,
  engagement consistency, geo/content diversity) with unit tests and public exports via
  `@/modules/analytics/pure`.
- `REQ-0091` **Deterministic Analysis Engine (Batch 6)** on `devin/deterministic-resolver-1785941957`:
  added the `EmbeddingProvider` port, a dependency-free `KeywordEmbeddingProvider`, and
  `OperationResolver` that maps natural-language questions to typed `AnalysisSpec` values with
  confidence + unsupported fallback. Added golden snapshot tests for every implemented operation.
- `REQ-0091` **Deterministic Analysis Engine (Batch 7)** on `devin/deterministic-dashboard-wiring-1785942456`:
  wired `queryAnalytics` and `generateDashboard` to the deterministic engine, added a
  `DashboardSchema` transformer for KPI / line_chart / table widgets, and exposed everything through
  the `ai` public barrel.
- `REQ-0085 / REQ-0091` **Profile Inspector core** on `devin/deterministic-profile-inspector-1785943443`:
  added a new `inspector` module with `inspectProfile`, `ProfileFetcher`, and `ProfileNarrator`
  ports. The use-case computes deterministic audience quality (via `profileQuality`), engagement
  rate, top content, demographic estimates with confidence tiers, and a growth trend from follower
  snapshots. A deterministic narrator is included; Meta/OpenRouter adapters can be wired behind
  the ports later.

- `REQ-0091` **Deterministic Analysis Engine (Batch 9)** on `devin/deterministic-adapters-1785943819`:
  added `TransformersEmbeddingProvider` using `@xenova/transformers` with `local_files_only: true` and a
  keyword fallback when no local MiniLM model is configured; added `makeMetaProfileFetcher` and
  `makeOpenRouterProfileNarrator` adapters behind the `inspector` ports.

- `REQ-0091` **Deterministic Analysis Engine (Batch 10 — ready for review)** on `devin/inspector-ui-1785944504`:
  wired `makeMetaProfileFetcher` and `makeOpenRouterProfileNarrator` into `inspectProfileAction`; exposed
  `MetaService.getAccessToken` and `getAccountId` (server-only) and `aiProvider` from the `ai` server barrel;
  added `/stores/[projectId]/analytics/audience/inspector` page with a username form and deterministic
  results dashboard.

- `REQ-0083` **Business Intelligence (Batch 1)** on `devin/bi-dynamic-dashboard-1785946663`:
  added the `DynamicDashboard` React component in `src/components/dashboard` with inline-SVG
  renderers for KPI, line_chart, bar_chart, pie_chart, table, and sparkline widgets; grid sizes
  small/medium/large/full map to `col-span-3/6/9/12`; unit tests cover all widget types.

- `REQ-0083` **Business Intelligence (review fix)** on `devin/bi-review-fixes-1785946663`:
  clamped `PieChartWidget` sweep to 359.99° so a 100% slice no longer collapses to an empty SVG
  path; added `PieChartWidget.test.tsx` regression guard.

- `REQ-0083` **Business Intelligence (Batch 2)** on `devin/bi-dashboard-wiring-1785946663`:
  added `PrismaDatasetFetcher` for project-scoped analytics data, a `queryAnalyticsAction` server
  action that composes `resolveOperation` / `generateDashboard`, and `/analytics/dashboard` with an
  NL query input and `DynamicDashboard` output; all operations are read-only and tenant-scoped.

- `REQ-0083` **Business Intelligence (Batch 2 review fixes)** on `devin/bi-competitor-dashboard-1785953265`:
  fixed `top_n` empty results by reading `AnalysisSpec.topN`, corrected the `compare_period` previous
  window so it abuts the current range, included today's data by defaulting `dateRange` to end-of-day,
  replaced `as unknown as` operation casts with typed adapters, and injected `DatasetFetcher` from the
  composition root so the analytics application no longer depends on infrastructure.

- `REQ-0083` **Business Intelligence (Batch 3 / Phase 2)** on `devin/bi-competitor-dashboard-1785953265`:
  added `getCompetitorComparisonDashboard` and `getCompetitorComparisonDashboardAction` to aggregate
  all tracked competitors for a project, benchmark the workspace's own media, and surface project-scoped
  comparison insights; added `/stores/[projectId]/analytics/competitors` page with a workspace snapshot,
  insights list, and competitor table.

- `REQ-0083` **Business Intelligence (Batch 4 / Phase 2)** on `devin/bi-brand-mentions-1785953983`:
  added brand mention monitoring with `MentionSentimentAnalyzer` and `BrandMentionSource` ports,
  a heuristic analyzer, an `OpenRouterMentionSentimentAnalyzer` AI adapter with heuristic fallback,
  a `mentionService` with idempotent `syncMentions` and `listMentionsWithSentiment`,
  `syncMentionsAction` / `listMentionsWithSentimentAction`, and the
  `/stores/[projectId]/analytics/mentions` page with source badges, sentiment badges, confidence,
  and a sync button; linked the page from the project analytics hub.
- `REQ-0083` **Business Intelligence (Phase 4)** on `devin/bi-dashboard-export-1785954826`:
  added `DashboardShare` Prisma model and migration; `createDashboardShareAction` / `getDashboardShareByTokenAction`;
  `DashboardExportToolbar` on `/analytics/dashboard` for PNG image and PDF download using `html-to-image`
  and `jspdf`; public `/share/d/[token]` page rendering a read-only `DynamicDashboard` from the stored
  snapshot. Expired or missing tokens return 404.
- `REQ-0085` **Profile & Reel Inspector (plan gating + AI demographics)** on `devin/profile-inspector-plan-gating-1785969034`:
  aligned `Plan` enum and `PLAN_LIMITS` to `FREE`/`PRO`/`BUSINESS` (matching the Prisma `User.plan` enum);
  added `User.profileInspectionsToday`/`profileInspectionsResetAt` and atomic `incrementProfileInspections`;
  `inspectProfileAction` consumes one daily profile-inspection entitlement before running.
  Added a `DemographicEstimator` port, `makeOpenRouterDemographicEstimator` (LLM estimation from comments,
  posting times, hashtags, locations with deterministic fallback), and wired it into `inspectProfile`.
  Updated `pricing-cards.tsx` to render `PRO` and `BUSINESS` tiers. All quality gates pass.
- `REQ-0088` **Billing & Plans (enforcement + billing page)** on `devin/billing-plans-enforcement-1786001020`:
  extended `PLAN_LIMITS` with `maxCompetitors`, `maxAttributionLinksPerMonth`, `maxContentSchedulesPerMonth`,
  and `allowedModels`; added `organizationUsage.checkLimit`/`getPlanLimits`; wired plan enforcement into
  `trackCompetitorAction` (via `TrackedAccountRepository.countByStore`) and `createAttributionLinkAction`
  (via `AttributionLinkRepository.countByProjectThisMonth`); upgraded `/settings/billing` to show the
  current plan, a `PLAN_LIMITS` matrix with store-usage progress bars, and upgrade `PricingCards`.
- `REQ-0082` **AI Setup & Configuration** on `devin/billing-plans-enforcement-1786001020`:
  extended `AIConfiguration` with `aiName`, `brandVoice`, `language`, enabled skills, sales guardrails,
  channel settings, escalation rules, per-skill OpenRouter `modelOverrides`, and a `knowledgeBase`.
  Added pure `buildSystemPrompt()` with variable interpolation and a full AI settings form on
  `/stores/[projectId]`. `generate-reply` now selects `modelOverrides.reply` and serializes guardrails
  into the prompt. PDF/MD knowledge-base file upload is still open.

### ✅ Done

- `REQ-0087` **Super Admin Panel — Batch 3 (plan CRUD, payment refunds, adapter library)** on `devin/req-0087-batch3-plan-payments-adapters-1785991741`:
  added `PlanConfig` Prisma model and migration; `planConfigService` with DB-driven plan limits that
  fall back to `PLAN_LIMITS`; updated `createStore`, `inviteMember`, and `organizationUsage` to resolve
  limits from `PlanConfig`; new `/admin/plans` page with editable feature-limits and pricing per tier.
  Extended `PaymentGateway`/`BillingService` with `createRefund` and `paymentIntentId` on invoices;
  new `/admin/payments` page lists paid invoices across organizations and lets super admins issue refunds.
  Added `IntegrationRepository.findAll`/`findById`/`updateStatus` and an `AdapterLibraryService`;
  `/admin/adapters` lists all `EcommerceConnection` rows with provider, status, last sync, and actions to
  approve/flag or validate the adapter connection against the live connector.

### ✅ Done

- `REQ-0081` **AI Assistant & Tools — Batch 1** on `devin/req-0081-batch1-chat-sessions-tools-1785993500`:
  added `ChatSession` / `ChatMessage` Prisma models and migration, `PrismaChatSessionRepository`,
  `ChatAssistantService` with create/list/rename/delete, `sendChatMessageAction`, and a new
  `POST /api/chat/stream` SSE endpoint backed by `OpenRouterProvider.stream`. Added `AI_TOOLS`
  function-calling schema for `createCoupon`, `injectCoupon`, `sendMessage`, `queryAnalytics`,
  and `generateDashboard`.

### ✅ Done

- `REQ-0079` **Meta Growth Engine — Meta OAuth flow (T-021)** on `devin/batch-meta-oauth-doc-closeouts-1786007775`:
  added `getMetaOAuthUrl`, `exchangeMetaOAuthCode`, and `fetchInstagramAccount` in
  `src/modules/meta/infrastructure/meta-oauth.ts`; new `GET /api/meta/auth` and `GET /api/meta/callback`
  route handlers exchange the short-lived code for a long-lived user token, resolve the connected
  Facebook Page and its Instagram Business account, and persist the page access token (encrypted at
  rest) on the `Project` row. Added `MetaConnectionCard` to `/stores/[projectId]/settings` with a
  Connect/Reconnect button. Unit tests added in `src/modules/meta/infrastructure/meta-oauth.test.ts`.

- `REQ-0090` **Cleanup & Migration closeout** on `devin/batch-meta-oauth-doc-closeouts-1786007775`:
  verified all Phase 1 acceptance criteria are met (old Organization/Store/Staff/StoreIntegration
  models removed, `src/modules/organizations/` deleted, product CRUD and standalone orders view
  removed, direct OpenAI imports replaced by `OpenRouterProvider`, queries migrated to
  user/workspace/project scope, all quality gates passing). Updated the requirement to reflect that
  hardcoded connector files were replaced by `EcommerceConnector` provider implementations rather than
  deleted, and promoted status to `Implemented`.

- `REQ-0070` **Identity/Account Self-Service task sync** on `devin/batch-meta-oauth-doc-closeouts-1786007775`:
  aligned `TASK-0070` and `TRACKER-0070` with the implemented state; recorded the F.2 decision to use
  minimal session management (bump `tokenVersion` on sensitive changes) and marked the optional
  full `UserSession` list (F.3) as N/A.

- `REQ-0080` **Unified Messaging Board closeout** on `devin/closeout-deferred-requirements-1786070000`:
  Instagram DM + Facebook Messenger manual replies and AI auto-reply gating are in production; T-078
  WhatsApp Business API webhook + sender is **deferred** to post-Meta-Business-verification.

- `REQ-0079` **Meta Growth Engine closeout** on `devin/closeout-deferred-requirements-1786070000`:
  content publishing, scheduling, hashtag intelligence, best-time-to-post, trending reels/audio analysis,
  Graph API rate limiting, and Meta Login OAuth are in production; T-022 WhatsApp Business API connection
  is **deferred** to post-Meta-Business-verification.

- `REQ-0069` **Low-severity findings closeout** on `devin/closeout-deferred-requirements-1786070000`:
  event census, navigation reachability, log-level gating, Fly.io machine policy, and case-insensitive
  escalation marker are implemented; L5 memory sizing is **deferred** to post-launch ops traffic.

- `REQ-0068` **Medium-severity hardening closeout** on `devin/closeout-deferred-requirements-1786070000`:
  readiness endpoint, telemetry, inbox query bounds, Shopify GDPR webhooks, Stripe API version pinning,
  HTTP status correctness, accessibility, encryption key rotation, login throttling, admin page guards,
  `/support` routing, and AI prompt-injection hardening are implemented; M5.7 Shopify App Store automated
  compliance checks are **deferred** to production app-store submission.

- `REQ-0078` **Dynamic E-Commerce Adapters — Batch 2** on `devin/req-0078-dynamic-adapters-batch2-1786086000`:
  new `/stores/[projectId]/integrations/adapter` UI for AI-generated `AdapterConfigMapping`,
  `GeneratedAdapter` model with encrypted credential persistence, `IntegrationConnectorFactory` dynamic
  `ConfigInterpreter` resolution, and removal of the WooCommerce/BigCommerce hardcoded connectors.

- `REQ-0078` **Dynamic E-Commerce Adapters — Batch 3** on `devin/req-0078-shopify-adapter-mapping-1786018026`:
  `ConfigInterpreter` now supports multi-step endpoints with variable extraction and optional lookup
  matching, the built-in Shopify mapping implements two-step coupon creation and price-rule disable, and
  `shopify.connector.ts` has been deleted. Shopify stores resolve through the same `ConfigInterpreter` safe
  executor as dynamically generated adapters.

- `REQ-0067` **H10 seat-limit retry hardening** on `devin/fix-seat-limit-concurrency-1786017547`:
  `PrismaOrganizationInviteRepository.createWithinSeatLimit` now retries Postgres `P2034` serialization
  failures 5 times with exponential backoff + jitter, eliminating the flaky CI concurrency failure on the
  `teamSeats + 5` parallel invite integration test.

- **Review-fixes / tracker honesty** on `devin/review-fixes-deferred-1786018765`:
  `scripts/task-status.ts` now supports `- [d]` deferred checklist markers and excludes deferred items from
  the active "Left" count. All previously-ticked deferred/N/A items across `REQ-0068`, `REQ-0069`,
  `REQ-0070`, `REQ-0079`, and `REQ-0080` trackers have been restored to `[d]`. The `OnlineStatus` banner
  no longer falsely claims offline replies will be queued.

- `REQ-0079` **Content scheduling review fixes** on `devin/review-fixes-scheduling-1786019300` and
  `devin/review-fixes-scheduling-followup-1786021000`:
  `scheduledAtTimezone` is now validated with `isValidTimeZone` in the Zod schemas and `formatInTimeZone`
  returns the resolved zone so the displayed time label always matches the rendered time; `InMemoryQueue`
  re-arms its `setTimeout` for delays beyond `MAX_TIMEOUT_MS` instead of capping and firing early,
  cleans up fired timers to avoid unbounded growth, and no longer uses `as string` casts; and
  `publishScheduledPost` re-enqueues early invocations with the remaining delay (or short-sleeps when
  within 5 seconds) instead of silently returning, so a scheduled post is never abandoned.

### 🚧 In Progress

- No active in-progress items.

### ⏭️ Next

- `REQ-0075` **Release engineering / DR / observability** — GitHub Environments, Fly.io staging/prod
  approval gates, rollback rehearsal, load/accessibility testing, and operations dashboard.
- `REQ-0067` **Release blockers (staging verification)** — end-to-end staging run, browser login on a
  proxied deployment, and final §1.6 release-condition sign-off.

### 🧹 Legacy Docs Cleanup (2026-08-05)

Audited every pre-V2 requirement (`REQ-0001`–`REQ-0075`) against the new V2 scope so the backlog
reflects what is actually being built next. No historical content was deleted — old REQ/TASK/TRACKER
files are kept for reference with a `⚠️ SUPERSEDED` banner and status pointing to their V2 replacement.

**18 requirement trios marked Superseded** (REQ + TASK + TRACKER, 54 files total):

| Old REQ | Superseded by |
|---------|---------------|
| REQ-0001 Auth | REQ-0076 |
| REQ-0002 E-Commerce Connector | REQ-0078 |
| REQ-0003 Meta Integration | REQ-0079 |
| REQ-0004 AI Assistant | REQ-0081 |
| REQ-0008 Human Takeover | REQ-0080 |
| REQ-0011 Users/Organizations/Stores | REQ-0077, REQ-0090 |
| REQ-0014 Executive Dashboard | REQ-0083 |
| REQ-0016 Unified Inbox | REQ-0080 |
| REQ-0018 Content Studio MVP | REQ-0079 |
| REQ-0020 Store Analytics | REQ-0083 |
| REQ-0033 Unified Intelligence Layer | REQ-0089 |
| REQ-0052 Super Admin (workspace/project auth) | REQ-0087 |
| REQ-0060 Meta-First Product Reframing | REQ-0090 |
| REQ-0065 Remaining Intelligence Completion | REQ-0089 |
| REQ-0070 Identity Self-Service | REQ-0076 |
| REQ-0071 Billing & Monetization | REQ-0088 |
| REQ-0072 Platform Admin & Discoverability | REQ-0087 |
| REQ-0073 Projects/Workspace Lifecycle | REQ-0077 |

**5 requirements kept active, unrelated to the architecture rewrite** (security hardening, test
coverage, release engineering) — flagged with a note that any finding referencing
`Organization`/`Store`/`Project` must be re-verified once `REQ-0090` lands:
`REQ-0067`, `REQ-0068`, `REQ-0069`, `REQ-0074`, `REQ-0075`.

**Backlog gap check:** cross-referenced all 77 planned tasks (`T-001`–`T-077`) against the 15 new
TASK files. 6 tasks from the original plan were missing from every TASK/TRACKER file and have been
added:

| Task | Description | Added to |
|------|-------------|----------|
| T-007 | Run Prisma migration (generate + apply new schema) | TASK/TRACKER-0090 |
| T-069 | Content calendar UI (visual grid, drag-to-reschedule) | TASK/TRACKER-0079 |
| T-070 | Brand mention monitoring (Mentions API + AI sentiment) | TASK/TRACKER-0083 |
| T-071 | Trending reels/audio analysis (AI niche pattern detection) | TASK/TRACKER-0079 |
| T-072 | Competitor tracking UI (comparison dashboard) | TASK/TRACKER-0083 |
| T-075 | Mobile PWA optimization (responsive messaging, offline) | TASK/TRACKER-0080 |

All 77 tasks are now covered by exactly one TASK/TRACKER pair — verified by script, no duplicates,
no gaps.

### 📋 Platform V2 Requirements (REQ-0076 through REQ-0090)

15 new requirements covering the complete product rewrite:

| REQ | Title | Phase | Status |
|-----|-------|-------|--------|
| REQ-0076 | Auth & Registration Overhaul | 1 | Draft |
| REQ-0077 | Workspace & Project System | 1 | Draft |
| REQ-0078 | Dynamic E-Commerce Adapters | 2 | Draft |
| REQ-0079 | Meta Growth Engine | 2 | Draft |
| REQ-0080 | Unified Messaging Board | 2 | Draft |
| REQ-0081 | AI Assistant & Tools | 3 | Draft |
| REQ-0082 | AI Setup & Configuration | 3 | Draft |
| REQ-0083 | Business Intelligence | 3 | Draft |
| REQ-0084 | Attribution & Checkout Links | 2 | Implemented |
| REQ-0085 | Profile & Reel Inspector | 3 | Implemented |
| REQ-0086 | OpenRouter Integration | 1 | Draft |
| REQ-0087 | Super Admin Panel | 4 | Draft |
| REQ-0088 | Billing & Plans | 4 | In Progress |
| REQ-0089 | Intelligence Layer | 4 | Draft |
| REQ-0090 | Cleanup & Migration | 1 | Draft |
| REQ-0091 | Deterministic Analysis Engine (AnalysisSpec) | 3 | Draft |

77 implementation tasks (T-001 through T-077) across 4 phases, plus 11 tasks (T-078 through T-088)
added by REQ-0091. Full task list in each TASK file. Trackers in `docs/trackers/TRACKER-0076`
through `TRACKER-0091`.

### 🔬 Deterministic Analysis Engine (REQ-0091, 2026-08-05)

Added a requirement + task + tracker for a three-layer analytics pipeline so **every metric shown to
a user is computed by auditable code, and the LLM is used only to explain results — never to produce
numbers**:

- **Deterministic layer** — pure functions for percentile rank, z-score/EWMA anomaly detection,
  attribution, correlation, cohort trends, engagement scoring.
- **Small-model layer** — local MiniLM embeddings + BM25 (no Python service, no network at
  inference) to map a natural-language question to a whitelisted operation.
- **LLM layer** — narration only; receives computed numbers as immutable facts.

The connective tissue is `AnalysisSpec`: the AI picks one operation from a **closed vocabulary** and
emits a validated spec — it never writes or runs code. A safe `AnalysisEngine` executes it within
project scope. Same security posture as REQ-0078's ConfigInterpreter (no `eval`, hard tenant
boundary, no hallucinated metrics, reproducible via golden tests).

**Audit of implemented code** (recorded in REQ-0091 §9):

- *Already deterministic, no change needed* — `best-time-to-post.ts`, `prediction.ts`,
  `detection.ts`, `competitor-benchmark.ts`, `marketing-analytics.ts` (rule-based, calibration
  labels, evidence trails). They become reference implementations for the engine.
- *Needs modification, LLM currently invents numbers* — `analyze-media.ts` (LLM decides if/why a
  post worked with no baseline → **T-085**) and `generate-trends.ts` (LLM invents
  `predictedEngagementScore`/`predictedRevenue`/`bestTimeToPost` → **T-086**). Profile Inspector to
  be built deterministic-first → **T-087**.

New tasks **T-078–T-088** (engine core, resolver, narration, tool wiring, the three modifications,
golden tests). REQ-0081/0083/0079/0085/0089 cross-referenced as augmented by REQ-0091.

### ✅ Done

- **`REQ-0070` Package D — Change password and email from settings:**
  - Added `changePasswordService` in `src/modules/auth/application/change-password.ts` requiring the
    current password and enforcing the 8–200 character policy.
  - Added `changeEmailService` in `src/modules/auth/application/change-email.ts` for two-step email
    change: confirmation to the new address and a notice to the old; the new address is marked
    verified and `tokenVersion` is bumped only after the link is consumed.
  - `changePasswordAction` and `requestEmailChangeAction` in `src/modules/auth/presentation/actions.ts`
    are rate-limited (5/hour and 3/hour per user respectively), require `getCurrentUser()`, and
    write `AuditLog` entries.
  - Added `AccountRepository.updateEmail` and reused `updatePassword` (which already increments
    `tokenVersion`) in `src/modules/auth/infrastructure/account.repository.ts`.
  - Updated `src/app/verify-email/page.tsx` to handle `email_change` tokens, confirm the change, and
    refresh the current session via `unstable_update`.
  - Added `src/components/account-security-forms.tsx` with change-password and request-email-change
    forms on `/settings/account`.
  - Unit tests cover wrong current password, non-revealing "address already in use", token reuse, and
    successful email change.

- **`REQ-0070` Packages B–C — Registration hardening and email verification at signup:
  - Added `confirmPassword` refinement to the registration schema and `AuthForm` with inline mismatch validation.
  - Added optional E.164 `phone` validation in `src/modules/auth/domain/phone.ts` and wired it through `registerUser`/`registerAction` and `AuthForm`.
  - Added `passwordRuleDescription()` and password min/max (8–200) feedback in the registration UI.
  - Added `verifyTurnstileToken` in `src/modules/auth/infrastructure/turnstile.ts` (server-side, no-op when `TURNSTILE_SECRET_KEY` is unset) and rendered the Turnstile widget in `AuthForm`.
  - `registerAction` is enumeration-safe: existing emails return the same "check your email" message and trigger a "someone tried to register" notification.
  - New `EmailVerificationService` issues a 32-byte token, stores only `SHA-256(tokenHash)` in `VerificationRequest` with a 24-hour expiry, and sends a `/verify-email?token=...` link.
  - Added `src/app/verify-email/page.tsx` with distinct success/invalid/expired messages and a link back to `/login`.
  - `authorize` returns `UnverifiedEmailError` (`code: "unverifiedEmail"`) when `REQUIRE_EMAIL_VERIFICATION` is true and the credential user is unverified; `loginAction` pre-empts this and renders a resend affordance.
  - `resendVerificationEmailAction` is rate-limited to 3 attempts per hour per address.
  - `requireVerifiedEmail()` blocks AI actions (`src/modules/ai/presentation/actions.ts`), `createStoreAction`, and Stripe checkout (`/api/stripe/checkout`).
  - Added unit tests for `password-policy` and `register-user` and integration tests for `PrismaVerificationRequestRepository` and `requireVerifiedEmail`.

- **Audit gap closure — M9 Encryption:**
  - Replaced the single SHA-256 pass in `src/shared/security/encryption.ts` with HKDF (`deriveKey`) to derive a 256-bit AES-GCM key.
  - Versioned new ciphertexts as `enc:v2:<base64(iv||ciphertext)>` while preserving `enc:` (legacy v1 SHA-256) and plaintext passthrough.
  - Added `ENCRYPTION_KEY_PREVIOUS` to `src/shared/config/env.ts`; `decryptString` retries with the previous key before failing, enabling key rotation without downtime.
  - Added `scripts/reencrypt-credentials.ts` to re-encrypt `Integration.accessToken` and `refreshToken` values during a rotation.
  - Documented the full rotation procedure in `docs/operations.md`.
  - Updated `.env.example` to generate `ENCRYPTION_KEY` with `openssl rand -base64 48` and added `ENCRYPTION_KEY_PREVIOUS`.
  - Recorded the plaintext-passthrough removal date as 2026-09-01.
  - Tests cover v2 round-trip, legacy v1 decryption, previous-key decryption after rotation, and rejection of tampered ciphertext.

- **Audit gap closure — M10 Login throttling:**
  - Added `src/modules/auth/infrastructure/login-rate-limit.ts` with a per-IP (5 attempts / 15 min) and per-account (20 attempts / hour) fixed-window `authorize` guard.
  - `RateLimitError` extends `CredentialsSignin` with code `rateLimit`; `loginAction` renders "Too many attempts. Try again in N minutes." for lockouts.
  - Invalid/missing credentials and rate-limited attempts both return generic messages that do not reveal whether an account exists.
  - Added `RATE_LIMIT_IP_HEADER` to `src/shared/config/env.ts` `PRODUCTION_REQUIRED`, `.env.example`, and `docs/deployment.md`.
  - Tests cover per-IP engagement, global engagement across rotating IPs, and refusal of a correct password while locked out.

- **Audit gap closure — M15 AI prompt-injection and output moderation:**
  - Added `src/modules/ai/domain/prompt-safety.ts` with `sanitizePromptFragment`, `escapePromptDelimiters`, `wrapUserMessage`, and `wrapExternalData` (pure, no IO).
  - `generate-reply.ts` `buildSystemPrompt` now instructs the model that `<<<USER_MESSAGE>>>` and every `<<<DATA>>>` region are untrusted data, not instructions, and that discounts must come from `<<<COUPONS>>>`.
  - `generate-welcome.ts` wraps `TONE`, `MESSAGE_TEMPLATE`, `FOLLOWER`, and `COUPON` as external data and sanitises the configured system prompt.
  - `OpenAIProvider.sanitize` wraps user messages with `wrapUserMessage` and escapes `&`/`<`/`>`.
  - Added `ContentModerator` / `ModerationResult` port in `src/modules/ai/application/content-moderation.ts`; `OpenAIProvider` implements it with the OpenAI moderations endpoint.
  - `generateReply` withholds flagged output, logs `ai.reply.moderationBlocked` with categories only, writes an audit log without PII, and escalates to a human before any Meta send.
  - Adversarial unit tests cover delimiter injection in a product title, system-prompt exfiltration via merchant configuration, instruction override, unauthorised discount guard, and abusive output blocked by moderation.

- **Audit gap closure — M8 Accessibility:**
  - Added a skip link in `src/app/layout.tsx` as the first focusable element in `<body>`, targeting `<main id="main-content" tabIndex={-1}>`.
  - Updated `src/components/app-shell.tsx` so both authenticated and unauthenticated `<main>` elements expose `id="main-content"` and `tabIndex={-1}`.
  - Collapsed sidebar links now use `aria-label={item.label}` while keeping the icon `aria-hidden="true"` so screen readers still announce the destination.
  - Replaced the hand-rolled mobile drawer with a Radix `Dialog` (`@radix-ui/react-dialog`) that moves focus into the drawer on open, traps focus, closes on `Escape`, restores focus to the trigger, and exposes a screen-reader-only title and description.
  - Manually verified the skip link, collapsed-sidebar labels, Tab order, and colour-contrast spot-check (primary and muted surfaces pass WCAG AA thresholds).

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
