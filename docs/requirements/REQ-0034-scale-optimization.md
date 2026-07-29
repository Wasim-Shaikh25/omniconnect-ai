---
description: 0034 — Unified Intelligence Layer Phase 5: Scale & Optimization
---

# REQ-0034: 0034 — Unified Intelligence Layer Phase 5: Scale & Optimization

- **Status:** Implemented
- **Owner:** Devin
- **Module(s):** all
- **Original spec path:** `docs/specs/0034-scale-optimization.md` (restructured)
- **Task:** `docs/tasks/TASK-0034-scale-optimization.md`
- **Tracker:** `docs/trackers/TRACKER-0034-scale-optimization.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0034-scale-optimization.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


## 1. Purpose

Close the Unified Intelligence Layer by enabling multi-store (agency) portfolio visibility, competitor benchmarking, and operational observability. The goal is to surface cross-store priorities, compare against tracked competitors, and monitor cost/latency so the system can optimize its own recommendations.

## 2. Scope

This phase is confined to the `intelligence` module. It reads public data from `organizations`, `analytics`, `branddeals`, and existing `intelligence` services; it does not duplicate brand-deal/affiliate/media-kit/automation features.

## 3. Domain Model

- `CompetitorInsight` — benchmark row derived from a tracked competitor account: handle, metric (followers/engagement/post volume), value, and delta vs. the owning store.
- `PortfolioSnapshot` — point-in-time cross-store rollup: store count, total revenue estimate, total churn risk, top recommendation type, top risk store.
- `SystemMetric` — per-operation latency and cost record: operation, module, latencyMs, costCents, status, traceId.

## 4. Public Contract / API

Server actions:

- `getAgencyPortfolioAction()`
- `getCompetitorIntelligenceAction(storeId?)`
- `getSystemHealthAction()`
- `recordOperationMetricAction(formData)` (optional for manual instrumentation)

## 5. Data / Persistence

Prisma models added under the `intelligence` block:

- `CompetitorInsight`
- `PortfolioSnapshot`
- `SystemMetric`

Tenant scoping via `organizationId`; `storeId` optional where applicable. JSON columns for `features`/`metadata`.

## 6. UI / UX

- `AgencyPortfolioPanel` — multi-store KPIs, top risk store, top recommendation type.
- `CompetitorIntelligencePanel` — benchmark table vs. tracked competitors.
- `SystemHealthPanel` — average latency, total cost, slowest operations.

All panels embedded on `/dashboard` and `/business-brain` (or `/portfolio` later).

## 7. Edge Cases

- No stores: snapshot shows empty state.
- No tracked competitors: competitor panel shows empty state.
- Missing metrics: abstain and show scenario range.
- Cost/latency: round to 2 decimals; no PII in operation names.

## 8. Acceptance Criteria

- [x] `CompetitorInsight`, `PortfolioSnapshot`, `SystemMetric` tables exist and are populated by services.
- [x] Portfolio rollup aggregates all stores in an organization.
- [x] Competitor benchmarks are derived from public `analytics` tracked-account data.
- [x] System health summary shows avg latency, total cost, and operation count.
- [x] Dashboard displays the new panels.
- [x] Lint + typecheck + build pass; no `any`/deep cross-module imports.
- [x] `CHANGELOG.md` and `docs/tasks/backlog.md` updated.
