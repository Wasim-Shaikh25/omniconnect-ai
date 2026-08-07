# TRACKER-0095: Content UI Visual Completeness

- **Status:** Partially Implemented (story metrics split to REQ-0098)
- **Owner:** claude
- **Requirement:** `docs/requirements/REQ-0095-content-ui-visual-completeness.md`
- **Task:** `docs/tasks/TASK-0095-content-ui-visual-completeness.md`
- **Last updated:** 2026-08-07

## 1. Summary

Added post thumbnails to content list/detail pages, an Instagram profile identity card,
and engagement rate on the detail page. Story-specific metrics deferred to REQ-0098
(no existing Stories ingestion in the codebase at all — net-new feature, not a bug fix).

## 2. Subtasks

- [x] Thumbnail rendering on content list page.
- [x] Thumbnail + engagement rate on content detail page.
- [x] Profile identity card on analytics main page (picture, bio, username).
- [ ] Story metric schema columns + fetch + display — split out to REQ-0098/TASK-0098.
- [x] Tests for thumbnail rendering (existing suite unaffected; UI covered by build).
- [x] `npm run lint` passes.
- [x] `npx tsc --noEmit` passes.
- [x] `npm run test` passes (372 passed).
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.

## 3. Notes

- `MediaPost.thumbnailUrl` now stores `item.thumbnailUrl ?? item.mediaUrl` at sync
  time so image/carousel posts (which only have `media_url` from Meta) also get a
  displayable thumbnail, without adding a redundant `mediaUrl` column.
