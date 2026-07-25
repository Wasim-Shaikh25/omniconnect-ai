# 0034 — Unified Intelligence Layer Phase 5: Scale & Optimization

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

- [ ] `CompetitorInsight`, `PortfolioSnapshot`, `SystemMetric` tables exist and are populated by services.
- [ ] Portfolio rollup aggregates all stores in an organization.
- [ ] Competitor benchmarks are derived from public `analytics` tracked-account data.
- [ ] System health summary shows avg latency, total cost, and operation count.
- [ ] Dashboard displays the new panels.
- [ ] Lint + typecheck + build pass; no `any`/deep cross-module imports.
- [ ] `CHANGELOG.md` and `docs/tasks/backlog.md` updated.
