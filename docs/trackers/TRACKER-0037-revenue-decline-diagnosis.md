# TRACKER-0037: 0037 — Revenue Decline & Funnel Diagnosis

- **Status:** Todo
- **Owner:** Devin
- **Requirement:** `docs/requirements/REQ-0037-revenue-decline-diagnosis.md`
- **Task:** `docs/tasks/TASK-0037-revenue-decline-diagnosis.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0037.

## 2. Subtasks

### Planning
- [ ] Requirement approved and task created.

### Implementation / Verification
- [ ] `revenue_7d`, `order_count_7d`, `aov_7d` metrics defined and computed.
- [ ] `DiagnosisService` produces revenue decline/recovery insights.
- [ ] `DetectionService` integrates diagnosis during `analyzeStore`.
- [ ] `RecommendationService` maps revenue insights to appropriate action recommendations.
- [ ] End-to-end script confirms revenue decline → insight → recommendation.
- [ ] Lint + typecheck + build pass.

### Quality Gates
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] `CHANGELOG.md` updated.

## 3. Acceptance Criteria

- [ ] All linked requirement acceptance criteria are met.
- [ ] All quality gates pass.

## 4. Notes / Blockers

- Migrated from legacy spec `docs/specs/0037-revenue-decline-diagnosis.md`.
