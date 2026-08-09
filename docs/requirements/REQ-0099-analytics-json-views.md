# REQ-0099 — Analytics JSON Data Views

## Status: Done

## Problem

Several user-facing and admin-facing pages render stored JSON (`Report.content`,
`TrendSnapshot.data`, `SystemLog.metadata`, generated `AdapterConfigMapping`) inside
a `<pre>` block. This is hard to read, does not surface important values, and looks
broken to non-technical users.

## Acceptance Criteria

1. Replace the raw JSON `<pre>` dumps in:
   - `src/app/stores/[projectId]/analytics/trends/page.tsx`
   - `src/app/stores/[projectId]/analytics/reports/page.tsx`
   - `src/app/admin/logs/page.tsx`
   - `src/components/connect-adapter-form.tsx`
   with a reusable, collapsible structured viewer or a type-specific card layout.
2. `analytics/trends` distinguishes `HASHTAG`, `NICHE`, and `AUDIO` snapshot types
   and renders media lists / recommendations / insights in a readable layout.
3. `analytics/reports` renders `MarketingPerformanceView` fields (summary,
   content, audience, product, campaign) as summary cards and lists instead of
   raw JSON.
4. `admin/logs` and `connect-adapter-form` use the shared `JsonViewer` for
   `metadata` and generated adapter config previews.
5. Unit tests cover the `JsonViewer` component and report/trend rendering.
6. Lint, typecheck, and build pass.

## Affected Files

- `src/components/json-viewer.tsx` (new)
- `src/components/trend-snapshot-view.tsx` (new)
- `src/components/report-view.tsx` (new)
- `src/app/stores/[projectId]/analytics/trends/page.tsx`
- `src/app/stores/[projectId]/analytics/reports/page.tsx`
- `src/app/admin/logs/page.tsx`
- `src/components/connect-adapter-form.tsx`

## Priority: Medium

UX polish — no data loss, but analytics pages currently look broken to users.
