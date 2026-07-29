# TRACKER-0050: Daily Marketing Operating Rhythm

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0050-daily-marketing-operating-rhythm.md`
- **Task:** `docs/tasks/TASK-0050-daily-marketing-operating-rhythm.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0050.

## 2. Subtasks

### Planning
- [ ] Requirement approved and task created.

### Implementation / Verification
- [ ] `/dashboard` (or `/daily`) renders a prioritized list of `DailyAction` cards with objective, confidence, and CTA.
- [ ] User can complete or skip an action; the state persists and an `ActionOutcome` is scheduled.
- [ ] `MarketingMemory` feeds `DailyAction` generation and `Business Brain` answers.
- [ ] `Journey` records steps from `POST_VIEW` → `PROFILE_VISIT` → `DM` → `COUPON_SENT` → `ORDER`.
- [ ] Recommendations have `objective`, `confidence`, and `reasoning`; confidence updates when new signals arrive.
- [ ] Brain answers cite sources (Daily Brief, Memory, Journeys, Recommendations).
- [ ] Billing plan enforcement gates store count, AI reply volume, and team seats.
- [ ] CI pipeline runs lint, typecheck, tests, and migration dry-run on every PR.
- [ ] Redis-backed event bus and queue worker are documented and validated in a staging environment.
- [ ] Tenant isolation audit completed with explicit `organizationId` / `storeId` checks on all mutating actions.
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

- Migrated from legacy spec `docs/specs/0050-daily-marketing-operating-rhythm.md`.
