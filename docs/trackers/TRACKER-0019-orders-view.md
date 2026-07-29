# TRACKER-0019: Orders View (read-only connector orders)

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0019-orders-view.md`
- **Task:** `docs/tasks/TASK-0019-orders-view.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0019.

## 2. Subtasks

### Planning
- [ ] Requirement approved and task created.

### Implementation / Verification
- [ ] Spec created and linked to backlog.
- [ ] `ecommerceQueries.listOrders` resolves the connector and returns orders.
- [ ] `/stores/[storeId]/orders` renders the order list.
- [ ] Store detail page links to Orders.
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

- Migrated from legacy spec `docs/specs/0019-orders-view.md`.
