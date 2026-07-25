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
- [ ] 1. Content Studio recommendations consume competitor posts, own best posts, comments, DMs, product catalog, campaigns, analytics, and trends.
- [ ] 2. `content` exposes `generateContentIdeas(input)` and publishes `ContentIdeasGenerated`.
- [ ] 3. Every content idea includes grounding evidence (data source + why it was recommended).

### Analytics Loop
- [ ] 4. Reorganize analytics around marketing: Content, Audience, Product, Campaign.
- [ ] 5. Post performance → `why` explanation → competitor comparison → audience reaction → next recommendation.
- [ ] 6. `analytics` publishes `MarketingPerformanceUpdated`.

### Competitor Intelligence
- [ ] 7. `competitors` detects competitor changes and publishes `CompetitorChangeDetected`.
- [ ] 8. `competitors` benchmarks workspace vs competitor and publishes `CompetitorBenchmarkReady`.
- [ ] 9. Competitor benchmark produces concrete adaptation suggestions.

### DM & Comment Insights
- [ ] 10. `conversations` extracts DM patterns and publishes `DmPatternDetected`.
- [ ] 11. `social` extracts comment patterns and publishes `CommentPatternDetected`.
- [ ] 12. DM/comment insights generate marketing insights + content/campaign recommendations.

### Product Promotion Scores
- [ ] 13. `ecommerce` computes `ProductScore` (content, engagement, conversation, sales, trend, competitor).
- [ ] 14. Product catalog shows promotion score and explanation.

### Marketing Memory
- [ ] 15. `intelligence` owns `MarketingMemory` aggregate and exposes `updateMarketingMemory()`.
- [ ] 16. `MarketingMemory` stores successful hooks, failed captions, trending hashtags, posting times, high-converting products, objections, competitor changes, campaign history.

### Inbox → Multi-Insight
- [ ] 17. Repeated DM themes create product, marketing, content, campaign, and alert insights.
- [ ] 18. Pattern extraction redacts PII and only exports categories + anonymized phrases.

### Business Brain → Marketing Brain
- [ ] 19. Rename/transform `Business Brain` into `Marketing Brain`.
- [ ] 20. Daily marketing brief: follower growth, content opportunity, competitor alert, products to promote, DM/comment insights, campaign performance, best posting time, recommended Reel, trending audio, hashtags, expected reach/sales, priorities.
- [ ] 21. `ai.askMarketingBrain()` consumes `MarketingMemory` and `DailyMarketingBriefGenerated`.

### Marketing Workflows UI
- [x] 22. Create workflow navigation (`StoreWorkflowNav`) for Daily Marketing, Engagement, Growth, Revenue.
- [x] 23. Build Daily Marketing dashboard with Today’s Brief, Products To Push, DM Opportunities, Followers, Best Time To Post, Competitor Changes, Content Next Best Action.
- [x] 24. Create `/engagement`, `/growth`, `/revenue` workflow entry pages linking existing module pages.
- [x] 25. Rebrand `/business-brain` as Marketing Brain.
- [ ] 26. Add reusable cards (`ProductPromotionCard`, `CompetitorAlertCard`, `DmOpportunityCard`, `BriefSection`) — current dashboard uses inline cards; extract later as data matures.

### Cleanup / Verification
- [ ] 27. Update `intelligence/index.ts` and `ai/index.ts` public barrels to expose new contracts.
- [ ] 28. Run `npm run lint`, `npm run typecheck`, `npm run build`.
- [ ] 29. Write `scripts/verify-task371.ts` end-to-end validation.
- [ ] 30. Update `docs/tasks/TASK-371-progress.md` and `CHANGELOG.md`.

## Acceptance Criteria

- [ ] Matches the linked spec's acceptance criteria.
- [ ] Lint + typecheck + build pass.
- [ ] `CHANGELOG.md` updated.
