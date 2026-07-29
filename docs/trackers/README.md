# Trackers

This folder contains progress trackers (`TRACKER-<id>-<slug>.md`). A tracker is the source of truth for whether a requirement is done or left.

## Rules

- Every tracker links to one `REQ-<id>` and one `TASK-<id>`.
- All checkboxes under **Implementation / Verification** and **Quality Gates** must be `[x]` before the requirement is considered done.
- Update the tracker as subtasks complete.

## How to create

Copy `docs/templates/TRACKER-TEMPLATE.md` to `docs/trackers/TRACKER-<id>-<slug>.md` and fill in the subtask list.

## Status

Run `npx tsx scripts/task-status.ts` to see the current progress of all requirements.
