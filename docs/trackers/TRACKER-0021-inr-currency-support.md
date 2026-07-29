# TRACKER-0021: INR Currency Support

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0021-inr-currency-support.md`
- **Task:** `docs/tasks/TASK-0021-inr-currency-support.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0021.

## 2. Subtasks

### Planning
- [ ] Requirement approved and task created.

### Implementation / Verification
- [ ] Spec created and linked to backlog.
- [ ] `@/lib/currency` utility created with INR-first formatting.
- [ ] Store detail page and AI reply context use the utility.
- [ ] Mock connector returns INR prices and order totals.
- [ ] `syncProducts` falls back to store currency for products missing one.
- [ ] Lint + typecheck + build pass.
- [ ] CHANGELOG.md and backlog updated.

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

- Migrated from legacy spec `docs/specs/0021-inr-currency-support.md`.
