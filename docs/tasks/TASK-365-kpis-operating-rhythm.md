# Task 365: KPIs and Operating Rhythm

- **Status:** Done
- **Spec:** `docs/specs/0041-kpis-operating-rhythm.md`
- **Module(s):** `intelligence`, `analytics`
- **Owner:** wasim
- **Changelog entry:** Adds IAVA and supporting KPIs plus operating-rhythm views.

## Description

Implement the KPI and operating-rhythm portion of `TASK-350` (subtasks 107–109) by computing the North-star metric IAVA and the most actionable supporting KPIs, then surfacing them on Dashboard and Business Brain.

## Subtasks (3)

- [x] 107. Implement North-star metric **IAVA** (Intelligence-Assisted Value Actions) tracking.
- [x] 108. Implement supporting KPIs: active-workspace insight coverage, open/evidence rates, time to insight, recommendation acceptance/edit/completion, dismissal reasons, attributed revenue, prevented loss, forecast calibration, unsupported-claim rate, permission failures, alert mute rate, signal freshness, identity confidence, entity-link coverage, insight latency, action success, outcome-linkage coverage.
- [~] 109. Implement operating-rhythm dashboards/views: intelligence quality, outcome, data quality, safety, product, and monthly model/rule reviews.

## Acceptance Criteria

- [x] `KpiService` computes IAVA and supporting KPIs for 24h/7d/30d windows.
- [x] `getWorkspaceKpisAction` returns a snapshot.
- [x] Dashboard renders a KPI row.
- [x] `/business-brain` renders operating-rhythm KPIs.
- [x] End-to-end script passes.
- [x] Lint + typecheck + build pass.
