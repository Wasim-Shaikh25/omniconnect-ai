# TRACKER-0006: Customer Memory System (CRM)

- **Status:** Done
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0006-customer-memory.md`
- **Task:** `docs/tasks/TASK-0006-customer-memory.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0006.

## 2. Subtasks

### Planning
- [x] Requirement approved and task created.

### Implementation / Verification
- [x] `CustomerMemory` port modeled and implemented by `PrismaCustomerRepository`.
- [x] `getProfile` aggregates coupons/usages by store + external id + channel.
- [x] `tag`, `recordCouponSent`, `recordCouponUsed` implemented.
- [x] `CustomerProfileUpdated` emitted and exported.
- [x] CRM subscribes to `CouponGenerated` and tags the customer.
- [x] Lint + typecheck pass; `CHANGELOG.md` updated.

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

- Migrated from legacy spec `docs/specs/0006-customer-memory.md`.
