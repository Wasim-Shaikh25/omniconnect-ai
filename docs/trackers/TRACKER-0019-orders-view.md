# TRACKER-0019: Orders View (read-only connector orders)

- **Status:** Cancelled
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0019-orders-view.md`
- **Task:** `docs/tasks/TASK-0019-orders-view.md`
- **Last updated:** 2026-07-29

> **Reason:** Cancelled — out of scope per REQ-0061 (Product Charter).
## 1. Summary

Progress tracker for REQ-0019.

## 2. Subtasks

### Planning
- [x] Requirement approved and task created.

### Implementation / Verification
- [x] Spec created and linked to backlog.
- [x] `ecommerceQueries.listOrders` resolves the connector and returns orders.
- [x] `/stores/[storeId]/orders` renders the order list.
- [x] Store detail page links to Orders.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

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

- Migrated from legacy spec `docs/specs/0019-orders-view.md`.