# Task 374 Progress — Daily Marketing Operating Rhythm

Spec: `docs/specs/0050-daily-marketing-operating-rhythm.md`

## Behavioral cohesion
- [ ] Extend `MarketingMemory` to produce `Journey` touchpoints and feed `DailyAction` generation.
- [ ] Update `ai/generatePostIdeas` to consume `DailyAction` objectives and `Journey` context.
- [ ] Update `inbox` / `conversations` to surface `DailyAction` opportunities from DM patterns.
- [ ] Update `coupons/campaigns` to suggest campaigns aligned with today’s objective.
- [ ] Update `analytics` to push competitor/market signals into `DailyAction` inputs.

## Operational workflow
- [ ] Add `DailyAction` and `ActionOutcome` Prisma models and migration.
- [ ] Implement `dailyActionService.generate`, `complete`, `skip`.
- [ ] Implement `actionOutcomeService.measure` with configurable window.
- [ ] Create/rewrite dashboard `/` as the **Today** feed (`TodayActionCard`, objective/confidence UI).
- [ ] Wire `completeDailyActionAction` and `skipDailyActionAction` server actions.
- [ ] Make `/business-brain` the central ask-anything surface with source citations.

## Decision quality
- [ ] Add `BusinessObjective` enum and objective tagging to `Recommendation`.
- [ ] Add `confidence`, `reasoning`, `marketContext`, `competitorContext`, `selfContext` to `Recommendation`.
- [ ] Implement `recommendationService.recalculateConfidence` triggered by new signals.
- [ ] Implement `RecommendationConflict` resolver that considers objective + confidence.
- [ ] Add market-trend vs competitor-advantage vs self-mistake diagnosis in competitor/analytics.

## Journey-level attribution
- [ ] Add `Journey` and `JourneyStep` Prisma models and migration.
- [ ] Implement `journeyService.appendTouchpoint` for `POST_VIEW`, `PROFILE_VISIT`, `DM`, `COUPON_SENT`, `ORDER`.
- [ ] Link Meta media views, DMs, coupon sends, and orders into a single journey.
- [ ] Add `/analytics/journeys` explorer UI.

## Production maturity
- [ ] Add Vitest/Jest setup and domain unit tests.
- [ ] Add integration tests for repositories and server actions.
- [ ] Add `.github/workflows/ci.yml` (lint, typecheck, test, migration dry-run).
- [ ] Switch event bus and queue to Redis-backed implementations in production; validate on staging.
- [ ] Add billing enforcement: store limits, AI reply quota, team seats.
- [ ] Complete tenant-isolation audit and add missing `organizationId` / `storeId` guards.
- [ ] Add security headers and API rate limiting.
