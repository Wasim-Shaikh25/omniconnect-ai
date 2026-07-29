# TASK-0064: Documentation Cleanup — Task/Requirement/Tracker Reconciliation

- **Status:** Completed
- **Owner:** Devin
- **Module(s):** docs
- **Requirement:** `docs/requirements/REQ-0064-docs-task-cleanup.md`
- **Tracker:** `docs/trackers/TRACKER-0064-docs-task-cleanup.md`
- **Last updated:** 2026-07-29

## 1. Summary

Implementation task for REQ-0064. Clean up the documentation registry after the unified restructure and the Meta-first scope changes.

## 2. References

- Requirement: `docs/requirements/REQ-0064-docs-task-cleanup.md`
- Tracker: `docs/trackers/TRACKER-0064-docs-task-cleanup.md`

## 3. Implementation Plan

- Scan `docs/requirements/`, `docs/tasks/`, and `docs/trackers/`.
- Delete `docs/tasks/TASK-*.md` files whose ID has no matching `REQ-*.md`.
- Mark implemented features as `Implemented`/`Completed`/`Done`.
- Mark out-of-scope features as `Cancelled`.
- Fix status mismatches.
- Update `CHANGELOG.md` and run `npx tsx scripts/task-status.ts --summary`.

## 4. Subtasks

- [x] Identify orphaned task files.
- [x] Identify implemented-but-mislabeled requirements.
- [x] Identify out-of-scope requirements.
- [x] Delete orphaned task files.
- [x] Update REQ frontmatter status.
- [x] Update TASK frontmatter status.
- [x] Update TRACKER frontmatter status and checkboxes.
- [x] Update `CHANGELOG.md`.
- [x] Run `scripts/task-status.ts --summary`.

## 5. Acceptance Criteria

- [x] Matches REQ-0064 acceptance criteria.
- [x] `task-status.ts` runs without orphaned-file warnings for the cleaned IDs.

## 6. Notes / Blockers

- Existing IDs mapped from old `docs/specs/*.md` may have mismatched slugs due to migration.
- Out-of-scope cancellations should reference `REQ-0061` (product charter) for rationale.
