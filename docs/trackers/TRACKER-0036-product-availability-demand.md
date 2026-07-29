# TRACKER-0036: 0036 — Product Availability & Demand Mismatch

- **Status:** Todo
- **Owner:** Devin
- **Requirement:** `docs/requirements/REQ-0036-product-availability-demand.md`
- **Task:** `docs/tasks/TASK-0036-product-availability-demand.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0036.

## 2. Subtasks

### Planning
- [ ] Requirement approved and task created.

### Implementation / Verification
- [ ] `ProductsSynced` carries product inventory list.
- [ ] `DetectionService` emits product availability/demand insights.
- [ ] `RecommendationService` creates alternative-product recommendations.
- [ ] `WorkspaceActionExecutor` creates a DM campaign.
- [ ] End-to-end script confirms: product sync → message mentioning product → insight → recommendation → executed campaign.
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

- Migrated from legacy spec `docs/specs/0036-product-availability-demand.md`.
