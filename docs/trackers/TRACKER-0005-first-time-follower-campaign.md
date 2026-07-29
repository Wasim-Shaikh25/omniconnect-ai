# TRACKER-0005: First-Time Follower Campaign

- **Status:** Done
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0005-first-time-follower-campaign.md`
- **Task:** `docs/tasks/TASK-0005-first-time-follower-campaign.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0005.

## 2. Subtasks

### Planning
- [x] Requirement approved and task created.

### Implementation / Verification
- [x] Domain modeled (`FirstTimeFollowerCampaign`, `CampaignDispatch`) and events defined.
- [x] `FirstTimeFollowerCampaignService` port and Prisma repository implemented.
- [x] Campaign dispatcher subscribes to `FirstTimeFollowerDetected`, generates coupon, AI message, and outbound send.
- [x] UI page for campaign settings on `/stores/[storeId]/campaigns/first-follower`.
- [x] Dev simulator supports "Simulate new follower" and shows result.
- [x] Lint + typecheck + tests pass; `CHANGELOG.md` and `docs/tasks/backlog.md` updated.

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

- Migrated from legacy spec `docs/specs/0005-first-time-follower-campaign.md`.
