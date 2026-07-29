# TRACKER-0028: Affiliate Center

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0028-affiliate-center.md`
- **Task:** `docs/tasks/TASK-0028-affiliate-center.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0028.

## 2. Subtasks

### Planning
- [ ] Requirement approved and task created.

### Implementation / Verification
- [ ] Spec created and linked to backlog.
- [ ] `/stores/[storeId]/affiliates` renders ambassadors and referrals.
- [ ] Enroll and record-referral forms wired to `enrollAmbassadorAction` / `recordReferralAction` with `revalidatePath` for the affiliates page.
- [ ] Store detail page links to Affiliate Center.
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

- Migrated from legacy spec `docs/specs/0028-affiliate-center.md`.
