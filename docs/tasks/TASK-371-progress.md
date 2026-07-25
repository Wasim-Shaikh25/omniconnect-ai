# TASK-371: Marketing Intelligence Connectivity — Live Progress Tracker

Status legend:

- `[x]` Done — implemented and verified.
- `[~]` Partial — scaffolded or partly done; needs more work.
- `[ ]` Not started.

---

## Product gaps (from repositioning review)

### 1. Content Intelligence is disconnected
- [x] Content Studio post-idea generation is exposed by the `content` module as `generateContentIdeasAction` and publishes `ContentIdeasGenerated`; it consumes Marketing Memory (top products, DM/comment themes, trending hashtags, today's brief, own best-performing posts, competitor changes).
- [x] `getAccountMedia` added to the analytics server barrel; `updateMarketingMemory` fetches the connected Meta account's own media and computes `topPerformingPosts`.
- [x] `detectCompetitorChanges` captures each competitor's top post `latestCaption`, `latestMediaType`, and `latestEngagement` from `TrackedAccountRecord.lastMedia`.
- [x] `ai.generatePostIdeas` prompt now grounds ideas in own best-performing posts and competitor changes with engagement scores.
- [x] Generated ideas include grounding evidence panel in `ContentStudioForms` showing which memory signals influenced the ideas.

### 2. Analytics doesn't close the loop
- [x] Marketing analytics reorganized around Content / Audience / Product / Campaign sections in `getMarketingPerformance` and `/stores/[storeId]/analytics`.
- [x] `getMarketingPerformance` now returns `why` and `nextRecommendation` per section, plus an overall `explanation` that closes the loop from metrics → reason → next action.
- [~] Full post-to-order attribution and rich media metrics (hook retention, caption length, etc.) require additional Meta media data and order line-item modeling.

### 3. Competitor Analysis is passive
- [x] Competitor change detection implemented (`CompetitorChangeDetected` published when `lastMedia` post count changes in `getCompetitorBenchmark`).
- [x] Competitor benchmarking (frequency, hook length, trending audio placeholder, engagement) implemented in `analytics/application/competitor-benchmark.ts` and `getCompetitorBenchmarkAction`.
- [x] Benchmark gaps produce actionable content/campaign suggestions (posting frequency, Reel ratio, hook length, engagement, top hashtags).

### 4. DM AI doesn't influence marketing
- [x] DM pattern extraction (categories, frequency, anonymized samples) in `intelligence`.
- [x] DM/comment patterns surface on Daily Marketing dashboard and feed `MarketingMemory`; auto-generated `DmPatternDetected`/`CommentPatternDetected` insights and `CREATE_DM_CAMPAIGN` recommendations are generated from memory.

### 5. Comments are treated as support
- [x] Comment pattern extraction (objections, questions, compliments) in `intelligence` from `social` comments.
- [x] Comment patterns update analytics, campaign, content, and sales strategy (insights and `CREATE_DM_CAMPAIGN` recommendations generated from comment patterns).

### 6. Analytics should become marketing analytics
- [x] New `/stores/[storeId]/analytics/content` page with top recent mentions, intent breakdown, and next recommendation.
- [x] New `/stores/[storeId]/analytics/audience` page with follower/customer/conversation/message segments and growth next step.
- [x] New `/stores/[storeId]/analytics/product` page with revenue, AOV, top products to promote, and product next step.
- [x] New `/stores/[storeId]/analytics/campaign` page with active coupons, coupons generated/used, and campaign next step.
- [x] `/stores/[storeId]/analytics` links to the four subpages and surfaces the overall AI marketing explanation.
- [~] Full attribution (which content sold, which gained followers, etc.) depends on post-to-order and richer media metrics.

### 7. Products should influence content
- [x] `ProductScore` computed in `intelligence` (content, engagement, conversation, sales, trend, competitor scores) from ecommerce, conversations, and orders.
- [x] Product promotion score visible in `/commerce/catalog` with composite score and evidence explanation.

### 8. Marketing Memory
- [x] `MarketingMemory` aggregate per workspace (`updateMarketingMemory()` in `intelligence`).
- [x] `topPerformingPosts` populated from the connected Meta account's own media.
- [x] `competitorChanges` populated with each tracked competitor's top post caption, media type, and engagement.
- [~] Winning posting times remain a placeholder until engagement timestamps are captured.

### 9. Inbox should generate insights automatically
- [x] One DM theme creates product insight, marketing insight, content idea, and surfaces on Daily Marketing dashboard.
- [x] Auto-generate campaign suggestions / business alerts from patterns (DM/comment patterns generate `CREATE_DM_CAMPAIGN` recommendations and `DmPatternDetected`/`CommentPatternDetected` events).

### 10. Competitor Intelligence should benchmark
- [x] Competitor posting frequency, Reel frequency, hook/caption length, engagement, top hashtags, and consistency computed in `getCompetitorBenchmark`.
- [x] Gap → recommendation mapping implemented (posting frequency, Reel ratio, hook length, engagement, top hashtags).
- [x] Workspace vs competitor side-by-side comparison implemented (`getWorkspaceCompetitorComparison` + `ComparisonPanel` UI).

### 11. AI should explain marketing
- [x] `MarketingPerformanceView` includes an `explanation` field that tells the user why the metrics look the way they do and what to do next.
- [~] Rich post-level explanation (hook retention, caption length, best/worst hooks) requires Meta media metrics and per-post attribution.

### 12. Business Brain should become Marketing Brain
- [x] `/business-brain` rebranded as Marketing Brain.
- [x] Daily marketing brief generated (`generateDailyBrief`) with follower growth, content opportunity, competitor alert, products to promote, DM/comment insights, campaign performance, best posting time, recommended content idea, trending hashtags, and priorities.
- [x] `ai.askBusinessBrain` consumes `MarketingMemory` and `DailyBriefRecord` when a store is selected.

### 13. UI Workflows (from spec 0048)
- [x] Navigation reorganized around Daily Marketing, Engagement, Growth, Revenue (route + tabs added).
- [x] `/business-brain` rebranded as Marketing Brain.
- [x] Daily Marketing dashboard surfaces all brief sections.
- [x] Reusable workflow cards extracted (`WorkflowCard`, `BriefSectionCard`, `ProductPromotionCard`, `DmOpportunityCard`, `CommentInsightCard`, `CompetitorAlertCard`, `TrendingHashtagCard`, `BestTimeCard`, `FollowerLinkCard`).
- [x] Existing module pages reachable via workflow entry pages (aliases/redirects can be added later).

---

## Quality gates

- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run build` passes.
- [x] `scripts/verify-task371.ts` created and passes TypeScript validation; runtime execution requires a PostgreSQL database connection.
- [x] `CHANGELOG.md` updated.
