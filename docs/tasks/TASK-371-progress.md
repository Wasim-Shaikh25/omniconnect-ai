# TASK-371: Marketing Intelligence Connectivity — Live Progress Tracker

Status legend:

- `[x]` Done — implemented and verified.
- `[~]` Partial — scaffolded or partly done; needs more work.
- `[ ]` Not started.

---

## Product gaps (from repositioning review)

### 1. Content Intelligence is disconnected
- [ ] Content Studio consumes competitor posts, own best posts, audience comments, DMs, product catalog, campaigns, analytics, trends.
- [ ] Generated ideas include grounding evidence (why this idea was recommended).

### 2. Analytics doesn't close the loop
- [ ] Analytics reorganized around Content / Audience / Product / Campaign.
- [ ] Post performance drives "why" explanation, competitor comparison, and next content recommendation.

### 3. Competitor Analysis is passive
- [ ] Competitor change detection implemented.
- [ ] Competitor benchmarking (frequency, hook length, trending audio, engagement) implemented.
- [ ] Benchmark gaps produce actionable content/campaign suggestions.

### 4. DM AI doesn't influence marketing
- [ ] DM pattern extraction (categories, frequency, anonymized samples).
- [ ] DM patterns generate marketing insights and content recommendations.

### 5. Comments are treated as support
- [ ] Comment pattern extraction (objections, questions, compliments).
- [ ] Comment patterns update analytics, campaign, content, and sales strategy.

### 6. Analytics should become marketing analytics
- [ ] Content Performance view: which content sold, gained followers, started conversations, generated profile visits.
- [ ] Audience view: growing, leaving, buying, commenting.
- [ ] Product view: which products appear in viral content, get questions, convert poorly.
- [ ] Campaign view: revenue, followers, conversations generated.

### 7. Products should influence content
- [ ] `ProductScore` with content / engagement / conversation / sales / trend / competitor scores.
- [ ] Product promotion score visible in catalog with explanation.

### 8. Marketing Memory
- [ ] `MarketingMemory` aggregate per workspace.
- [ ] Stores successful hooks, failed captions, trending hashtags, winning posting times, high-converting products, objections, competitor changes, campaign history.

### 9. Inbox should generate insights automatically
- [ ] One DM theme creates product insight, marketing insight, content idea, campaign suggestion, business alert.

### 10. Competitor Intelligence should benchmark
- [ ] Workspace vs competitor posting frequency, reel frequency, hook length, trending audio usage, engagement rate, follower growth.
- [ ] Gap → recommendation mapping.

### 11. AI should explain marketing
- [ ] AI explains post performance drivers (hook retention, caption length, product shown in first 3s, trending audio, comment sentiment).

### 12. Business Brain should become Marketing Brain
- [ ] Daily marketing brief generated each morning.
- [ ] Brief includes follower growth, content opportunity, competitor alert, products to promote, DM/comment insights, campaign performance, best posting time, recommended Reel, trending audio, recommended hashtags, expected reach, expected sales, today's priorities.

### 13. UI Workflows (from spec 0048)
- [ ] Navigation reorganized around Daily Marketing, Engagement, Growth, Revenue.
- [ ] `/business-brain` rebranded as Marketing Brain.
- [ ] Daily Marketing dashboard surfaces all brief sections.
- [ ] Existing module pages reachable via workflow aliases/redirects.

---

## Quality gates

- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes.
- [ ] `scripts/verify-task371.ts` end-to-end validation passes.
- [ ] `CHANGELOG.md` updated.
