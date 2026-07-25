# Task 351: Phase 1 — Shared Context MVP

- **Status:** Completed
- **Spec:** `docs/specs/0033-unified-intelligence-layer.md`
- **Module(s):** `intelligence` + `crm`, `conversations`, `ecommerce`, `analytics`, `dashboard`, `inbox`
- **Owner:** wasim
- **Changelog entry:** Implements Phase 1 of the Unified Intelligence Layer: canonical signals, entity links with confidence, unified customer timeline, shared semantic metrics, data freshness/quality indicators, cross-module deep links, and customer summary/priority conversation context.

## Description

Build the first shippable slice of the Unified Intelligence Layer. The goal is shared business context across CRM, Inbox, Orders, and Analytics without duplicating existing features. This task adds an `intelligence` module that ingests canonical signals from existing events, resolves identity links with confidence, exposes a unified timeline, computes shared metrics, surfaces data-quality/freshness issues, and enriches the customer detail, inbox, and dashboard UIs with this context.

## Subtasks

- [x] Add Prisma models for `Signal`, `EntityLink`, `DataQualityIssue`, `MetricDefinition`, and `MetricSnapshot` plus migration.
- [x] Bootstrap `src/modules/intelligence` with DDD layers and public barrel.
- [x] Implement `SignalIngestionService` that subscribes to `MetaMessageReceived`, `MetaFollowReceived`, `NewMessage`, `ConversationTakenOver`, `AIResumed`, `CouponGenerated`, `CouponDisabled`, `ProductsSynced`, and stores canonical `Signal` records with lineage and freshness.
- [x] Implement `EntityResolutionService` that reads/writes `EntityLink` with `verified`/`probable`/`possible`/`rejected` confidence and supports manual merge/split.
- [x] Implement `TimelineService` that returns a customer's unified journey timeline grouped by stage (Discovery → Engagement → Consideration → Purchase → Fulfillment → Retention → Advocacy) from signals.
- [x] Implement `MetricService` with governed metric definitions and snapshots for conversation count, follower count, coupon count, response time, and product count with freshness/SLA status.
- [x] Implement `DataQualityService` that detects stale integrations and missing source data and emits `DataQualityIssue` records.
- [x] Add server actions: `getCustomerTimelineAction`, `getCustomerIntelligenceAction`, `getDataQualityIssuesAction`, `getMetricAction`, `mergeEntityAction`, `splitEntityAction`.
- [x] Update `/customers/[customerId]/page.tsx` with the unified timeline, entity-link confidence, and deep links to conversations/orders/followers.
- [x] Update `/inbox` and `/stores/[storeId]/conversations/[conversationId]` with priority conversation context (customer summary, lifecycle, consent, last activity) and confidence badges.
- [x] Update `/dashboard` with a data freshness/quality alert section and cross-module deep links.
- [x] Wire `intelligence` subscribers in `src/server/subscribers.ts`.
- [x] Run lint, typecheck, build, and verify the end-to-end flow with seeded data.

## Acceptance Criteria

- [x] `Signal`, `EntityLink`, `DataQualityIssue`, `MetricDefinition`, and `MetricSnapshot` tables exist and are populated by existing events.
- [x] Customer detail shows a unified timeline grouped by journey stage.
- [x] Inbox/conversation detail shows customer summary with lifecycle, consent, and confidence labels.
- [x] Dashboard surfaces data freshness/quality alerts with deep links.
- [x] Manual merge/split actions update `EntityLink` confidence/status.
- [x] Lint + typecheck + build pass; no `any`/deep cross-module imports.
- [x] `CHANGELOG.md` and `docs/tasks/backlog.md` updated.
