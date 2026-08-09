# TRACKER-0098: Instagram Story Insights Ingestion

- **Status:** Done
- **Owner:** devin
- **Requirement:** `docs/requirements/REQ-0098-story-insights-ingestion.md`
- **Task:** `docs/tasks/TASK-0098-story-insights-ingestion.md`
- **Last updated:** 2026-08-09

## 1. Summary

Ingest active Instagram Stories and their story-only insights, store them, and
render them on the content detail page.

## 2. Subtasks

### Planning
- [x] Requirement approved/created.
- [x] Task file created with implementation details and references.
- [x] Branch created from `main`.

### Implementation
- [x] Prisma migration for `MediaInsight` story columns.
- [x] `MetaService.getAccountStories` and story insight metrics.
- [x] `syncMediaCatalog` story integration with expired-story 404 tolerance.
- [x] Content detail page "Story metrics" section.

### Verification
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run test:integration` passes.
- [x] `npm audit` reports 0 vulnerabilities or an accepted risk.
- [x] `npm run build` passes.
- [x] `npm run build:worker` passes.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated if needed.

## 3. Acceptance Criteria

- [x] All linked requirement acceptance criteria are met.
- [x] All verification steps above pass.

## 4. Notes / Blockers

None.
