# TRACKER-0059: Bulk Delete Success Message

- **Status:** Done
- **Requirement:** `docs/requirements/REQ-0059-bulk-delete-success-message.md`
- **Task:** `docs/tasks/TASK-0059-bulk-delete-success-message.md`
- **Module(s):** ui/components, ecommerce
- **Owner:** devin
- **Changelog entry:** Bulk delete success message fix

## Description

Move the bulk-delete success feedback out of `BulkDeleteToolbar` and into `ProductList` / `CouponList` so it survives the `router.refresh()` that empties the list.

## Subtasks

- [x] Create spec and task tracker.
- [x] Update `ProductList` to own and display `bulkMessage`.
- [x] Update `CouponList` to own and display `bulkMessage`.
- [x] Update `BulkDeleteToolbar` to call `onSuccess` and remove local success timer/display.
- [x] Run `lint`, `typecheck`, `test`, `audit`, `build`, `build:worker`.
- [x] E2E re-test with `testing_agent`.
- [x] Update `CHANGELOG.md`.

## Acceptance Criteria

- [x] Matches the linked spec's acceptance criteria.
- [ ] Lint + typecheck + tests pass.
- [ ] `CHANGELOG.md` updated.

## Notes / Blockers

- Follow-up to the E2E run on `main` reported via `testing_agent` where product and coupon bulk delete succeeded in the DB but the UI message was never visible.
