# Task 355: Phase 5 — Scale & Optimization

- **Status:** Done
- **Spec:** `docs/specs/0034-scale-optimization.md`
- **Module(s):** `intelligence`
- **Owner:** wasim
- **Changelog entry:** Implements Phase 5 of the Unified Intelligence Layer: agency portfolio rollup, competitor intelligence, and cost/latency observability.

## Description

Add the final horizontal layer capabilities for scale: multi-store portfolio rollups, competitor benchmarking, and system-health/cost monitoring. These features build on Phases 1–4 without duplicating existing brand-deal, affiliate, or media-kit modules.

## Subtasks

- [x] Add Prisma models + migration: `CompetitorInsight`, `PortfolioSnapshot`, `SystemMetric`.
- [x] Add domain types/events for `CompetitorInsightRecord`, `PortfolioSnapshotRecord`, `SystemMetricRecord`.
- [x] Extend `intelligence/application/ports.ts` with repositories for the new aggregates.
- [x] Implement Prisma repositories.
- [x] Implement `PortfolioService` to generate cross-store rollups using existing metrics/predictions/recommendations.
- [x] Implement `CompetitorIntelligenceService` to derive benchmarks from public `analytics` tracked-account data.
- [x] Implement `CostLatencyMonitor` to record and summarize operation latency/cost.
- [x] Add server actions: `getAgencyPortfolioAction`, `getCompetitorIntelligenceAction`, `getSystemHealthAction`.
- [x] Add UI components: `AgencyPortfolioPanel`, `CompetitorIntelligencePanel`, `SystemHealthPanel` on `/dashboard` and `/stores/[storeId]`.
- [x] Run lint, typecheck, build; validate end-to-end.
- [x] Update `CHANGELOG.md` and `docs/tasks/backlog.md`.

## Acceptance Criteria

- [x] `CompetitorInsight`, `PortfolioSnapshot`, `SystemMetric` tables exist and are populated by services.
- [x] Portfolio rollup aggregates all stores in an organization.
- [x] Competitor benchmarks are derived from public `analytics` tracked-account data.
- [x] System health summary shows avg latency, total cost, and operation count.
- [x] Dashboard displays the new panels.
- [x] Lint + typecheck + build pass; no `any`/deep cross-module imports.
- [x] `CHANGELOG.md` and `docs/tasks/backlog.md` updated.
