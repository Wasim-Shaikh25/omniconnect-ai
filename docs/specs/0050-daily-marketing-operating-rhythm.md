# Spec 0050: Daily Marketing Operating Rhythm

- **Module(s):** `intelligence`, `ai`, `analytics`, `conversations`, `coupons`, `content`, `organizations`, `notifications`, `app` (UI)
- **Status:** Draft
- **Owner:** wasim
- **Related task(s):** `docs/tasks/TASK-374-daily-marketing-operating-rhythm.md`
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary

Move OmniConnect from a **page-oriented feature set** to a **daily marketing operating rhythm**. A user opens the product, sees a prioritized list of actions for today, completes them, and the AI measures whether the business improved. Tomorrow's priorities are regenerated from those outcomes.

This spec turns the **Marketing Brain** into the central product identity, makes **Marketing Memory** the single source of truth for every module's decisions, and upgrades recommendations so they are objective-tagged, confidence-scored, and adaptive as new signals arrive. It also closes the production-maturity gaps required to ship reliably.

## 2. Goals

1. **Behavioral cohesion** — every module (Inbox, Content, Analytics, Campaigns, Competitor) consumes and contributes to `MarketingMemory`.
2. **Operational workflow** — the primary UX becomes “today’s priorities → act → measure → tomorrow’s priorities improve.”
3. **Decision quality** — recommendations map to business objectives, explain market-vs-competitor-vs-self causes, and update confidence as signals change.
4. **Journey-level attribution** — connect Reel → profile visit → DM → coupon → purchase → repeat purchase as a first-class `Journey` concept.
5. **Production maturity** — add automated tests, CI, Redis-backed event/queue scaling, billing enforcement, and complete tenant isolation.

## 3. Non-Goals

- No new major modules (e.g., Meta Ads automation, WhatsApp, TikTok) — this spec wires the existing modules together.
- No redesign of the visual identity or marketing website — those are handled.
- No manual human-in-the-loop moderation workflow beyond existing takeover/resume.

## 4. User Stories

- As a **store owner**, when I open OmniConnect I see the 3–5 most important actions for today ranked by expected business impact, so I know where to start.
- As a **store owner**, I can mark an action done (or skipped), and the AI remembers that feedback, so tomorrow’s suggestions improve.
- As a **store owner**, I can see *why* a recommendation matters: which objective it supports, the confidence level, and the signals behind it.
- As a **store owner**, I can ask “What changed in my market this week?” and the Brain explains market trends, competitor moves, and my own performance in context.
- As a **store owner**, I can see the full journey from a post to a purchase, not just the last click.
- As a **developer**, I can run a CI pipeline that validates lint, typecheck, tests, and migrations before merge.

## 5. Domain Model

### New / changed concepts

- `DailyAction` — one concrete, completable action for today.
  - Fields: `id`, `organizationId`, `storeId`, `title`, `description`, `objective` (`GROWTH`, `REVENUE`, `ENGAGEMENT`, `RETENTION`, `SUPPORT`, `BRAND`), `confidence`, `sourceSignals` (JSON), `suggestedAction`, `status` (`PENDING`, `DONE`, `SKIPPED`, `DISMISSED`), `completedAt`, `feedback`, `outcomeId`.
- `ActionOutcome` — result of completing or ignoring an action.
  - Fields: `id`, `actionId`, `organizationId`, `storeId`, `metricBefore` (JSON), `metricAfter` (JSON), `measuredAt`, `status` (`PENDING`, `IMPROVED`, `NO_CHANGE`, `WORSENED`, `CANCELLED`).
- `Journey` — a cross-touchpoint customer path.
  - Fields: `id`, `organizationId`, `storeId`, `customerId`, `externalUserId`, `touchpoints` (ordered list of `JourneyStep`), `outcome` (`PURCHASE`, `FOLLOW`, `INQUIRY`, `CHURNED`, `OPEN`), `attributedRevenue`, `createdAt`, `updatedAt`.
- `JourneyStep` value object — `{ type, externalId, occurredAt, channel, details }` (e.g., `POST_VIEW`, `PROFILE_VISIT`, `DM`, `COUPON_SENT`, `ORDER`).
- `ConfidenceScore` value object — `{ value: number (0–1), signals: number, updatedAt }`, owned by `Recommendation`/`Prediction`/`DailyAction`.
- `BusinessObjective` enum — `GROWTH`, `REVENUE`, `ENGAGEMENT`, `RETENTION`, `SUPPORT`, `BRAND`.

### Domain events

- `DailyActionsGenerated` — intelligence publishes the prioritized list.
- `DailyActionCompleted` / `DailyActionSkipped` — user completes or skips an action.
- `ActionOutcomeMeasured` — intelligence measures whether the action moved a metric.
- `JourneyUpdated` — a new touchpoint is appended to a customer journey.
- `ConfidenceChanged` — a recommendation/prediction confidence changed because of new signals.
- `RecommendationObjectiveTagged` — a recommendation is tagged with its objective and explains why.

## 6. Public Contract

### Ports exposed by `intelligence`

- `dailyActionService.generate(organizationId, storeId?) -> DailyAction[]`
- `dailyActionService.complete(actionId, feedback?) -> ActionOutcome`
- `dailyActionService.skip(actionId, reason?) -> void`
- `actionOutcomeService.measure(actionId) -> ActionOutcome`
- `journeyService.appendTouchpoint(input) -> Journey`
- `journeyService.getJourney(input) -> Journey`
- `recommendationService.tagObjective(recommendationId, objective, reason)`
- `recommendationService.recalculateConfidence(recommendationId)`
- `marketingMemory.updateMemory(organizationId, storeId?)` — already exists, extended to write into `Journey` steps and `DailyAction` inputs.

### Events consumed

- `DailyActionCompleted` → `intelligence` schedules `ActionOutcomeMeasured` after a configurable window.
- `ActionOutcomeMeasured` → `businessLearning.learnFromOutcome`.
- `NewMessage`, `MetaFollowReceived`, `MetaCommentReceived`, `OrderCreated` → `journeyService.appendTouchpoint`.
- `MarketingPerformanceUpdated`, `CompetitorBenchmarkReady` → `recommendationService.recalculateConfidence`.

## 7. Data / Persistence

### New tables

- `DailyAction`
- `ActionOutcome`
- `Journey`
- `JourneyStep` (can be a JSON column inside `Journey` or separate table; prefer separate table with `@@index([journeyId, occurredAt])`)

### Updated tables

- `Recommendation` — add `objective`, `confidence`, `reasoning`, `marketContext`, `competitorContext`, `selfContext`.
- `RecommendationConflict` — include `objective` and `confidence` when resolving conflicts.
- `BrainConversationMemory` — add `dailyActionId` and `outcomeId` references for Q/A context.

### Indexes

- `@@index([organizationId, status, createdAt])` on `DailyAction` for the today feed.
- `@@index([organizationId, storeId, customerId])` on `Journey`.
- `@@index([storeId, externalUserId])` on `Journey` for fast lookups from DMs/comments.

## 8. API / UI Surface

### New / updated pages

- `/` (dashboard) — becomes **Today** view: prioritized `DailyAction` cards, not a generic KPI grid.
- `/daily` (or keep `/dashboard` with a new layout) — list of today’s actions with a “Mark done / Skip / Ask Brain” action per card.
- `/business-brain` — becomes the central “Ask OmniConnect anything” surface; every answer cites the current `DailyAction` list, `MarketingMemory`, and `Journey` context.
- `/analytics/journeys` — journey explorer: search by customer, post, coupon, or order.
- `/settings/billing` — add usage meters (AI replies used, stores, team seats) tied to the `Plan`.

### Server actions / API

- `getTodayActionsAction()` — returns the pending `DailyAction[]` for the user’s org.
- `completeDailyActionAction(actionId, feedback)` — marks done and enqueues outcome measurement.
- `skipDailyActionAction(actionId, reason)` — marks skipped.
- `getJourneyAction(storeId, externalUserId | customerId)` — returns the journey.
- `askBrainAction(question)` — extends current implementation to include `DailyAction` context and answer with citations.
- `getRecommendationDetailAction(recommendationId)` — returns objective, confidence, reasoning, and signals.

### Components

- `TodayActionCard` — title, objective badge, confidence, signal summary, CTA, done/skip buttons.
- `ObjectiveBadge` — `GROWTH`, `REVENUE`, etc.
- `ConfidenceMeter` — visual confidence score with explanation.
- `JourneyTimeline` — horizontal timeline of touchpoints from post to order.
- `BrainAnswerPanel` — answer + source chips (Daily Brief, Memory, Journeys, Recommendations).

## 9. External Integrations

No new integrations. Existing ones are used more deeply:

- Meta Graph API for own media and competitor media (already used).
- Shopify/eCommerce connector for orders and coupons.
- OpenAI for daily brief, Brain answers, content ideas.
- Stripe for plan usage limits and billing (existing; add enforcement).

## 10. Edge Cases & Failure Modes

- No actions generated today → show a “Nothing needs attention” state with suggestions to connect more integrations or ask the Brain.
- Action completed but outcome cannot be measured within the window → mark `PENDING` and retry; after max window, mark `NO_CHANGE`.
- Multiple actions target the same customer/content → conflict resolver picks the higher-confidence / higher-objective-priority action; others are deferred.
- User marks many actions skipped → learn from skipped reasons and re-rank next day.
- Redis unavailable → in-memory queue and event bus still function for single-instance dev, but production requires Redis.

## 11. Security & Privacy

- All actions scoped by `organizationId`; `tenantGuard.assertStoreAccess` on store-specific actions.
- Journeys contain customer touchpoints; redact PII before showing in UI or sending to AI (as already done in `MarketingMemory`).
- `DailyAction` metadata can include signal summaries but not raw message text or customer identifiers unless necessary and permitted.
- Audit log every action completion, skip, and outcome measurement.

## 12. Testing Strategy

- **Domain unit:** confidence scoring, objective prioritization, journey merging, action-outcome matching.
- **Repository integration:** `DailyAction` CRUD, `Journey` step ordering, `Recommendation` confidence updates.
- **Server action integration:** `completeDailyActionAction` triggers queue job and outcome measurement.
- **E2E:** open dashboard, see today’s actions, complete one, ask Brain, see updated list tomorrow.
- **CI pipeline:** lint, typecheck, tests, `prisma migrate deploy` dry-run.

## 13. Acceptance Criteria

- [ ] `/dashboard` (or `/daily`) renders a prioritized list of `DailyAction` cards with objective, confidence, and CTA.
- [ ] User can complete or skip an action; the state persists and an `ActionOutcome` is scheduled.
- [ ] `MarketingMemory` feeds `DailyAction` generation and `Business Brain` answers.
- [ ] `Journey` records steps from `POST_VIEW` → `PROFILE_VISIT` → `DM` → `COUPON_SENT` → `ORDER`.
- [ ] Recommendations have `objective`, `confidence`, and `reasoning`; confidence updates when new signals arrive.
- [ ] Brain answers cite sources (Daily Brief, Memory, Journeys, Recommendations).
- [ ] Billing plan enforcement gates store count, AI reply volume, and team seats.
- [ ] CI pipeline runs lint, typecheck, tests, and migration dry-run on every PR.
- [ ] Redis-backed event bus and queue worker are documented and validated in a staging environment.
- [ ] Tenant isolation audit completed with explicit `organizationId` / `storeId` checks on all mutating actions.
- [ ] `CHANGELOG.md` and task tracker updated.

## 14. Open Questions

1. Should `DailyAction` generation run on a schedule (cron), on every dashboard load, or both with caching?
2. What is the default outcome measurement window: 24h, 48h, 7 days, or objective-specific?
3. Should `Journey` attribution be first-touch, last-touch, linear, or time-decay? Start with nearest-preceding-post for consistency with existing post-to-order attribution.
4. How should `GROWTH` vs `ENGAGEMENT` vs `BRAND` objectives be prioritized when they conflict? Default: revenue > retention > growth > engagement > brand > support, but make it configurable per workspace.
