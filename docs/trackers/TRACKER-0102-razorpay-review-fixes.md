# TRACKER-0102: Razorpay review fixes

- **Status:** Done
- **Owner:** Devin
- **Requirement:** `docs/requirements/REQ-0102-razorpay-review-fixes.md`
- **Task:** `docs/tasks/TASK-0102-razorpay-review-fixes.md`
- **Last updated:** 2026-08-12

## 1. Summary

Track the three review fixes from PR #194: webhook event deduplication collision, backfill script retry-state downgrade, and checkout coupon code not being applied.

## 2. Subtasks

### Planning
- [x] Requirement created.
- [x] Task file created with implementation details and references.
- [x] Branch created from `main`.

### Implementation
- [x] Webhook deduplication uses SHA-256 or `x-razorpay-event-id`.
- [x] Backfill script retains plan for retry states and normalizes statuses.
- [x] Checkout coupon handling removed.
- [x] Help copy updated.

### Verification
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
- [x] `npm run build:worker` passes.
- [x] `CHANGELOG.md` updated.

## 3. Acceptance Criteria

- [x] All linked requirement acceptance criteria are met.
- [x] All verification steps above pass.

## 4. Notes / Blockers

- None.
