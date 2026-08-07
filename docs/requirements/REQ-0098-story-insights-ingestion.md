# REQ-0098 — Instagram Story Insights Ingestion

## Status: Proposed (follow-up, split out from REQ-0095)

## Problem

The codebase has no integration with Meta's Stories Graph API at all on the ingest
side. `GraphApiMetaService.publishMedia()` can *publish* a Story (media_type=STORIES),
but nothing ever calls the `/{ig-user-id}/stories` edge to read back a connected
account's active/expired stories, and no story-specific insight metrics (`exits`,
`replies`, `taps_forward`, `taps_back`) are fetched or stored anywhere.

As a result, `MediaPost.mediaType === "STORY"` records are never created by the
regular sync path (`syncMediaCatalog` only reads `/{ig-user-id}/media`, which
excludes Stories), and the content analytics UI has no data to show for Stories
even if a user asks about them.

## Acceptance Criteria

1. Add a `getAccountStories(projectId)` method to `MetaService` that calls
   `/{ig-user-id}/stories` and maps results to `MetaMediaItem` with
   `mediaType: "STORY"`, `mediaProductType: "STORIES"`.
2. Add story-only insight metrics to `MetaMediaMetrics`: `storyExits`,
   `storyRepliesCount`, `storyTapsForward`, `storyTapsBack`. Fetch these via the
   `/{media-id}/insights?metric=exits,replies,taps_forward,taps_back` endpoint
   for STORY-type media only (Feed/Reel insights use a different metric set and
   will reject unsupported metric names).
3. Add corresponding nullable columns to `MediaInsight` (`storyExits`,
   `storyRepliesCount`, `storyTapsForward`, `storyTapsBack`) with a migration.
4. `syncMediaCatalog()` also calls `getAccountStories()` and upserts the results,
   being mindful that Meta only returns *active* (unexpired, <24h) stories — a
   synced Story's insights become unavailable after expiry, so the sync must
   tolerate 404s/permission errors from Meta for expired story IDs without
   failing the whole sync.
5. Content detail page (`/stores/[projectId]/analytics/content/[mediaPostId]`)
   renders a "Story metrics" section when `post.mediaType === "STORY"` and any
   story field is non-null.
6. Tests cover: story-only metric fetch, upsert of story insights, graceful
   handling of an expired/inaccessible story during sync.

## Affected Files

- `src/modules/meta/application/ports.ts` — new port method + metric fields
- `src/modules/meta/infrastructure/meta.service.ts` — `/stories` edge call, story insights fetch
- `src/modules/analytics/application/marketing-insights.ts` — sync stories alongside feed media
- `src/app/stores/[projectId]/analytics/content/[mediaPostId]/page.tsx` — story metrics section
- `prisma/schema.prisma` — new `MediaInsight` columns + migration

## Priority: Low

No current user-facing regression (Stories were never synced), so this is additive
scope rather than a fix for lost data.
