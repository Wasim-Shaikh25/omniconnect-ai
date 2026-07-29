# Specs

This folder now contains the **living architecture and current-state document** only. Per-feature specifications have been restructured into the unified requirement/task/tracker workflow.

## New document structure

| Folder | Purpose |
|--------|---------|
| `docs/specs/current-state.md` | Living architecture, data model, critical flows, integrations, and current limitations. Update this whenever architecture or contracts change. |
| `docs/requirements/` | Business requirements (`REQ-<id>-<slug>.md`) — what and why. |
| `docs/tasks/` | Implementation plans (`TASK-<id>-<slug>.md`) — how, with code snippets and file references. |
| `docs/trackers/` | Progress trackers (`TRACKER-<id>-<slug>.md`) — subtasks and done/left status. |
| `docs/templates/` | Templates for new requirements, tasks, and trackers. |
| `scripts/task-status.ts` | Run to see which requirements are done and which are left. |

## How to add a new feature

1. Read `CHANGELOG.md` and `docs/specs/current-state.md`.
2. Create `docs/requirements/REQ-<id>-<slug>.md` from `docs/templates/REQ-TEMPLATE.md`.
3. Create `docs/tasks/TASK-<id>-<slug>.md` from `docs/templates/TASK-TEMPLATE.md`.
4. Create `docs/trackers/TRACKER-<id>-<slug>.md` from `docs/templates/TRACKER-TEMPLATE.md`.
5. Implement, then update `docs/specs/current-state.md` and `CHANGELOG.md`.
6. Run `npx tsx scripts/task-status.ts` to verify status.

## Legacy spec migration

Feature specs that used to live here (`0000-0062`) have been migrated to `docs/requirements/REQ-*.md`, with corresponding `TASK-*` and `TRACKER-*` files. The original `docs/specs/<id>-<slug>.md` files have been removed in favor of the requirement files.
