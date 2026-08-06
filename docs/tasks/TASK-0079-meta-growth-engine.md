# TASK-0079: Meta Growth Engine

- **Status:** In Progress
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0079-meta-growth-engine.md`
- **Tracker:** `docs/trackers/TRACKER-0079-meta-growth-engine.md`
- **Module(s):** content (new), meta
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Content publishing, scheduling, hashtag intelligence, best-time-to-post.
- **Last updated:** 2026-08-06 (T-058/T-059/T-069 batch complete on `devin/req-0079-hashtag-besttime-calendar-1786001674`)

## 1. Summary

Content publishing via Instagram Content Publishing API (two-step container flow), scheduling via BullMQ, Content Studio UI, hashtag intelligence, and best-time-to-post analysis.

## 2. References

- Requirement: `docs/requirements/REQ-0079-meta-growth-engine.md`
- Related files:
  - `src/modules/content/` (new module)
  - `src/modules/meta/infrastructure/meta-api.ts`

## 3. Implementation Plan

### Step 1 — Meta OAuth Flow
Connect Instagram Business/Creator account + Facebook Page via Graph API OAuth.

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

- [ ] T-021: Meta OAuth flow
- [ ] T-022: WhatsApp Business API connection
- [x] T-023: Content Publishing API
- [x] T-024: Content scheduling
- [x] T-025: Content Studio UI (publish form integrated on `/stores/[projectId]/content`)
- [x] T-058: Hashtag intelligence
- [x] T-059: Best time to post
- [x] T-069: Content calendar UI — visual grid preview, drag-to-reschedule (P1)
- [ ] T-071: Trending reels/audio analysis — AI-powered niche pattern detection (P2)

## 5. Acceptance Criteria

- [ ] Matches REQ-0079 acceptance criteria.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- T-023, T-024, T-058, T-059, T-069, and T-070 completed on the respective feature branches. T-021 (Meta OAuth), T-022 (WhatsApp), and T-071 (trending reels) remain open.
- Instagram Content Publishing API requires Meta App Review approval.
- Hashtag API limited to 30 unique lookups per 7-day rolling window.
