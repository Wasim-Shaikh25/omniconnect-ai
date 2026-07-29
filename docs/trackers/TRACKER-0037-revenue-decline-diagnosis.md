# TRACKER-0037: 0037 — Revenue Decline & Funnel Diagnosis

- **Status:** Done
- **Owner:** Devin
- **Requirement:** `docs/requirements/REQ-0037-revenue-decline-diagnosis.md`
- **Task:** `docs/tasks/TASK-0037-revenue-decline-diagnosis.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0037.

## 2. Subtasks

### Planning
- [x] Requirement approved and task created.

### Implementation / Verification
- [x] `revenue_7d`, `order_count_7d`, `aov_7d` metrics defined and computed.
- [x] `DiagnosisService` produces revenue decline/recovery insights.
- [x] `DetectionService` integrates diagnosis during `analyzeStore`.
- [x] `RecommendationService` maps revenue insights to appropriate action recommendations.
- [x] End-to-end script confirms revenue decline → insight → recommendation.
- [x] Lint + typecheck + build pass.

### Quality Gates
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.

## 3. Acceptance Criteria

- [x] All linked requirement acceptance criteria are met.
- [x] All quality gates pass.

## 4. Notes / Blockers

- Migrated from legacy spec `docs/specs/0037-revenue-decline-diagnosis.md`.
