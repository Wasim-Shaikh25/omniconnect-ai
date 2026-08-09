# TRACKER-0100: Close Remaining Production-Readiness Audit Gaps

- **Status:** Implemented
- **Owner:** devin
- **Requirement:** `docs/requirements/REQ-0100-remaining-audit-gaps.md`
- **Task:** `docs/tasks/TASK-0100-remaining-audit-gaps.md`
- **Last updated:** 2026-08-09

## 1. Summary

Close the M3 project/workspace name race, M4 unbounded inbox message query, and dynamic-adapter SSRF redirect/IDN gaps.

## 2. Subtasks

### Planning
- [x] Requirement approved/created.
- [x] Task file created with implementation details and references.
- [x] Tracker created.
- [x] Branch created from `main` (`devin/close-audit-m3-m4-ssrf-1786253811`).

### Implementation
- [x] Prisma migration for `Project` and `Workspace` name uniqueness.
- [x] Repository P2002 handling for duplicate names.
- [x] `MessageRepository.listLatestByConversationIds` `DISTINCT ON` + index.
- [x] `fetchWithPublicRedirects` helper and `ConfigInterpreter` integration.
- [x] IDN support in `assertPublicHttpUrl`.

### Verification
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run test:integration` passes.
- [x] `npm run build` passes.
- [x] `npm run build:worker` passes.
- [x] `npm audit --audit-level=moderate` reports 0 vulnerabilities.
- [x] `npx prisma migrate deploy` applies cleanly.
- [x] `docs/specs/current-state.md` updated.
- [x] `CHANGELOG.md` updated.

## 3. Acceptance Criteria

- [x] All linked requirement acceptance criteria are met.
- [x] All verification steps above pass.

## 4. Notes / Blockers

None.
