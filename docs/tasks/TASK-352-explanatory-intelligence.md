# Task 352: Phase 2 — Explanatory Intelligence (Today Feed, Intelligence Panel, Anomaly Detection)

- **Status:** Done
- **Spec:** `docs/specs/0033-unified-intelligence-layer.md`
- **Module(s):** `intelligence`, `dashboard`, `analytics`
- **Owner:** wasim
- **Changelog entry:** Implements Phase 2 of the Unified Intelligence Layer: prioritized Today feed, Intelligence Panel, anomaly detection, and evidence-backed explanations built on Phase 1 signals.

## Description

Build on Phase 1 signals and metrics to explain what is happening in the workspace, why it matters, and what evidence supports each observation. Phase 2 introduces `BusinessInsight` as a first-class aggregate, a rule-based `DetectionService`, an `IntelligenceFeedService` that ranks insights, and dashboard UI (`TodayFeed` + `IntelligencePanel`) that surfaces the top items with deep links and an evidence drawer.

## Subtasks

- [x] Add `BusinessInsight` Prisma model + migration (`type`, `severity`, `status`, `title`, `description`, `evidence`, `deepLink`, `generatedAt`, `organizationId`, `storeId`).
- [x] Add `BusinessInsight` domain types/events (`BusinessInsightGenerated`) to `intelligence`.
- [x] Implement `DetectionService` with rule-based detectors:
  - No orders in the last 24h (revenue risk).
  - High-intent conversation with no response in 30 minutes (support risk/opportunity).
  - No new followers in the last 7 days (growth risk).
  - Stale metric / data quality issue surfaced as insight.
- [x] Implement `IntelligenceFeedService` to query open insights, rank by severity/recency, and support dismiss/snooze.
- [x] Add server actions: `getIntelligenceFeedAction`, `dismissInsightAction`.
- [x] Add UI components:
  - `TodayFeed` — list of prioritized insights with severity badge, title, evidence drawer, deep link.
  - `IntelligencePanel` — three-layer view (What is happening / Why / What to do next) for dashboard.
- [x] Wire `TodayFeed`/`IntelligencePanel` into `/dashboard` and `/stores/[storeId]` pages.
- [x] Run lint, typecheck, build; validate detection with seeded signals and orders.

## Acceptance Criteria

- [x] `BusinessInsight` table exists and is populated by detection rules.
- [x] Dashboard shows a prioritized Today feed with anomalies, risks, and opportunities.
- [x] Each insight has an evidence drawer listing the supporting signals/metrics.
- [x] Deep links jump to the relevant store, customer, conversation, or order view.
- [x] Dismiss action updates insight status and revalidates the feed.
- [x] Lint + typecheck + build pass; no `any`/deep cross-module imports.
- [x] `CHANGELOG.md` and `docs/tasks/backlog.md` updated.
