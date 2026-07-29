# TRACKER-0048: 0048 — Marketing Workflows UI

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0048-marketing-workflows-ui.md`
- **Task:** `docs/tasks/TASK-0048-marketing-workflows-ui.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0048.

## 2. Subtasks

### Planning
- [ ] Requirement approved and task created.

### Implementation / Verification
- [ ] Four marketing workflows are visible in navigation: Daily Marketing, Engagement, Growth, Revenue.
- [ ] `/business-brain` is branded as Marketing Brain and shows the daily brief.
- [ ] `/[storeId]/daily-marketing` exists and surfaces Today’s Brief, Today’s Content, Trending Topics, Competitor Changes, Products To Push, Best Time To Post, DM Opportunities.
- [ ] Existing module pages are reachable inside the new workflow grouping (via alias or redirect).
- [ ] Each workflow page answers a concrete business question and has a clear next action.
- [ ] No existing data or capability is removed.
- [ ] Lint + typecheck + build pass.
- [ ] `CHANGELOG.md` and task tracker updated.

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

- Migrated from legacy spec `docs/specs/0048-marketing-workflows-ui.md`.
