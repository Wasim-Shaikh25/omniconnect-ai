---
description: Meta Content Intelligence & Marketing Insights
---

# REQ-0007: Meta Content Intelligence & Marketing Insights

- **Status:** Implemented
- **Owner:** wasim
- **Module(s):** analytics, reports, meta
- **Original spec path:** `docs/specs/0007-marketing-insights.md` (restructured)
- **Task:** `docs/tasks/TASK-0007-marketing-insights.md`
- **Tracker:** `docs/trackers/TRACKER-0007-marketing-insights.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0007-marketing-insights.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** analytics, reports, meta
- **Status:** Partially implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-110)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
Meta content intelligence turns a connected Instagram/Facebook account into actionable marketing insight. It fetches owned media, performance metrics, public hashtag/trend data and competitor signals, then uses the AI provider to explain *why* content is working (or not), surface trending songs/hashtags, filter by niche, and generate content ideas — including slide-by-slide Reel/storyboard recommendations.

## 2. Goals
- **Own-account analytics:** media catalog, per-post/reel/story/live insights, account-level growth, audience demographics.
- **Performance explanation:** AI-generated "why it worked / why it flopped" analysis for each post/reel.
- **Trending discovery:** hashtag research (top/recent media, post velocity, related hashtags), trending audio/songs where available, live video monitoring.
- **Competitor & niche monitoring:** track public competitor/creator handles; filter by niche, content type, engagement thresholds, follower size.
- **Content creation assistant:** generate Reel/carousel/story ideas, captions, hook scripts, hashtag sets, slide-by-slide storyboards, best-time-to-post suggestions.
- **Dashboard & reports:** KPI widgets, charts, top/medium/low performers, recommendation feed, scheduled/one-off AI reports.

## 3. Non-Goals
- Meta Ads insights/automation (Phase 2).
- Direct content publishing/scheduling (Phase 2/3).
- Automated visual/video generation (AI text-only; video rendering stays out of scope).
- Sentiment analysis of DMs is handled by the `conversations`/`ai` modules.
- WhatsApp analytics (Phase 2).

## 4. User Stories
- As a Store Owner, I want to see which of my posts and reels performed best so I can double down on winning formats.
- As a Store Owner, I want the AI to tell me why a reel underperformed and what to change next time.
- As a Marketer, I want to discover trending hashtags and songs in my niche so I can create relevant Reels.
- As a Marketer, I want to track competitor accounts and see what is working for them.
- As a Creator, I want a slide-by-slide Reel storyboard generated from a trending topic or my top-performing content.
- As a Store Owner, I want a weekly AI report summarizing growth, top content, and recommended next posts.

## 5. Domain Model

### Aggregates / Entities
- `MediaPost` — an owned/competitor media object (id, externalId, source, type, caption, hashtags, audio, publishedAt, metrics).
- `MediaInsight` — snapshot of metrics for a `MediaPost` (impressions, reach, likes, comments, shares, saves, plays, views, engagementRate, fetchedAt).
- `AccountInsight` — account-level snapshot (followers, profileViews, reach, impressions, websiteClicks, emailContacts, getDirections, phoneClicks, audienceGenderAge, audienceCities, fetchedAt).
- `TrendSnapshot` — a point-in-time trending dataset for a hashtag, audio, or niche.
- `Report` — an AI-generated document (title, period, type, dataSnapshot, markdownBody, status, createdBy).
- `TrackedAccount` — a public account/competitor the user wants to monitor (externalId, handle, platform, niche, note).

### Domain Events
- `AccountAnalyticsSynced` — account-level insights were fetched/updated.
- `MediaAnalyticsSynced` — media + insights were fetched/updated.
- `TrendingHashtagDiscovered` — new hashtag trend was captured.
- `CompetitorContentSynced` — tracked account content was refreshed.
- `ReportGenerated` — an AI report was produced.
- `ContentRecommendationCreated` — a new AI content idea was generated.

## 6. Public Contract (loose coupling)
- `AnalyticsService` port:
  - `getAccountMetrics(storeId, range, filters)`
  - `getMediaPerformance(storeId, range, filters)`
  - `getTrendingHashtags(storeId, niche, limit)`
  - `getTrendingAudio(storeId, niche, limit)`
  - `analyzePost(storeId, mediaId)`
  - `generateContentIdea(storeId, input)`
  - `getCompetitorSnapshot(storeId, trackedAccountId, range)`
- `ReportsService` port:
  - `generateWeeklyReport(storeId)`
  - `generateOnDemandReport(storeId, period, focus)`
  - `listReports(storeId)`
- `MetaAnalyticsClient` port (infra): fetch media, insights, hashtag search, live videos, competitor data.
- Consumes: `MetaMessageReceived`/`FirstTimeFollowerDetected` (for correlation), `StoreConnected` (to trigger initial sync).
- Emits: `AccountAnalyticsSynced`, `MediaAnalyticsSynced`, `TrendingHashtagDiscovered`, `CompetitorContentSynced`, `ReportGenerated`, `ContentRecommendationCreated`.

> Other modules interact ONLY through the contract above. No module imports this module's internals.

## 7. Data / Persistence
- New tables:
  - `MediaPost` (id, storeId, trackedAccountId nullable, externalId, platform, mediaType, permalink, caption, hashtags[], audioId nullable, audioName nullable, publishedAt, thumbnailUrl, createdAt, updatedAt).
  - `MediaInsight` (id, mediaPostId, impressions, reach, likes, comments, shares, saves, plays, views, engagementRate, fetchedAt).
  - `AccountInsight` (id, storeId, date, followers, profileViews, reach, impressions, websiteClicks, audienceJson, fetchedAt).
  - `TrendSnapshot` (id, storeId, type HASHTAG|AUDIO|NICHE, query, data JSON, fetchedAt).
  - `Report` (id, storeId, title, type, periodStart, periodEnd, dataSnapshot JSON, body, status, createdBy, createdAt).
  - `TrackedAccount` (id, storeId, handle, platform, externalId, niche, followerCount, lastSyncedAt, createdAt).
  - `ContentRecommendation` (id, storeId, type, title, outline, hashtags[], audioSuggestion, generatedAt, basedOnMediaIds JSON).
- Indexes: `MediaPost` by `(storeId, externalId)`, `(storeId, publishedAt)`, `MediaInsight` by `(mediaPostId, fetchedAt)`, `AccountInsight` by `(storeId, date)`, `TrendSnapshot` by `(storeId, type, query, fetchedAt)`.

## 8. API / UI Surface
- `/analytics` — dashboard with KPI cards, growth chart, top/medium/low performers.
- `/analytics/content` — media grid with filters (type, date, niche, engagement).
- `/analytics/content/[mediaId]` — detail view + AI "why it worked" analysis.
- `/analytics/trends` — hashtag/audio explorer, live videos, niche filters.
- `/analytics/competitors` — manage tracked accounts, view their top content.
- `/analytics/reports` — list and generate weekly/on-demand reports.
- `/analytics/recommendations` — AI-generated content ideas and slide-by-slide storyboards.
- Server actions: `syncAccountAnalytics`, `syncMediaCatalog`, `analyzeMedia`, `searchTrendingHashtags`, `trackCompetitor`, `generateReport`, `createContentIdea`.
- RBAC: Store Owner/Admin/Staff with tenant scoping.

## 9. External Integrations

### Meta Graph API (primary)
- `/me/accounts` and `/{ig-user-id}` to resolve connected Instagram Business Account.
- `/{ig-user-id}/media` — owned media (caption, media_type, media_url, permalink, timestamp, children, thumbnail_url).
- `/{media-id}/insights` — per-media metrics (`impressions`, `reach`, `likes`, `comments`, `shares`, `saves`, `plays`, `video_views`, `total_interactions`).
- `/{ig-user-id}/insights` — account-level metrics and audience demographics.
- `/{ig-user-id}/live_media` (if available) — currently live videos.
- `/ig_hashtag_search` + `/{hashtag-id}/top_media`/`recent_media` — public hashtag research (max 30 unique hashtags / 7 days).
- Permissions: `instagram_business_basic`, `instagram_business_manage_insights`, `pages_read_engagement`; for reels: `instagram_content_publish` is not required for read.
- Rate limits: 200 calls/hour/user for Instagram API; use cursor pagination, caching, and exponential backoff.

### Third-party enrichment (optional, where official API lacks data)
- **Apify Instagram actors** (`instagram-hashtag-scraper`, `instagram-reel-scraper`, `instagram-profile-scraper`) for competitor public data, trending audio, and hashtag velocity.
- **RapidAPI / third-party** for trending sounds (e.g. `instagram-data-api` providers) if Apify is not used.
- Important: scraped data must respect platform ToS and only be used for public profiles/hashtags the user is authorized to analyze.

### AI Provider
- Reuses the `AIProvider` port from the `ai` module.
- Prompts assembled from media metrics, captions, hashtags, audio, audience data, and niche context.

## 10. Edge Cases & Failure Modes
- Connected Meta account has no media yet → empty state with onboarding tip.
- Hashtag API limit reached → cache recent results and return stale data with warning.
- Media insights not yet available (Meta delays up to 48h) → show "data pending" and retry later.
- Token expired → re-sync meta connection via `meta` module.
- AI provider unavailable → fall back to structured data without narrative analysis.
- Competitor account is private or banned → error surfaced in UI.

## 11. Security & Privacy
- All tokens live in the `Integration` table and are accessed only by the `meta` infrastructure layer.
- Analytics queries are tenant-scoped by `storeId`/`organizationId`.
- Competitor data is public only; do not store private user content or DMs.
- Rate-limit outbound calls per store to avoid token suspension.

## 12. Testing Strategy
- Unit tests for `MediaInsight`/`AccountInsight` aggregation and engagement-rate calculations.
- Contract tests for `MetaAnalyticsClient` with a mocked Graph API.
- Integration tests for `ReportsService.generateWeeklyReport` using seeded media + mocked AI provider.
- UI tests for dashboard filters and recommendation generation flow.

## 13. Acceptance Criteria (Definition of Done)
- [ ] Domain modeled (`MediaPost`, `MediaInsight`, `AccountInsight`, `TrendSnapshot`, `Report`, `TrackedAccount`, `ContentRecommendation`) and events defined.
- [x] `MetaService` extended with `searchHashtag`, `getHashtagMedia`, and `getAccountMedia` Graph API methods, plus a dev fallback for public hashtag top/recent media.
- [x] Trending posts / competitor search UI at `/stores/[storeId]/commerce/trends` with creator-handle filter.
- [x] AI-generated content ideas (hook, format, why it works, hashtags, audio suggestion, best time, CTA, predicted engagement score).
- [x] Inline media previews and "AI idea from this post" generation on the Trends page.
- [x] Dedicated competitor analysis page with `TrackedAccount` persistence, media fetch, and AI strategy analysis.
- [x] "Discover competitors" search by niche/hashtag that ranks influential accounts by engagement and lets users track them.
- [ ] Full dashboard pages for content performance, trend explorer, reports, and recommendations.
- [ ] AI-generated "why it worked" analysis and slide-by-slide storyboards.
- [ ] Lint + typecheck + tests pass; `CHANGELOG.md` and `docs/tasks/backlog.md` updated.

## 14. Open Questions
1. Do we want to add an Apify/RapidAPI integration now, or start with official Graph API only and add scrapers later?
2. Should competitor tracking be available to all plans or gated by subscription tier?
3. What is the primary niche taxonomy? Free-text tags, predefined categories, or AI-generated clusters?
4. Should live-video monitoring be real-time or a daily sync?
5. Do we want to generate audio suggestions (trending songs) from public data, or keep audio as manual input until we have a reliable provider?
