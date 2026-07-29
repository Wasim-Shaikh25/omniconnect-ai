# Tasks

This folder contains implementation plans (`TASK-<id>-<slug>.md`). Every task is linked to exactly one requirement and one tracker.

## Workflow

1. Create or update `docs/requirements/REQ-<id>-<slug>.md` first.
2. Create `TASK-<id>-<slug>.md` from `docs/templates/TASK-TEMPLATE.md`.
3. Create `docs/trackers/TRACKER-<id>-<slug>.md` from `docs/templates/TRACKER-TEMPLATE.md`.
4. Implement and keep the tracker checkbox list current.
5. Update `docs/specs/current-state.md` and `CHANGELOG.md` when done.

## Legacy files

Files matching `*-progress.md` and `TASK-350-*.md` are historical and will be migrated to the `REQ/TASK/TRACKER` format when next touched.

## Status checker

Run `npx tsx scripts/task-status.ts` to see what is done and what is left across all requirements and trackers.
