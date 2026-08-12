---
description: Progress tracker for Stripe to Razorpay replacement
---

# TRACKER-0101: Replace Stripe with Razorpay

- **Status:** In Progress
- **Owner:** Devin
- **Requirement:** `docs/requirements/REQ-0101-razorpay-replacement.md`
- **Task:** `docs/tasks/TASK-0101-razorpay-replacement.md`
- **Last updated:** 2026-08-12

## 1. Summary

Track progress of removing Stripe and integrating Razorpay.

## 2. Subtasks

### Planning

- [x] Requirement created.
- [x] Task file created with implementation details and references.
- [x] Tracker created.
- [x] Branch created from `main`.

### Implementation

- [x] Prisma schema + env migration.
- [x] Razorpay payment gateway adapter.
- [x] Billing service rewrite.
- [x] Repository and coupon cleanup.
- [x] API routes rename/update.
- [x] UI copy and link updates.
- [x] Tests and scripts cleanup.

### Verification

- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm audit` reports 0 vulnerabilities.
- [x] `npm run build` passes.
- [x] `npm run build:worker` passes.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.

## 3. Acceptance Criteria

- [x] All linked requirement acceptance criteria are met.
- [x] All verification steps above pass.

## 4. Notes / Blockers

- No blockers.
