# 0041 — KPIs and Operating Rhythm

- **Module(s):** `intelligence`, `analytics`
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/TASK-365-kpis-operating-rhythm.md`
- **Last updated:** 2026-07-25

## 1. Summary

Implement the first KPI layer for the Unified Intelligence Layer: track the North-star metric **IAVA** (Intelligence-Assisted Value Actions) plus the most actionable supporting KPIs, and surface them on the Dashboard and a dedicated `/business-brain` operating-rhythm view.

## 2. Goals

- Compute IAVA from executed action plans and attributed outcomes.
- Compute supporting KPIs: active-workspace insight coverage, open/evidence rates, recommendation acceptance/edit/completion, forecast calibration, signal freshness, identity confidence, action success, outcome-linkage coverage.
- Display KPI cards and trends on Dashboard and Business Brain.

## 3. Non-Goals

- Full operating-rhythm review workflows (monthly model/rule reviews) — deferred.
- Advanced forecast calibration charts.

## 4. User Stories

- As a store owner, I want to see how many value actions were assisted by intelligence this week.
- As an operator, I want to know which recommendations are being accepted and completed so I can tune the system.

## 5. Domain Model

```ts
export interface KpiSnapshot {
  organizationId: string;
  storeId?: string;
  period: "24h" | "7d" | "30d";
  iava: number;
  insightsGenerated: number;
  insightsActed: number;
  recommendationsAccepted: number;
  recommendationsDismissed: number;
  actionPlansExecuted: number;
  actionPlansSuccess: number;
  outcomesLinked: number;
  signalFreshnessPct: number;
  identityConfidenceAvg: number;
  highConfidenceEntityLinks: number;
}
```

## 6. Public Contract

- `KpiService.getWorkspaceSnapshot(organizationId, storeId?, period?)`
- Server action `getWorkspaceKpisAction(storeId?)`
- UI: KPI cards on `/dashboard` and `/business-brain`

## 7. Data / Persistence

- No new Prisma models; computes from `Signal`, `BusinessInsight`, `Recommendation`, `ActionPlan`, `Outcome`, `EntityLink`, `MetricSnapshot`.

## 8. API / UI Surface

- `/dashboard`: top KPI row (IAVA, insights acted, recommendations accepted, action plans executed, outcome linkage).
- `/business-brain`: operating-rhythm panel with KPI grid and freshness/confidence indicators.

## 9. External Integrations

- None.

## 10. Edge Cases & Failure Modes

- No data: return zeros and `null` averages.
- Missing `storeId`: aggregate across organization.

## 11. Security & Privacy

- Server actions verify workspace membership.

## 12. Testing Strategy

- End-to-end script `scripts/verify-task365.ts` creates signals, insights, recommendations, action plans, and outcomes, then asserts KPI counts.

## 13. Acceptance Criteria

- [x] `KpiService` computes IAVA and supporting KPIs for 24h/7d/30d windows.
- [x] `getWorkspaceKpisAction` returns a snapshot.
- [x] Dashboard renders a KPI row.
- [x] `/business-brain` renders operating-rhythm KPIs.
- [x] End-to-end script passes.
- [x] Lint + typecheck + build pass.
