---
description: 0047 — Marketing Intelligence Connectivity
---

# REQ-0047: 0047 — Marketing Intelligence Connectivity

- **Status:** Draft
- **Owner:** wasim
- **Module(s):** `content`, `analytics`, `competitors`, `conversations`, `social`, `ecommerce`, `intelligence`, `ai`
- **Original spec path:** `docs/specs/0047-marketing-intelligence-connectivity.md` (restructured)
- **Task:** `docs/tasks/TASK-0047-marketing-intelligence-connectivity.md`
- **Tracker:** `docs/trackers/TRACKER-0047-marketing-intelligence-connectivity.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0047-marketing-intelligence-connectivity.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** `content`, `analytics`, `competitors`, `conversations`, `social`, `ecommerce`, `intelligence`, `ai`
- **Status:** Draft
- **Owner:** wasim
- **Related task(s):** `docs/tasks/TASK-371-marketing-intelligence.md`
- **Last updated:** 2026-07-25

## 1. Summary

OmniConnect is repositioned as the **AI Marketing & Commerce Platform for Instagram and Facebook Businesses**. The highest-value work is not adding new modules, but connecting the existing modules so that every interaction — posts, comments, DMs, followers, competitors, and products — becomes an actionable marketing decision. This spec defines the missing connections: a unified **Marketing Memory**, grounded content recommendations, benchmark-driven competitor intelligence, DM/comment insight loops, marketing-centered analytics, product promotion scoring, and a **Marketing Brain** daily brief.

## 2. Goals

1. **Ground Content Studio in real data.** Every content recommendation must be built from competitor posts, own best-performing posts, audience comments, DMs, product catalog, current campaigns, analytics, and trending topics.
2. **Close the analytics loop.** Post performance must flow through "why it performed", competitor comparison, audience reaction, and AI learning into the next content recommendation.
3. **Make competitor analysis active.** Detect competitor changes, benchmark them against the workspace, and suggest concrete adaptations.
4. **Turn DM patterns into marketing.** Repeated customer questions become marketing insights, content ideas, and campaign suggestions.
5. **Treat comments as market research.** Objections (e.g. "price is too high") update analytics, campaign, content, and sales strategy.
6. **Reorganize analytics around marketing questions.** Content, audience, product, and campaign performance are first-class views.
7. **Score products for promotion.** Each product gets Content, Engagement, Conversation, Sales, Trend, and Competitor scores.
8. **Build one Marketing Memory.** A single per-workspace memory stores successful hooks, failed captions, trending hashtags, winning posting times, high-converting products, customer objections, competitor changes, and campaign history.
9. **Generate multi-insight outputs from the inbox.** One high-volume DM theme can produce a product insight, a marketing insight, a content idea, a campaign suggestion, and a business alert.
10. **Benchmark competitors.** Compare competitor posting frequency, hook length, trending-audio usage, and engagement against the workspace.
11. **Explain marketing failures and wins.** AI should explain performance drivers (hook retention, caption length, product visibility, trending audio, comment sentiment).
12. **Transform Business Brain into Marketing Brain.** Produce a daily marketing brief: follower growth, content opportunity, competitor alert, products to promote, DM insights, comment insights, campaign performance, best posting time, recommended Reel, trending audio, recommended hashtags, expected reach, expected sales, and today's priorities.

## 3. Non-Goals

- Expanding to new social networks beyond Meta (Instagram/Facebook).
- Building a general-purpose BI dashboard; this is marketing-specific insight.
- Replacing human marketers; the system recommends, humans approve.
- Real-time streaming ingestion; keep the existing event-driven, asynchronous batch model.

## 4. User Stories

- As a store owner, I want a daily marketing brief so that I know exactly what to do today to grow my page and sales.
- As a marketer, I want content ideas grounded in my own data, competitor data, and customer questions so that I create posts that sell.
- As a founder, I want to see why a Reel underperformed so that I improve the next one.
- As a merchandiser, I want to know which products deserve promotion so that I align content and inventory.
- As a community manager, I want repeated DM questions turned into content ideas so that I stop answering the same thing manually.

## 5. Domain Model

### New value objects / aggregates

- `MarketingMemory` — per-workspace aggregate of marketing knowledge.
  - `successfulHooks: { text, usageCount, avgEngagement, firstSeenAt, lastSeenAt }[]`
  - `failedCaptions: { text, reason, seenAt }[]`
  - `trendingHashtags: { tag, postCount, engagement, firstSeenAt, lastSeenAt }[]`
  - `winningPostingTimes: { dayOfWeek, hour, engagementScore }[]`
  - `highConvertingProducts: { productId, conversionScore, evidence }[]`
  - `customerObjections: { phrase, frequency, firstSeenAt, lastSeenAt }[]`
  - `competitorChanges: { trackedAccountId, changeType, before, after, detectedAt }[]`
  - `campaignHistory: { campaignId, outcome, lessons, endedAt }[]`
- `ProductScore` — scores for promotion.
  - `contentScore`, `engagementScore`, `conversationScore`, `salesScore`, `trendScore`, `competitorScore`
  - `compositeScore` = weighted sum
  - `updatedAt`
- `MarketingInsight` — a marketing-oriented interpretation of raw signals.
  - `type`: `CONTENT_OPPORTUNITY` | `AUDIENCE_SHIFT` | `PRODUCT_PROMOTION` | `PRICE_OBJECTION` | `COMPETITOR_ALERT` | `CAMPAIGN_PERFORMANCE` | `DM_PATTERN` | `COMMENT_PATTERN`
  - `sourceModules[]` — which modules contributed data
  - `evidence` — signal IDs, metric IDs, product IDs, post IDs, comment IDs, DM categories
  - `confidence` 0-1
  - `recommendedActions[]` — references to `Recommendation` or `ContentIdea`
- `CompetitorBenchmark` — comparison between workspace and a competitor.
  - `dimensions[]`: posting frequency, reel frequency, avg hook length, trending-audio usage rate, engagement rate, follower growth
  - `gaps[]`: where workspace is behind and by how much
  - `suggestions[]` mapped to `ContentIdea` or `Recommendation`
- `DmInsight` / `CommentInsight` — aggregated patterns from inbox/comments.
  - `category` (e.g. `PRICE_OBJECTION`, `SIZE_QUESTION`, `AVAILABILITY`, `COMPLAINT`, `COMPLIMENT`)
  - `frequency` over a period
  - `samplePhrases[]` (anonymized, no PII)
  - `productIds[]` when relevant

### New / updated domain events

- Published by `conversations`:
  - `DmPatternDetected { storeId, category, frequency, samplePhrases, productIds }`
- Published by `social` (comments):
  - `CommentPatternDetected { storeId, category, frequency, samplePhrases, productIds }`
- Published by `competitors`:
  - `CompetitorChangeDetected { trackedAccountId, changeType, before, after }`
  - `CompetitorBenchmarkReady { trackedAccountId, benchmark }`
- Published by `content`:
  - `ContentIdeasGenerated { storeId, source, ideas[], groundingEvidence }`
- Published by `analytics`:
  - `MarketingPerformanceUpdated { storeId, dimensions }`
- Published by `intelligence`:
  - `MarketingMemoryUpdated { organizationId, storeId, memory }`
  - `DailyMarketingBriefGenerated { organizationId, storeId, brief }`
- Consumed by `ai` (Business / Marketing Brain):
  - `DailyMarketingBriefGenerated`, `MarketingMemoryUpdated`, `ContentIdeasGenerated`

## 6. Public Contract

### `conversations`
- Exposes `detectDmPatterns(storeId, since)` → returns `DmInsight[]` and publishes `DmPatternDetected`.
- Redacts all PII; only exports categories, counts, and anonymized sample phrases.

### `social` / comments
- Exposes `detectCommentPatterns(storeId, since)` → returns `CommentInsight[]` and publishes `CommentPatternDetected`.

### `competitors`
- Exposes `detectCompetitorChanges(organizationId, storeId)` → publishes `CompetitorChangeDetected`.
- Exposes `benchmarkCompetitor(organizationId, storeId, trackedAccountId)` → returns `CompetitorBenchmark` and publishes `CompetitorBenchmarkReady`.

### `analytics`
- Exposes `getMarketingPerformance(storeId, period)` → returns marketing-centered analytics.
- Publishes `MarketingPerformanceUpdated`.

### `ecommerce`
- Exposes `computeProductScores(storeId)` → returns `ProductScore[]`.
- Publishes `ProductScoresUpdated`.

### `content`
- Exposes `generateContentIdeas(input: { storeId, productIds?, competitorPostIds?, dmInsightIds?, commentInsightIds?, count? })` → returns `ContentIdea[]` and publishes `ContentIdeasGenerated`.
- Requires `MarketingBrainContext` input from `intelligence` or `ai`.

### `intelligence`
- Exposes `updateMarketingMemory(organizationId, storeId)` → aggregates signals from all modules, publishes `MarketingMemoryUpdated`.
- Exposes `generateDailyMarketingBrief(organizationId, storeId)` → consumes `MarketingMemory`, publishes `DailyMarketingBriefGenerated`.

### `ai`
- Exposes `askMarketingBrain(organizationId, storeId, question?)` → returns the daily brief or answers a follow-up using `MarketingMemory`.

## 7. Data / Persistence

- **Option A (MVP):** Extend existing `BusinessInsight` / `Recommendation` tables with `type` and `producedByModule` columns to store `MarketingInsight` and `ContentIdea` recommendations. Store `MarketingMemory` as a JSON snapshot in a new `MarketingMemory` table per `storeId` / `organizationId` with versioning.
- **Option B (later):** Split `MarketingInsight` and `Recommendation` into separate tables if volume/complexity grows.

New fields proposed:
- `Product` table: add `contentScore`, `engagementScore`, `conversationScore`, `salesScore`, `trendScore`, `competitorScore`, `compositeScore` (or a separate `ProductScore` table).
- `BusinessInsight`: add `type` enum values for marketing insights, `sourceModules`, `confidence`.
- `Recommendation`: add `sourceInsightIds`, `sourceModules`.
- New table `MarketingMemory`:
  - `id`, `organizationId`, `storeId`, `version`, `snapshot` (Json), `generatedAt`, `expiresAt`.
- New table `DmInsight` and `CommentInsight` (or reuse `BusinessInsight` with `type`):
  - `category`, `frequency`, `periodStart`, `periodEnd`, `samplePhrases` (Json array), `productIds` (Json array).
- New table `CompetitorBenchmark`:
  - `trackedAccountId`, `storeId`, `organizationId`, `dimensions` (Json), `gaps` (Json), `suggestions` (Json), `generatedAt`.

## 8. API / UI Surface

- `/business-brain` becomes the **Marketing Brain** home.
  - Daily brief widget (top of page).
  - Conversation-style follow-up.
  - Drill-down into each brief section.
- `/stores/[storeId]/content` (Content Studio):
  - "Generate ideas" now requires context: competitor posts, own best posts, comments, DMs, products, campaigns.
  - Show grounding evidence per idea.
- `/stores/[storeId]/analytics` reorganized into tabs:
  - Content, Audience, Product, Campaign.
- `/stores/[storeId]/products`:
  - Product promotion score column and "Why promote?" explanation.
- `/stores/[storeId]/inbox`:
  - "DM insights" panel (top question categories, content ideas from DMs).
- `/stores/[storeId]/competitors`:
  - Benchmark table and adaptation suggestions.

## 9. External Integrations

- **Meta Graph API** — posts, comments, competitor public posts, reels, insights (reach, engagement), DM and comment content (already ingested).
- **OpenAI / provider interface** — reasoning, content idea generation, explanation, daily brief synthesis.
- **Existing Shopify connector** — product catalog, orders, inventory for product scoring.
- No new third-party integrations.

## 10. Edge Cases & Failure Modes

- No competitors tracked → benchmark view is empty with onboarding prompt.
- No comments/DMs in period → pattern detection returns empty; brief notes low activity.
- Competitor account becomes private or unavailable → mark stale and exclude from benchmark.
- Product catalog not connected → product scores unavailable; content ideas fall back to trend/comment signals.
- DM content contains PII or sensitive data → redact and use only anonymized categories/counts.
- OpenAI rate limit → return cached brief with a staleness notice.
- Conflicting signals (e.g. DM says "too expensive" while sales are high) → confidence is lowered and both sides are surfaced.

## 11. Security & Privacy

- Never store raw DM/comment text in `MarketingMemory` beyond anonymized sample phrases.
- PII redaction before any marketing insight is persisted.
- `Customer.consent` already enforced in `generate-reply`; extend same redaction to DM/comment pattern extraction.
- Audit all marketing-insight generation and brief generation with metadata only.
- RBAC: store owner and staff can view; admin can audit.

## 12. Testing Strategy

- **Unit:** product score weighting, benchmark gap calculation, DM/comment categorization, brief section ordering.
- **Integration:** `conversations` → `intelligence` → `MarketingMemory` → `ai` Marketing Brain.
- **E2E:** simulate 7 days of DMs and comments → verify daily brief contains the right insight and a grounded content idea.

## 13. Acceptance Criteria

- [~] Content Studio generates ideas with grounding evidence (DM, comment, product, trend, and daily brief via `content.generateContentIdeasAction`); competitor/own posts and campaign analytics integration remain.
- [~] Analytics has Content / Audience / Product / Campaign marketing dimensions (`getMarketingPerformance` + `/analytics` dashboard); full attribution/post-to-order loop remains.
- [x] Competitor Analysis detects changes and produces benchmark gaps with actionable suggestions.
- [x] Workspace vs competitor side-by-side comparison (`getWorkspaceCompetitorComparison` + UI).
- [x] Repeated DM questions produce a `DmPatternDetected` insight and at least one campaign recommendation.
- [x] Repeated comment objections produce a `CommentPatternDetected` insight and update product/campaign strategy.
- [x] Each product has promotion scores and an explanation.
- [x] `MarketingMemory` is computed on demand across `content`, `ai`, `commerce`, and `intelligence` flows and drives the Daily Marketing dashboard.
- [x] Business Brain produces a daily marketing brief with all required sections.
- [~] AI explains post performance with concrete drivers (Marketing Brain prompt includes patterns; full post-performance drivers need media metrics).
- [x] No raw PII is stored in `MarketingMemory` or insights (sample phrases redact usernames/phone/email; patterns store categories).
- [x] Lint + typecheck + build pass.
- [x] `CHANGELOG.md` and task tracker updated.

## 14. Open Questions

- Should `MarketingMemory` be stored per `organizationId` or per `storeId`?
- Should product scores be computed synchronously on product sync or asynchronously in a background job?
- Should content ideas be generated on demand (user clicks) or pre-computed in the daily brief?
- Should the daily brief be cached and pushed (email/notification) or pulled (user opens app)?
- Which categorization model for DM/comment pattern detection: rule-based taxonomy, LLM classification, or both?
