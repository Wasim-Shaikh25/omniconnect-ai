# Requirements

This folder contains business requirements (`REQ-<id>-<slug>.md`). Each requirement describes **what** and **why**, never line-by-line how.

## Rules

- Every requirement has a matching `TASK-<id>-<slug>.md` in `docs/tasks/`.
- Every requirement has a matching `TRACKER-<id>-<slug>.md` in `docs/trackers/`.
- Requirements are created before any code is written.
- Update the requirement if the scope changes; a requirement that disagrees with the code is a bug.

## How to create

Copy `docs/templates/REQ-TEMPLATE.md` to `docs/requirements/REQ-<id>-<slug>.md` and fill in the sections.

## Legacy specs

Historical specs from `docs/specs/` (`0000-0062`) were migrated here during the restructuring. Each migrated requirement preserves the original spec content and references its task and tracker.
