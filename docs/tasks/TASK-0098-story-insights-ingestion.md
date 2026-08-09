# TASK-0098 — Instagram Story Insights Ingestion

- **Status:** Done
- **Owner:** devin
- **Requirement:** `docs/requirements/REQ-0098-story-insights-ingestion.md`
- **Tracker:** `docs/trackers/TRACKER-0098-story-insights-ingestion.md`
- **Modules:** meta, analytics
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Ingest Instagram Stories and story-specific insights (exits, replies, taps).
- **Last updated:** 2026-08-09

## 1. Summary

Add a `/stories` Graph API edge to `MetaService`, persist story-only metrics in
`MediaInsight`, merge stories into `syncMediaCatalog`, and surface them on the
content detail page.

## 2. References

- Architecture: `docs/specs/current-state.md`
- Requirement: `docs/requirements/REQ-0098-story-insights-ingestion.md`
- Tracker: `docs/trackers/TRACKER-0098-story-insights-ingestion.md`
- Related files:
  - `prisma/schema.prisma` → `MediaInsight`
  - `src/modules/meta/application/ports.ts`
  - `src/modules/meta/infrastructure/meta.service.ts`
  - `src/modules/analytics/application/marketing-insights.ts`
  - `src/modules/analytics/application/ports.ts`
  - `src/modules/analytics/domain/types.ts`
  - `src/modules/analytics/infrastructure/marketing-insights.repository.ts`
  - `src/app/stores/[projectId]/analytics/content/[mediaPostId]/page.tsx`

## 3. Implementation Plan

### Step 1 — Schema + migration

Add to `MediaInsight`:

```prisma
storyExits          Int?
storyRepliesCount   Int?
storyTapsForward    Int?
storyTapsBack       Int?
```

Generate migration `add_story_metrics`.

### Step 2 — Port + types

- `MetaMediaMetrics` adds `storyExits`, `storyRepliesCount`, `storyTapsForward`,
  `storyTapsBack` (all optional numbers).
- `MetaService` adds `getAccountStories(projectId, limit?)`.
- `UpsertMediaInsightInput` adds the four fields.
- `MediaInsight` domain type adds the four fields.

### Step 3 — Meta service

- `getAccountStories` calls `/{ig-user-id}/stories` and maps to `MetaMediaItem[]`
  with `mediaType: "STORY"` and `mediaProductType: "STORIES"`.
- `fetchMediaInsights` requests `exits,replies,taps_forward,taps_back` for
  `STORIES` media in addition to the base metrics.
- Map story metric values into `MetaMediaMetrics`.

### Step 4 — Marketing insights sync

- `syncMediaCatalog()` fetches feed media and story media in parallel (or
  sequentially when rate limit matters), upserts both, and tolerates 404s from
  expired stories.
- `mapMetricsToInsightInput` copies story fields to `UpsertMediaInsightInput`.

### Step 5 — UI

In `content/[mediaPostId]/page.tsx`, render a "Story metrics" section when
`post.mediaType === "STORY"` and any story field is non-null.

### Step 6 — Tests

- `meta.service.test.ts` — `getAccountStories` maps a Graph API story response and
  requests story-only insight metrics.
- `meta.service.test.ts` — expired story 404 is tolerated during sync.
- `marketing-insights.test.ts` (integration) — `syncMediaCatalog` upserts a STORY
  post with story metrics.
- `content/[mediaPostId]/page.test.tsx` (unit) — story metrics render for
  `mediaType === "STORY"`.

## 4. Subtasks

- [ ] Schema migration.
- [ ] Update ports, domain types, and repository mappers.
- [ ] Implement `getAccountStories` and story insights in Meta service.
- [ ] Integrate stories into `syncMediaCatalog` with 404 tolerance.
- [ ] Add story metrics UI on content detail page.
- [ ] Add tests.
- [ ] Lint + typecheck + tests + build pass.

## 5. Acceptance Criteria

- [ ] Matches `REQ-0098`.
- [ ] Story insights ingest and display.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `CHANGELOG.md` updated.

## 6. Notes / Blockers

None.
