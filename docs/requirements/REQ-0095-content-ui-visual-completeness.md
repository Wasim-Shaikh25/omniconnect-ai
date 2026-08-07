# REQ-0095 — Content UI Visual Completeness

## Status: Partially Implemented

Bugs 1, 2, and 4 are implemented. Bug 3 (story-specific metrics) is deferred: the
codebase has no existing integration with Meta's `/{ig-user-id}/stories` Graph API
edge at all (only outbound story *publishing* exists, in `publishMedia()`). Building
story ingestion is a net-new feature — a new Graph API edge integration, insights
parsing for story-only metrics, and expiry-aware sync semantics — not a small bug
fix, so it is split out as a follow-up (see REQ-0098) rather than rushed here.

## Problem

The content analytics UI is text-only and missing several fields that are already
fetched from the Meta Graph API but never rendered.

### Bug 1 — Post thumbnails not shown

`getAccountMedia()` requests `media_url` and `thumbnail_url` from Meta and both are
stored on `MediaPost` in the database. However:
- `src/app/stores/[projectId]/analytics/content/page.tsx` renders only text (mediaType,
  caption, hashtags, metrics). No `<img>` or `<video>` is shown.
- `src/app/stores/[projectId]/analytics/content/[mediaPostId]/page.tsx` likewise shows
  no visual preview.

Users have no way to visually identify which post they are looking at without
reading the caption text.

### Bug 2 — No Instagram profile card

The analytics main page (`/stores/[projectId]/analytics`) shows account metrics
(followers, reach, impressions) but no profile identity card — no profile picture,
no bio text, no follower/following summary with the account's avatar. There is no
dedicated "My Instagram profile" view anywhere in the UI.

### Bug 3 — Story-specific engagement metrics never collected or shown

Instagram Stories have engagement signals not available for Feed posts: `exits`,
`taps_forward`, `taps_back`, `replies`. These are not requested from the Meta Insights
API during `syncMediaCatalog` and have no database column. The content detail page
for Stories therefore shows the same metric set as a Reel or image post, which is
incorrect and misleading.

### Bug 4 — Engagement rate missing from post detail page

The post list page (`content/page.tsx`) shows `engagementRate` but the post detail
page (`content/[mediaPostId]/page.tsx`) omits it from the 8-metric grid.

## Acceptance Criteria

1. `content/page.tsx` — Each post card renders a thumbnail: `<img src={post.thumbnailUrl ?? post.mediaUrl}>` (aspect-ratio square, max 120 px, `object-cover`). `VIDEO` type posts use `thumbnail_url`; `IMAGE`/`CAROUSEL_ALBUM` use `media_url`. Falls back gracefully when both are null.
2. `content/[mediaPostId]/page.tsx` — Shows the same thumbnail at the top of the card. Adds `engagementRate` to the metrics grid.
3. Analytics main page — When `pageInsights.profilePictureUrl` is set (see REQ-0094), render an account identity card: profile picture, `@username`, follower count, bio text (if available).
4. Schema + `syncMediaCatalog`: add `storyExits`, `storyTapsForward`, `storyTapsBack`, `storyReplies` columns to `MediaPost`/`MediaInsight`; request `story_exits,taps_forward,taps_back` from the Stories Insights endpoint for `STORY`-type media; display them on the detail page under a "Story metrics" heading when `post.mediaType === "STORY"`.
5. Lint, typecheck, and build pass.

## Affected Files

- `src/app/stores/[projectId]/analytics/content/page.tsx`
- `src/app/stores/[projectId]/analytics/content/[mediaPostId]/page.tsx`
- `src/app/stores/[projectId]/analytics/page.tsx`
- `src/modules/meta/infrastructure/meta.service.ts` — story insights fetch
- `src/modules/analytics/application/marketing-insights.ts` — store story fields
- Prisma schema: add story metric columns; migration required

## Priority: Medium

Correctness and UX — no data loss but users can't visually navigate their own posts.
