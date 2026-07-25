# TASK-371: Marketing Intelligence Connectivity — Live Progress Tracker

Status legend:

- `[x]` Done — implemented and verified.
- `[~]` Partial — scaffolded or partly done; needs more work.
- `[ ]` Not started.

---

## Product gaps (from repositioning review)

### 1. Content Intelligence is disconnected
- [~] Content Studio post-idea generation consumes Marketing Memory (top products, DM/comment themes, trending hashtags, today's brief) to ground ideas.
- [ ] Still need: competitor posts, own best posts, explicit campaigns/analytics integration.
- [x] Generated ideas include grounding evidence panel in `ContentStudioForms` showing which memory signals influenced the ideas.

### 2. Analytics doesn't close the loop
- [x] Marketing analytics reorganized around Content / Audience / Product / Campaign sections in `getMarketingPerformance` and `/stores/[storeId]/analytics`.
- [~] Post performance drives summary and content engagement section; full "why" explanation + competitor comparison + next recommendation needs media metrics and post-to-order attribution.

### 3. Competitor Analysis is passive
- [x] Competitor change detection implemented (`CompetitorChangeDetected` published when `lastMedia` post count changes in `getCompetitorBenchmark`).
- [x] Competitor benchmarking (frequency, hook length, trending audio placeholder, engagement) implemented in `analytics/application/competitor-benchmark.ts` and `getCompetitorBenchmarkAction`.
- [x] Benchmark gaps produce actionable content/campaign suggestions (posting frequency, Reel ratio, hook length, engagement, top hashtags).

### 4. DM AI doesn't influence marketing
- [x] DM pattern extraction (categories, frequency, anonymized samples) in `intelligence`.
- [~] DM patterns surface on Daily Marketing dashboard and feed `MarketingMemory`; auto-generated content/campaign recommendations are next.

### 5. Comments are treated as support
- [x] Comment pattern extraction (objections, questions, compliments) in `intelligence` from `social` comments.
- [ ] Comment patterns update analytics, campaign, content, and sales strategy (groundwork laid via `MarketingMemory`).

### 6. Analytics should become marketing analytics
- [ ] Content Performance view: which content sold, gained followers, started conversations, generated profile visits.
- [ ] Audience view: growing, leaving, buying, commenting.
- [ ] Product view: which products appear in viral content, get questions, convert poorly.
- [ ] Campaign view: revenue, followers, conversations generated.

### 7. Products should influence content
- [x] `ProductScore` computed in `intelligence` (content, engagement, conversation, sales, trend, competitor scores) from ecommerce, conversations, and orders.
- [x] Product promotion score visible in `/commerce/catalog` with composite score and evidence explanation.

### 8. Marketing Memory
- [x] `MarketingMemory` aggregate per workspace (`updateMarketingMemory()` in `intelligence`).
- [~] Memory stores product scores, DM/comment patterns, trending hashtags, campaign/coupon history, competitor changes (basic). Winning posting times and top posts are placeholders pending analytics.

### 9. Inbox should generate insights automatically
- [x] One DM theme creates product insight, marketing insight, content idea, and surfaces on Daily Marketing dashboard.
- [ ] Auto-generate campaign suggestions / business alerts from patterns.

### 10. Competitor Intelligence should benchmark
- [x] Competitor posting frequency, Reel frequency, hook/caption length, engagement, top hashtags, and consistency computed in `getCompetitorBenchmark`.
- [x] Gap → recommendation mapping implemented (posting frequency, Reel ratio, hook length, engagement, top hashtags).
- [ ] Workspace vs competitor side-by-side comparison needs workspace media metrics.

### 11. AI should explain marketing
- [~] AI prompt now includes top products, DM/comment patterns, and today's brief. Full post-performance explanation (hook retention, caption length, etc.) needs media metrics.

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
