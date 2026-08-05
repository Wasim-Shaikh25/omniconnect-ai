# REQ-0065 — Remaining Intelligence Layer Completion

- **Status:** Superseded — see REQ-0089
- **Priority:** High
- **Created:** 2026-07-29
- **Last updated:** 2026-07-29

> **⚠️ SUPERSEDED (Platform V2)** — replaced by:
> - `docs/requirements/REQ-0089-intelligence-layer.md`
> Retained for historical reference only. Do not use for new implementation.

## Goal

Close out the remaining intelligence layer and daily-marketing work identified in the REQ/TASK/TRACKER audit. Ensure the task tracker accurately reflects that all planned product capabilities are implemented and ship the final missing UI for the daily marketing rhythm.

## Acceptance Criteria

- [x] All cancelled, out-of-scope Meta-first requirements/tasks/trackers are removed from `docs/` (`REQ-0019`, `REQ-0027`, `REQ-0028`, `REQ-0029`).
- [x] The 8 remaining requirements (`0033`, `0034`, `0036`, `0037`, `0046`, `0047`, `0048`, `0050`) are audited line-by-line against the codebase.
- [x] Every completed subtask is marked `[x]` and statuses are set to `Implemented` (REQ), `Completed` (TASK), and `Done` (TRACKER).
- [x] A store-scoped `/stores/[storeId]/daily-marketing` page exists and renders the daily brief, today’s actions, recommendations, product opportunities, DM/comment patterns, competitor alerts, trending hashtags, and best time to post.
- [x] A top-level `/daily-marketing` route redirects users to the first available store.
- [x] The main navigation sidebar links to **Daily Marketing** under Home.
- [x] `npx tsx scripts/task-status.ts --summary` reports 0 remaining tasks.
- [x] `npm run lint`, `npm run typecheck`, and `npm run build` pass.
