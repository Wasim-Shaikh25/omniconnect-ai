# TASK-371: Marketing Intelligence Connectivity

- **Status:** In Progress
- **Spec:** `docs/specs/0047-marketing-intelligence-connectivity.md`, `docs/specs/0048-marketing-workflows-ui.md`
- **Module(s):** `content`, `analytics`, `competitors`, `conversations`, `social`, `ecommerce`, `intelligence`, `ai`
- **Owner:** wasim
- **Changelog entry:** `TASK-371 — Repositioned OmniConnect as the AI Marketing & Commerce Platform for Instagram and Facebook; connected content, analytics, competitors, conversations, products, and Business Brain into a unified Marketing Intelligence loop.`

## Description

See `docs/specs/0047-marketing-intelligence-connectivity.md`. This task captures the 12 product gaps identified after the architecture review and the decision to double down on marketing intelligence for Meta businesses. It is about connecting existing modules, not adding new ones.

## Subtasks

### Content Intelligence
- [x] 1. `ai.generatePostIdeas` consumes Marketing Memory (products, DM/comment themes, trending hashtags, daily brief, own best-performing posts, competitor changes) and returns grounding evidence.
- [x] 2. `content` exposes `generateContentIdeas(input)` and publishes `ContentIdeasGenerated` (new `content` module with `generateContentIdeasAction` and `ContentIdeasGenerated` domain event).
- [x] 3. Every content idea result includes grounding evidence (signals that influenced the recommendation).

### Analytics Loop
- [x] 4. Reorganize analytics around marketing: Content, Audience, Product, Campaign (`getMarketingPerformance` + `/stores/[storeId]/analytics` dashboard + four new subpages).
- [x] 5. `getMarketingPerformance` returns per-section `why` and `nextRecommendation` plus an overall `explanation`, closing the loop from metrics → reason → action.
- [x] 6. `analytics` publishes `MarketingPerformanceUpdated` from `getMarketingPerformance`.

### Competitor Intelligence
- [x] 7. `analytics` detects competitor changes and publishes `CompetitorChangeDetected` from `getCompetitorBenchmark` when last media post count changes.
- [x] 8. `analytics` computes competitor benchmark (post frequency, Reel ratio, hook/caption length, engagement, top hashtags, consistency) and publishes `CompetitorBenchmarkReady`.
- [x] 9. Competitor benchmark produces concrete adaptation suggestions (posting frequency, Reel ratio, hook length, engagement, top hashtags).

### DM & Comment Insights
- [x] 10. DM pattern extraction: `intelligence` reads conversations and extracts categories (price objection, size, availability, compliment, complaint).
- [x] 11. Comment pattern extraction: `intelligence` reads `social` comments and extracts the same categories.
- [x] 12. DM/comment insights generate marketing insights + content/campaign recommendations (`generateMarketingInsightsFromMemory` emits `DmPatternDetected`/`CommentPatternDetected` and `BusinessInsight` records; `recommendationService` creates DM campaign recommendations from these insights).

### Product Promotion Scores
- [x] 13. `intelligence` computes `ProductScore` (content, engagement, conversation, sales, trend, competitor) per product from ecommerce, conversation, and order data.
- [x] 14. Product catalog shows promotion score and explanation (`/commerce/catalog` displays product scores from `listCommerceCatalogAction`).

### Marketing Memory
- [x] 15. `intelligence` owns `MarketingMemory` aggregate and exposes `updateMarketingMemory()`.
- [x] 16. `MarketingMemory` includes product scores, DM/comment patterns, trending hashtags, competitor changes, campaign/coupon history, and placeholders for posting times and top posts.

### Inbox → Multi-Insight
- [x] 17. Repeated DM themes create product, marketing, content, campaign, and alert insights surfaced in the Daily Marketing dashboard.
- [x] 18. Pattern extraction redacts PII (usernames, emails, phone-like tokens) and only exports categories + anonymized phrases.

### Business Brain → Marketing Brain
- [x] 19. Rebrand `/business-brain` to Marketing Brain (UI label and prompt persona updated).
- [x] 20. Daily marketing brief with follower growth, content opportunity, competitor alert, products to promote, DM/comment insights, campaign performance, best posting time, recommended content idea, trending hashtags, and priorities.
- [x] 21. `ai.askBusinessBrain` consumes `MarketingMemory` and `DailyBriefRecord` when a store is selected, and its prompt now includes top products, DM/comment patterns, and today's brief.

### Marketing Workflows UI
- [x] 22. Create workflow navigation (`StoreWorkflowNav`) for Daily Marketing, Engagement, Growth, Revenue.
- [x] 23. Build Daily Marketing dashboard with Today’s Brief, Products To Push, DM Insights, Comment Insights, Followers, Best Time To Post, Competitor Changes, Trending Hashtags, Content Next Best Action.
- [x] 24. Create `/engagement`, `/growth`, `/revenue` workflow entry pages linking existing module pages.
- [x] 25. Rebrand `/business-brain` as Marketing Brain.
- [x] 26. Add reusable cards (`WorkflowCard`, `BriefSectionCard`, `ProductPromotionCard`, `CompetitorAlertCard`, `DmOpportunityCard`, `CommentInsightCard`, `TrendingHashtagCard`, `BestTimeCard`, `FollowerLinkCard`).

### Cleanup / Verification
- [x] 27. Update `intelligence/index.ts` and `ai/index.ts` public barrels to expose new contracts.
- [x] 28. Run `npm run lint`, `npm run typecheck`, `npm run build`.
- [x] 29. Write `scripts/verify-task371.ts` end-to-end validation (created and typechecked; runtime requires PostgreSQL connection).
- [x] 30. Update `docs/tasks/TASK-371-progress.md` and `CHANGELOG.md`.

## Acceptance Criteria

- [x] Implemented subtasks pass lint + typecheck + build.
- [x] Remaining subtasks documented: content competitor/own-post integration, full analytics loop with media metrics and attribution, workspace-vs-competitor benchmark, DM/comment auto recommendations, and verify script runtime DB connection.
- [x] `CHANGELOG.md` updated.
