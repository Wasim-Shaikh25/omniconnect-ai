# TASK-0099 — Analytics JSON Data Views

- **Status:** Done
- **Owner:** devin
- **Requirement:** `docs/requirements/REQ-0099-analytics-json-views.md`
- **Tracker:** `docs/trackers/TRACKER-0099-analytics-json-views.md`
- **Modules:** analytics, admin, ecommerce
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Replace raw JSON dumps with structured viewers on analytics and admin pages.
- **Last updated:** 2026-08-09

## 1. Summary

Build a reusable `JsonViewer` component and small typed viewers for
`TrendSnapshot` and `Report` content so analytics, admin logs, and the adapter
preview no longer show raw JSON.

## 2. References

- Architecture: `docs/specs/current-state.md`
- Requirement: `docs/requirements/REQ-0099-analytics-json-views.md`
- Tracker: `docs/trackers/TRACKER-0099-analytics-json-views.md`
- Related files:
  - `src/app/stores/[projectId]/analytics/trends/page.tsx`
  - `src/app/stores/[projectId]/analytics/reports/page.tsx`
  - `src/app/admin/logs/page.tsx`
  - `src/components/connect-adapter-form.tsx`

## 3. Implementation Plan

### Step 1 — Reusable `JsonViewer`

Create `src/components/json-viewer.tsx` that accepts `data: unknown` and renders
primitives, arrays, and objects with collapsible nested sections, a max depth,
and a fallback to a `pre` only for circular/unknown values.

### Step 2 — `TrendSnapshotView`

Create `src/components/trend-snapshot-view.tsx` that branches on `snapshot.type`:

- `HASHTAG` — render `query`, `hashtagId`, and `topMedia` as a grid of media cards
  with thumbnails and metrics.
- `NICHE` — render `recommendations` and `insights` from the analysis.
- `AUDIO` — fallback to `JsonViewer`.

### Step 3 — `ReportView`

Create `src/components/report-view.tsx` that receives `Report.content` cast to
`MarketingPerformanceView` and renders summary, content, audience, product, and
campaign sections as cards.

### Step 4 — Page swaps

Replace `<pre>{JSON.stringify(...)}</pre>` blocks in the four listed files with
`<JsonViewer />`, `<TrendSnapshotView />`, or `<ReportView />` as appropriate.

### Step 5 — Tests

- `src/components/json-viewer.test.tsx` — primitives, arrays, objects, depth limit.
- `src/components/trend-snapshot-view.test.tsx` — HASHTAG topMedia list, NICHE
  recommendations.
- `src/components/report-view.test.tsx` — summary card and top posts list.

## 4. Subtasks

- [ ] Build `JsonViewer`.
- [ ] Build `TrendSnapshotView`.
- [ ] Build `ReportView`.
- [ ] Wire viewers into pages and forms.
- [ ] Add unit tests.
- [ ] Lint + typecheck + tests pass.

## 5. Acceptance Criteria

- [ ] Matches `REQ-0099`.
- [ ] No raw `JSON.stringify` remains on the four user-facing surfaces.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `CHANGELOG.md` updated.

## 6. Notes / Blockers

None.
