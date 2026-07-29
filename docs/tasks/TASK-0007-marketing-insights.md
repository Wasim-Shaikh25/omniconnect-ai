# TASK-0007: Meta Content Intelligence & Marketing Insights

- **Status:** Completed
- **Owner:** wasim
- **Module(s):** analytics, reports, meta, ai
- **Requirement:** `docs/requirements/REQ-0007-marketing-insights.md`
- **Tracker:** `docs/trackers/TRACKER-0007-marketing-insights.md`
- **Changelog entry:** See `CHANGELOG.md` (follow-up to TASK-0007).
- **Last updated:** 2026-07-29

## 1. Summary

Implementation task for REQ-0007. The marketing-insights domain, repository, service, server actions, dashboard pages, and AI “why it worked” storyboards are now in place.

## 2. References

- Requirement: `docs/requirements/REQ-0007-marketing-insights.md`
- Tracker: `docs/trackers/TRACKER-0007-marketing-insights.md`
- Prisma migration: `prisma/migrations/20260729094742_add_marketing_insights_tables/migration.sql`
- Domain events: `src/modules/analytics/domain/events.ts`
- Domain types: `src/modules/analytics/domain/types.ts`
- Repository: `src/modules/analytics/infrastructure/marketing-insights.repository.ts`
- Service: `src/modules/analytics/application/marketing-insights.ts`
- Server actions: `src/modules/analytics/presentation/actions.ts`
- Analytics pages:
  - `src/app/stores/[storeId]/analytics/content/page.tsx`
  - `src/app/stores/[storeId]/analytics/content/[mediaPostId]/page.tsx`
  - `src/app/stores/[storeId]/analytics/trends/page.tsx`
  - `src/app/stores/[storeId]/analytics/reports/page.tsx`
  - `src/app/stores/[storeId]/analytics/recommendations/page.tsx`
- Shared client forms: `src/components/sync-media-form.tsx`, `src/components/analyze-media-form.tsx`, `src/components/search-trends-form.tsx`, `src/components/generate-report-form.tsx`, `src/components/create-recommendation-form.tsx`

## 3. Implementation Plan

- [x] Review the requirement and original design.
- [x] Add `MediaPost`, `MediaInsight`, `AccountInsight`, `TrendSnapshot`, `ContentRecommendation`, and `Report` Prisma models + domain types/events.
- [x] Implement `MarketingInsightsRepository` and `marketingInsightsService`.
- [x] Wire `analyzeMedia` and `createContentIdea` from the `ai` module.
- [x] Add server actions for sync, search, analysis, report generation, and content recommendations.
- [x] Build store-scoped analytics dashboard pages.
- [x] Update `current-state.md` and `CHANGELOG.md`.
- [x] Run lint + typecheck + tests + build.

## 4. Subtasks

- [x] Schema + domain model for marketing insights.
- [x] Repository implementation with `PrismaMarketingInsightsRepository`.
- [x] `marketingInsightsService` use cases (sync media catalog, account analytics, trending hashtags, media analysis, report generation, content recommendations).
- [x] `analyzeMedia` AI function returning `whyItWorked` + `slideBySlideStoryboard`.
- [x] Dashboard pages under `/stores/[storeId]/analytics`.
- [x] Client forms and server-action wiring.
- [x] Quality gates pass.
- [x] Documentation updated.

## 5. Acceptance Criteria

- [x] All linked requirement acceptance criteria are met.
- [x] `MarketingPerformanceView` remains unaffected and still works.
- [x] Analytics client components import only from the public `analytics` barrel (server-only exports moved to `analytics/server`).
- [x] Quality gates pass.
- [x] `CHANGELOG.md` and `current-state.md` updated.

## 6. Notes / Blockers

- Moved `analyticsQueries`, `getCompetitorBenchmark`, `marketingInsightsService`, and `marketingInsightsRepository` out of `analytics/index.ts` into `analytics/server.ts` to prevent client bundles from pulling Node-only dependencies such as `bullmq`/`ioredis`.
