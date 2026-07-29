# TRACKER-0033: Unified Intelligence Layer (OmniConnect 2.0)

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0033-unified-intelligence-layer.md`
- **Task:** `docs/tasks/TASK-0033-unified-intelligence-layer.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0033.

## 2. Subtasks

### Planning
- [ ] Requirement approved and task created.

### Implementation / Verification
- [ ] Spec 0033 and linked task file are created and committed.
- [ ] All P0 foundation services (`Signal`, `EntityLink`, `MetricDefinition`, `BusinessInsight`, `Recommendation`, `ActionPlan`, `Decision`, `Outcome`, `DataQualityIssue`) have Prisma models, repositories, and domain logic.
- [ ] Shared APIs from §8 are implemented and RBAC-scoped.
- [ ] `IntelligencePanel` and `TodayFeed` are visible on dashboard and embedded in at least CRM, Inbox, Orders, and Analytics.
- [ ] At least the three initial stories (revenue decline, high-intent conversation, repeat-purchase re-engagement) work end-to-end.
- [ ] Recommendation ranking, risk tiers, approval workflow, and outcome linkage are implemented.
- [ ] Learning loop is closed: outcome measured → `BusinessLearning` updated → future ranking adjusted.
- [ ] Lint + typecheck + build pass; no new `any` or cross-module deep imports.
- [ ] `CHANGELOG.md` and `docs/tasks/backlog.md` updated.

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

- Migrated from legacy spec `docs/specs/0033-unified-intelligence-layer.md`.
