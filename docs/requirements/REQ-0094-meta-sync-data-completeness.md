# REQ-0094 — Meta Sync Data Completeness

## Status: Implemented

## Problem

Three data fields are silently missing or hardcoded after every Meta sync, producing
incorrect analysis output and misleading AI explanations:

### Bug 1 — Media catalog capped at 25 posts (no pagination)

`syncMediaCatalog()` in `src/modules/analytics/application/marketing-insights.ts` calls
`metaService.getAccountMedia()` which issues a single request to the Graph API with
`limit=25`. Accounts with more than 25 posts never have their older posts synced.
The dataset fetcher (`prisma-dataset-fetcher.ts`) then runs `top_n`, `best_time`,
`anomaly_check`, and `cohort_trend` queries over only the most-recent 25, producing
skewed AI analysis results.

### Bug 2 — `websiteClicks` stored as `null` every sync

`syncAccountAnalytics()` stores `websiteClicks: null` unconditionally
(`src/modules/analytics/application/marketing-insights.ts` line ~104).
The `profile_quality` analysis dataset therefore always shows `websiteClicks: 0`,
silently omitting a key conversion-intent signal even when the Meta account has
real click data available via `website_clicks` in the Page Insights API response.

### Bug 3 — `bioLength` hardcoded to 0

`prisma-dataset-fetcher.ts` `profile_quality` dataset sets `bioLength: 0` always.
`getAccountMedia()` and `getPageInsights()` in
`src/modules/meta/infrastructure/meta.service.ts` never request `biography` or
`profile_picture_url` fields from the Graph API. The AI profile-quality prompt
therefore always sees an empty bio, producing false recommendations to "add a bio"
regardless of the actual account state.

## Acceptance Criteria

1. `getAccountMedia()` paginates through all pages of the user's media catalog using
   the `after` cursor from `paging.cursors` until no more pages are returned (or a
   configurable hard cap of e.g. 500 posts is reached to prevent runaway API calls).
2. `getPageInsights()` requests the `biography` field (and `profile_picture_url`) from
   the Graph API and returns them in the result type.
3. `syncAccountAnalytics()` persists `biography` length to the account-analytics record
   and sets `websiteClicks` from the real API value when available.
4. `prisma-dataset-fetcher.ts` `profile_quality` dataset uses the stored `bioLength`
   and `websiteClicks` values rather than hardcoded zeros.
5. All existing tests pass; new unit tests cover pagination cursor loop and the new
   fields on the account-analytics record.

## Affected Files

- `src/modules/meta/infrastructure/meta.service.ts` — add `biography`, `profile_picture_url`, `website_clicks` to field requests; implement cursor pagination
- `src/modules/analytics/application/marketing-insights.ts` — drive paginated fetch; persist biography length and real websiteClicks
- `src/modules/analytics/infrastructure/prisma-dataset-fetcher.ts` — read stored bioLength/websiteClicks
- Schema: `biography` / `profilePictureUrl` columns added to `AccountInsight` model (migration `20260807144559_add_account_profile_fields`)

## Priority: High

Lost data on every sync; affects analysis accuracy for all users with >25 posts.
