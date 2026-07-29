---
description: 0044 — Operating Model, 30-Day Plan, and Success Criteria
---

# REQ-0044: 0044 — Operating Model, 30-Day Plan, and Success Criteria

- **Status:** Implemented
- **Owner:** wasim
- **Module(s):** `intelligence`, cross-functional program
- **Original spec path:** `docs/specs/0044-operating-model-30day.md` (restructured)
- **Task:** `docs/tasks/TASK-0044-operating-model-30day.md`
- **Tracker:** `docs/trackers/TRACKER-0044-operating-model-30day.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0044-operating-model-30day.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** `intelligence`, cross-functional program
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/TASK-368-operating-model-30day.md`
- **Last updated:** 2026-07-25

## 1. Summary

Define the operating model, 30-day delivery plan, risk/approval matrix, and first-year success criteria for the Unified Intelligence Layer. Also demonstrate and document the Week 4 thin slice end-to-end.

## 2. Goals

- Establish UIL program governance (sponsor, architect, squads).
- Sign off the first three intelligence stories and lock the 90-day delivery plan.
- Map required entities, events, metrics, and actions for each story.
- Inventory source freshness, identity quality, and data gaps across integrations.
- Build offline evaluation cases for the first stories.
- Define and approve the action risk and approval matrix (Tier 0–4).
- Demonstrate the Week 4 thin slice: order/inventory signals → revenue anomaly → stock-related driver → eligible Inbox demand → alternative-product campaign recommendation → preview/approval → outcome tracking.
- Review the thin slice for accuracy, usefulness, safety, latency, and architectural reuse.
- Define first-year success criteria and KPIs.

## 3. Non-Goals

- Replacing existing project-management tooling.
- Real-time organizational chart integration.

## 4. Public Contract

- `OperatingModelService.getGovernance()`
- `OperatingModelService.getStories()`
- `OperatingModelService.getRiskMatrix()`
- `OperatingModelService.getSuccessCriteria()`
- Server actions: `getOperatingModelAction`, `getRiskMatrixAction`
- UI: `/settings/operating-model` read-only view

## 5. Data / Persistence

- Operating model, stories, risk matrix, and success criteria stored as code/configuration.
- Thin-slice verification uses existing repositories via `scripts/verify-thin-slice-week4.ts`.

## 6. API / UI Surface

- `/settings/operating-model` displays governance, stories, risk matrix, and success criteria.

## 7. Testing Strategy

- `scripts/verify-thin-slice-week4.ts` seeds an org/store with an integration, products, a customer, a conversation mentioning an out-of-stock product, and signals; then runs `DetectionService`/`DiagnosisService`/`RecommendationService`/`ActionPlanService` to demonstrate insight → recommendation → action plan → outcome trace.

## 8. Acceptance Criteria

- [x] Operating model governance documented and exposed via service/UI.
- [x] First three intelligence stories and 90-day plan documented.
- [x] Entity/event/metric/action mapping for each story.
- [x] Integration health/freshness/identity gap inventory documented.
- [x] Offline evaluation cases for first stories.
- [x] Action risk and approval matrix (Tier 0–4) defined.
- [x] Week 4 thin slice end-to-end script passes.
- [x] Thin-slice review checklist documented.
- [x] First-year success criteria defined and tracked.
- [x] Lint + typecheck + build pass.
