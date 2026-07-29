# TRACKER-0028: Affiliate Center

- **Status:** Cancelled
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0028-affiliate-center.md`
- **Task:** `docs/tasks/TASK-0028-affiliate-center.md`
- **Last updated:** 2026-07-29

> **Reason:** Cancelled — out of scope per REQ-0061 (Product Charter).
## 1. Summary

Progress tracker for REQ-0028.

## 2. Subtasks

### Planning
- [x] Requirement approved and task created.

### Implementation / Verification
- [x] Spec created and linked to backlog.
- [x] `/stores/[storeId]/affiliates` renders ambassadors and referrals.
- [x] Enroll and record-referral forms wired to `enrollAmbassadorAction` / `recordReferralAction` with `revalidatePath` for the affiliates page.
- [x] Store detail page links to Affiliate Center.
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

- Migrated from legacy spec `docs/specs/0028-affiliate-center.md`.