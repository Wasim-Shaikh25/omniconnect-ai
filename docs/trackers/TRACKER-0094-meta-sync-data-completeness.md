# TRACKER-0094: Meta Sync Data Completeness

- **Status:** Implemented
- **Owner:** claude
- **Requirement:** `docs/requirements/REQ-0094-meta-sync-data-completeness.md`
- **Task:** `docs/tasks/TASK-0094-meta-sync-data-completeness.md`
- **Last updated:** 2026-08-07

## 1. Summary

Fixed silent data gaps in Meta sync: media catalog capped at 25 posts (no pagination),
`websiteClicks` always null, `bioLength` hardcoded to 0.

## 2. Subtasks

- [x] Add `biography`, `profile_picture_url` fields to Page Insights fetch.
- [x] Add `website_clicks` metric to Page Insights fetch.
- [x] Implement cursor pagination in `getAccountMedia()` (follows `paging.next`, capped by requested limit).
- [x] Schema migration: `biography`, `profilePictureUrl` added to `AccountInsight` (`20260807144559_add_account_profile_fields`). `websiteClicks` column already existed, only the write path was fixed. `bioLength` is derived at read time from `biography.length`, not stored redundantly.
- [x] `syncAccountAnalytics()` persists new fields.
- [x] `prisma-dataset-fetcher.ts` reads stored values instead of hardcoded 0.
- [x] Unit tests for pagination and new fields (`meta.service.test.ts`).
- [x] `npm run lint` passes.
- [x] `npx tsc --noEmit` passes.
- [x] `npm run test` passes (372 passed).
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.

## 3. Notes

- `syncMediaCatalog` limit raised from 25 to 100 (not unbounded) to bound Graph API
  call volume — each media item also costs a separate insights call against the
  200 calls/hour per-project rate limit.
