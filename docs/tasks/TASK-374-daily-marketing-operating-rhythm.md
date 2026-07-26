# Task 374: Daily Marketing Operating Rhythm

- **Status:** Todo
- **Spec:** `docs/specs/0050-daily-marketing-operating-rhythm.md`
- **Module(s):** `intelligence`, `ai`, `analytics`, `conversations`, `coupons`, `content`, `organizations`, `notifications`, `app`
- **Owner:** wasim
- **Changelog entry:** Daily marketing operating rhythm: Today feed, Marketing Brain as product identity, Marketing Memory-driven decisions, confidence evolution, journey attribution, and production maturity.

## Description

Implement spec `0050`: turn OmniConnect from a collection of pages into a daily operating rhythm. The dashboard becomes a prioritized "Today" feed of completable actions. Marketing Memory feeds every module's decisions. Recommendations gain objective tags, confidence scores, and reasoning. Customer journeys connect post → profile visit → DM → coupon → purchase. Production maturity (tests, CI, Redis scaling, billing enforcement, tenant audit) is included.

## Subtasks

### Behavioral cohesion
- [ ] Extend `MarketingMemory` to produce `Journey` touchpoints and feed `DailyAction` generation.
- [ ] Update `ai/generatePostIdeas` to consume `DailyAction` objectives and `Journey` context.
- [ ] Update `inbox` / `conversations` to surface `DailyAction` opportunities from DM patterns.
- [ ] Update `coupons/campaigns` to suggest campaigns aligned with today’s objective.
- [ ] Update `analytics` to push competitor/market signals into `DailyAction` inputs.

### Operational workflow
- [ ] Add `DailyAction` and `ActionOutcome` Prisma models and migration.
- [ ] Implement `dailyActionService.generate`, `complete`, `skip`.
- [ ] Implement `actionOutcomeService.measure` with configurable window.
- [ ] Create/rewrite dashboard `/` as the **Today** feed (`TodayActionCard`, objective/confidence UI).
- [ ] Wire `completeDailyActionAction` and `skipDailyActionAction` server actions.
- [ ] Make `/business-brain` the central ask-anything surface with source citations.

### Decision quality
- [ ] Add `BusinessObjective` enum and objective tagging to `Recommendation`.
- [ ] Add `confidence`, `reasoning`, `marketContext`, `competitorContext`, `selfContext` to `Recommendation`.
- [ ] Implement `recommendationService.recalculateConfidence` triggered by new signals.
- [ ] Implement `RecommendationConflict` resolver that considers objective + confidence.
- [ ] Add market-trend vs competitor-advantage vs self-mistake diagnosis in competitor/analytics.

### Journey-level attribution
- [ ] Add `Journey` and `JourneyStep` Prisma models and migration.
- [ ] Implement `journeyService.appendTouchpoint` for `POST_VIEW`, `PROFILE_VISIT`, `DM`, `COUPON_SENT`, `ORDER`.
- [ ] Link Meta media views, DMs, coupon sends, and orders into a single journey.
- [ ] Add `/analytics/journeys` explorer UI.

### Production maturity
- [ ] Add Vitest/Jest setup and domain unit tests.
- [ ] Add integration tests for repositories and server actions.
- [ ] Add `.github/workflows/ci.yml` (lint, typecheck, test, migration dry-run).
- [ ] Switch event bus and queue to Redis-backed implementations in production; validate on staging.
- [ ] Add billing enforcement: store limits, AI reply quota, team seats.
- [ ] Complete tenant-isolation audit and add missing `organizationId` / `storeId` guards.
- [ ] Add security headers and API rate limiting.

## Acceptance Criteria

- [ ] Matches spec `0050` acceptance criteria.
- [ ] `npm run lint`, `npm run typecheck`, `npm run build` pass.
- [ ] New tests pass in CI.
- [ ] `CHANGELOG.md` and `TASK-374-progress.md` updated.

## Notes / Blockers

- This task is intentionally cross-cutting; keep PRs per slice (behavioral, workflow, journeys, maturity) so reviews stay small.
- Some modules (`reports`, `growth`, `branddeals`) are still Phase 2 scaffolding; only wire them if they already have public contracts.
