# TRACKER-0048: 0048 — Marketing Workflows UI

- **Status:** Done
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0048-marketing-workflows-ui.md`
- **Task:** `docs/tasks/TASK-0048-marketing-workflows-ui.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0048.

## 2. Subtasks

### Planning
- [x] Requirement approved and task created.

### Implementation / Verification
- [x] Four marketing workflows are visible in navigation: Daily Marketing, Engagement, Growth, Revenue.
- [x] `/business-brain` is branded as Marketing Brain and shows the daily brief.
- [x] `/[storeId]/daily-marketing` exists and surfaces Today’s Brief, Today’s Content, Trending Topics, Competitor Changes, Products To Push, Best Time To Post, DM Opportunities.
- [x] Existing module pages are reachable inside the new workflow grouping (via alias or redirect).
- [x] Each workflow page answers a concrete business question and has a clear next action.
- [x] No existing data or capability is removed.
- [x] Lint + typecheck + build pass.
- [x] `CHANGELOG.md` and task tracker updated.

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

- Migrated from legacy spec `docs/specs/0048-marketing-workflows-ui.md`.
