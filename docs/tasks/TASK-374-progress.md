# Task 374 Progress — Daily Marketing Operating Rhythm

Spec: `docs/specs/0050-daily-marketing-operating-rhythm.md`

## Behavioral cohesion

- [x] Extend `MarketingMemory` to produce `Journey` touchpoints and feed `DailyAction` generation.
      (Memory winning-times/top-product feed `dailyActionService.generate`; journey touchpoints
      are produced from Meta/coupon/referral domain events.)
- [x] Update `ai/generatePostIdeas` to consume `DailyAction` objectives and `Journey` context.
- [ ] Update `inbox` / `conversations` to surface `DailyAction` opportunities from DM patterns.
      (DM events now feed journeys; surfacing actions in the inbox UI is follow-up.)
- [ ] Update `coupons/campaigns` to suggest campaigns aligned with today’s objective.
- [ ] Update `analytics` to push competitor/market signals into `DailyAction` inputs.
      (Competitor insights already flow into recommendations → daily actions; explicit analytics
      push is follow-up.)

## Operational workflow

- [x] Add `DailyAction` and `ActionOutcome` Prisma models and migration.
- [x] Implement `dailyActionService.generate`, `complete`, `skip`.
- [x] Implement `actionOutcomeService.measure` with configurable window.
- [x] Make `dailyActionService.complete` resilient to stores without eCommerce integration (metric provider maps `StoreNotConnectedError` to `0` so completion succeeds).
- [x] Surface the **Today** feed on the dashboard (`TodayFeed`, `TodayActionCard`, objective/confidence UI).
- [x] Wire `completeDailyActionAction` and `skipDailyActionAction` server actions.
- [x] Make `/business-brain` the central ask-anything surface with source citations.

## Decision quality

- [x] Add `BusinessObjective` enum and objective tagging to `Recommendation`.
- [x] Add `confidence`, `reasoning`, `marketContext`, `competitorContext`, `selfContext` to `Recommendation`.
- [x] Implement `recommendationService.recalculateConfidence` triggered by new signals.
- [x] Implement `RecommendationConflict` resolver that considers objective + confidence.
- [x] Add market-trend vs competitor-advantage vs self-mistake diagnosis in competitor/analytics.

## Journey-level attribution

- [x] Add `Journey` and `JourneyStep` Prisma models and migration.
- [x] Implement `journeyService.appendTouchpoint` for `POST_VIEW`, `PROFILE_VISIT`, `DM`, `COUPON_SENT`, `ORDER`.
- [x] Link Meta media views, DMs, coupon sends, and orders into a single journey (via domain-event subscribers).
- [x] Add `/analytics/journeys` explorer UI.

## Production maturity

- [x] Add Vitest setup and domain unit tests (objective, daily-action, journey, billing).
- [x] Add service/server-action tests via in-memory fakes (daily-action, journey, create-store).
      (True DB-backed repository integration tests remain follow-up; CI runs a migration dry-run.)
- [x] Add `.github/workflows/ci.yml` (lint, typecheck, test, migration dry-run against Postgres service).
- [ ] Switch event bus and queue to Redis-backed implementations in production; validate on staging.
      (BullMQ/ioredis queue already available behind the queue registry; production wiring/docs remain.)
- [x] Add billing enforcement: store limits (enforced in `createStore`).
- [ ] Billing enforcement: AI reply quota + team seats (limits defined in `PLAN_LIMITS`; metering/enforcement follow-up).
- [ ] Complete tenant-isolation audit and add missing `organizationId` / `storeId` guards.
      (Daily-action mutations, journey queries, and store scoping guarded at server-action boundary.)
- [x] Add security headers (next.config) and API rate limiting (reusable `rateLimit` util + Stripe checkout).
