# TASK-0079: Meta Growth Engine

- **Status:** Implemented
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0079-meta-growth-engine.md`
- **Tracker:** `docs/trackers/TRACKER-0079-meta-growth-engine.md`
- **Module(s):** content (new), meta
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Content publishing, scheduling, hashtag intelligence, best-time-to-post.
- **Last updated:** 2026-08-06 (T-021 landed; T-022 WhatsApp deferred to post-Meta-Business-verification)

## 1. Summary

Content publishing via Instagram Content Publishing API (two-step container flow), scheduling via BullMQ, Content Studio UI, hashtag intelligence, and best-time-to-post analysis.

## 2. References

- Requirement: `docs/requirements/REQ-0079-meta-growth-engine.md`
- Related files:
  - `src/modules/content/` (new module)
  - `src/modules/meta/infrastructure/meta-api.ts`

## 3. Implementation Plan

### Step 1 — Meta OAuth Flow ✅
Connect Instagram Business/Creator account + Facebook Page via Graph API OAuth.

- Added `getMetaOAuthUrl`, `exchangeMetaOAuthCode`, and `fetchInstagramAccount` in
  `src/modules/meta/infrastructure/meta-oauth.ts`.
- Added `GET /api/meta/auth` and `GET /api/meta/callback` route handlers.
- Added `MetaConnectionCard` on `/stores/[projectId]/settings` with Connect/Reconnect button.
- Token is encrypted at rest via `PrismaMetaIntegrationRepository.connect`.

### Step 2 — Content Publishing API
Two-step: create media container → poll until FINISHED → publish. Support photo, carousel, Reel, Story.

### Step 3 — Content Scheduling
Save scheduled posts to DB. BullMQ delayed jobs trigger publish at scheduled time.

### Step 4 — Content Studio UI
AI idea generation, caption editor with AI assist, hashtag suggestions, visual calendar, schedule picker.

### Step 5 — Hashtag Intelligence
Meta Hashtag Search API (30 unique/7 days) + AI scoring for competition, reach, relevance.

### Step 6 — Best Time to Post
Insights API `online_followers` + historical post performance → AI correlation → day/hour/score results.

## 4. Subtasks

- [x] T-021: Meta OAuth flow
- [x] T-021b: Meta OAuth security fixes — signed CSRF state with session-bound cookie, `Authorization: Bearer` token header, no secret logging, APP_URL-derived redirect URI, and no Page-id fallback for Instagram accounts.
- [d] T-022: WhatsApp Business API connection — **Deferred**: requires Meta Business verification and a dedicated WhatsApp Business API phone number; recorded as a post-launch integration task.
- [x] T-023: Content Publishing API
- [x] T-023b: Content Publishing API review fixes — `access_token` sent in `Authorization` header, `media_publish` uses safe URL construction, polling short-circuits on non-`FINISHED` statuses, and carousel size validation returns friendly messages.
- [x] T-024: Content scheduling
- [x] T-025: Content Studio UI (publish form integrated on `/stores/[projectId]/content`)
- [x] T-058: Hashtag intelligence
- [x] T-059: Best time to post
- [x] T-069: Content calendar UI — visual grid preview, drag-to-reschedule (P1)
- [x] T-071: Trending reels/audio analysis — AI-powered niche pattern detection (P2)

## 5. Acceptance Criteria

- [x] Matches REQ-0079 acceptance criteria.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- T-021, T-021b, T-023, T-023b, T-024, T-058, T-059, T-069, T-070, and T-071 completed on the respective feature branches; T-022 (WhatsApp) is deferred to post-Meta-Business-verification.
- Instagram Content Publishing API requires Meta App Review approval.
- Hashtag API limited to 30 unique lookups per 7-day rolling window.
