# 0048 — Marketing Workflows UI

- **Module(s):** `ui`, `content`, `analytics`, `competitors`, `conversations`, `social`, `ecommerce`, `growth`, `intelligence`, `ai`
- **Status:** Draft
- **Owner:** wasim
- **Related task(s):** `docs/tasks/TASK-371-marketing-intelligence.md`
- **Last updated:** 2026-07-25

## 1. Summary

The underlying modules and capabilities of OmniConnect stay the same; only their **presentation** and **organization** change. This spec defines a UI reorganization around four marketing workflows: **Daily Marketing**, **Engagement**, **Growth**, and **Revenue**. It moves the product away from module-oriented navigation and toward question-driven dashboards that answer: "What should I post today?", "Which product should I promote?", "Which DMs need attention?", "Why did my Reel fail?", "Which competitor is outperforming me?", and "What should I do next?".

## 2. Goals

1. Replace module-first navigation with workflow-first navigation.
2. Provide a single **Daily Marketing** home that surfaces today's priorities from every module.
3. Group existing pages into **Engagement**, **Growth**, and **Revenue** workflows.
4. Make every workflow page answer explicit business questions with data + AI explanation + recommended next action.
5. Keep every existing capability intact (Shopify, products, orders, coupons, campaigns, analytics, competitors, etc.) — only their entry points and grouping change.
6. Make `Business Brain` / `Marketing Brain` the natural starting point for the daily brief.

## 3. Non-Goals

- Removing any existing module or page.
- Adding brand-new data pipelines (those are in spec `0047`).
- Redesigning the design system / ShadCN/Tailwind theme.
- Mobile-native apps; web responsive only.

## 4. User Stories

- As a store owner, I want a "Daily Marketing" view so I know what to do first each day.
- As a marketer, I want an "Engagement" workflow so I can see inbox, comments, followers, and hot leads in one place.
- As a founder, I want a "Growth" workflow so I can compare campaigns, competitors, content ideas, and automations.
- As a merchandiser, I want a "Revenue" workflow so I can see sales, products, coupons, conversions, and attribution together.
- As any user, I want the navigation to answer my job-to-be-done, not the internal module name.

## 5. UI Model / Information Architecture

### Top-level marketing workflows

```
/Daily Marketing      → today's brief + today's content + trending + competitor changes + products to push + best time + DM opportunities
/Engagement          → inbox, comments, followers, hot leads
/Growth              → campaigns, competitors, ideas, automations
/Revenue             → sales, products, coupons, conversions, attribution
/Marketing Brain     → AI chat for daily brief, explanations, follow-ups
```

### Mapping to existing pages

| New workflow | Existing capability | New home / grouping |
|---|---|---|
| Daily Marketing | Today's Brief | `/business-brain` (rebranded as Marketing Brain) |
| Daily Marketing | Today's Content | `/stores/[storeId]/content` |
| Daily Marketing | Trending Topics | `/stores/[storeId]/commerce/trends` |
| Daily Marketing | Competitor Changes | `/stores/[storeId]/commerce/competitors` |
| Daily Marketing | Products To Push | `/stores/[storeId]/products` (with promotion score) |
| Daily Marketing | Best Time To Post | new card in `/stores/[storeId]/analytics` Content tab |
| Daily Marketing | DM Opportunities | `/engagement/inbox` filtered by high-intent / unanswered |
| Engagement | Unified Inbox | `/engagement/inbox` (was `/inbox` or `/stores/[storeId]/conversations`) |
| Engagement | Comments | `/engagement/comments` (was `/stores/[storeId]/commerce/comments`) |
| Engagement | Followers | `/engagement/followers` (was `/stores/[storeId]/followers`) |
| Engagement | Hot Leads | `/engagement/leads` (was `/stores/[storeId]/commerce/leads`) |
| Growth | Campaigns | `/growth/campaigns` (was `/stores/[storeId]/campaigns`) |
| Growth | Competitors | `/growth/competitors` (was `/stores/[storeId]/commerce/competitors`) |
| Growth | Ideas | `/growth/ideas` (was `/stores/[storeId]/content`) |
| Growth | Automations | `/growth/automations` (was `/stores/[storeId]/automations`) |
| Revenue | Sales | `/revenue/sales` (was `/stores/[storeId]/orders`) |
| Revenue | Products | `/revenue/products` (was `/stores/[storeId]/commerce/catalog`) |
| Revenue | Coupons | `/revenue/coupons` (was `/stores/[storeId]/coupons`) |
| Revenue | Conversions | `/revenue/conversions` (new attribution view) |
| Revenue | Attribution | `/revenue/attribution` (new) |

### Navigation sidebar (collapsed by default on mobile)

```
Today
├── Daily Marketing
├── Marketing Brain
├── Notifications
Engagement
├── Inbox
├── Comments
├── Followers
├── Hot Leads
Growth
├── Campaigns
├── Competitors
├── Ideas
├── Automations
Revenue
├── Sales
├── Products
├── Coupons
├── Conversions
├── Attribution
Settings
```

## 6. Route Structure

### Proposed new routes (or aliases)

- `/[storeId]/daily-marketing` — primary dashboard for the current store.
  - Redirects to `/stores/[storeId]/daily-marketing` if needed.
- `/[storeId]/daily-marketing/brain` — Marketing Brain focused on today's brief.
- `/[storeId]/engagement/*` — inbox, comments, followers, leads.
- `/[storeId]/growth/*` — campaigns, competitors, ideas, automations.
- `/[storeId]/revenue/*` — sales, products, coupons, conversions, attribution.

Keep existing routes working as aliases so bookmarks and external links don't break. Add `next.config` rewrites or simple redirect pages.

## 7. Page Specifications

### 7.1 Daily Marketing Dashboard (`/[storeId]/daily-marketing`)

**Layout:** card grid with priority order.

**Sections (top to bottom):**
1. **Today's Brief** ( Marketing Brain summary )
   - Follower growth (delta vs yesterday/last 7 days).
   - Content opportunity (one-line AI recommendation + CTA to generate content).
   - Competitor alert (who changed, what changed, CTA to see details).
   - Products to promote (top 3 product cards by composite score).
   - DM opportunity (unanswered high-intent messages).
2. **Today's Content**
   - Recommended Reel / Post / Story.
   - Trending audio / hashtags.
   - "Generate more" CTA.
3. **Trending Topics**
   - Trending hashtags and topics for the store's niche.
4. **Competitor Changes**
   - Latest competitor changes (post frequency, format shifts, engagement spikes).
5. **Products To Push**
   - Product promotion score leaderboard.
6. **Best Time To Post**
   - Chart or card: best hour/day for the next post.
7. **DM Opportunities**
   - Top 3 high-intent DMs with one-click reply/escalate.

**Data sources:** `MarketingMemory`, `DailyMarketingBriefGenerated`, `ProductScore`, `CompetitorBenchmark`, `DmInsight`.

### 7.2 Engagement Workflow (`/[storeId]/engagement`)

**Entry page** (`/engagement`): summary cards for inbox unread, comment mentions, new followers, hot leads. Tabs below:
- **Inbox** — unified conversations, filters: all, AI active, human, high intent, unanswered.
- **Comments** — comment stream, sentiment, auto-reply toggle.
- **Followers** — follower list, first-time follower campaign status.
- **Hot Leads** — leads ranked by intent score.

### 7.3 Growth Workflow (`/[storeId]/growth`)

**Entry page** (`/growth`): summary of active campaigns, competitor benchmark, content ideas, active automations.
- **Campaigns** — list, performance, create.
- **Competitors** — tracked accounts, changes, benchmark gaps.
- **Ideas** — content ideas with grounding evidence and "Use this idea" action.
- **Automations** — first-follower, DM, comment automations.

### 7.4 Revenue Workflow (`/[storeId]/revenue`)

**Entry page** (`/revenue`): revenue today, top products, active coupons, conversion rate.
- **Sales** — orders list, revenue chart.
- **Products** — product catalog with promotion scores and "Create content for this product" action.
- **Coupons** — coupons list, usage, generate.
- **Conversions** — conversion events and funnel.
- **Attribution** — which content/DM/campaign drove which order.

### 7.5 Marketing Brain (`/[storeId]/brain` or `/business-brain`)

- Sidebar or top bar shows today’s brief sections.
- Chat area answers follow-up questions using `MarketingMemory`.
- Users can click any brief section and ask "Why?" or "What should I do?".

## 8. Component Contract

### New shared components (presentation layer)

- `WorkflowLayout` — sidebar + mobile bottom nav with the four marketing sections.
- `DailyMarketingDashboard` — card grid driven by a `DailyBrief` prop.
- `WorkflowSummaryCard` — count, change, label, CTA.
- `ProductPromotionCard` — product image, title, composite score, individual score bars, CTA.
- `CompetitorAlertCard` — competitor name, change type, impact, CTA.
- `DmOpportunityCard` — conversation snippet, intent score, reply/escalate CTAs.
- `BriefSection` — collapsible section with explanation and source links.
- `MarketingBrainChat` — chat interface for `askMarketingBrain`.

### Server actions / data hooks

Each page consumes the public application services from the relevant modules (no direct repository access):
- `ai.askMarketingBrain(organizationId, storeId, question?)`
- `intelligence.getDailyMarketingBrief(organizationId, storeId)`
- `intelligence.getMarketingMemory(organizationId, storeId)`
- `conversations.getDmOpportunities(storeId)`
- `social.getCommentInsights(storeId)`
- `competitors.getCompetitorAlerts(organizationId, storeId)`
- `ecommerce.getProductScores(storeId)`
- `analytics.getMarketingPerformance(storeId)`
- `growth.getCampaigns(storeId)` / `growth.getAutomations(storeId)`

## 9. Data / Persistence

No new tables for the UI layer. The UI depends on the data layer defined in spec `0047`:
- `MarketingMemory` snapshot
- `ProductScore`
- `DmInsight`, `CommentInsight`
- `CompetitorBenchmark`
- `BusinessInsight` / `Recommendation` for marketing-specific items
- Existing `Campaign`, `Product`, `Order`, `Coupon`, `Conversation`, `Follower` tables

## 10. Edge Cases & Failure Modes

- Store not connected to Shopify → Revenue and product scores show empty states with CTA to connect.
- No competitors → Competitor sections show onboarding CTA.
- No DMs/comments → Engagement pages show empty state and tips.
- AI brief generation fails → show cached brief with staleness badge; allow manual retry.
- User has multiple stores → workflow is scoped to selected store; global nav adds a store switcher.
- Deep links to old routes → 301 redirects to new workflow routes.

## 11. Security & Privacy

- All data access scoped by `organizationId`/`storeId` and RBAC.
- Marketing Brain answers must not expose raw customer PII or conversation content beyond what the user already has permission to see.
- DM opportunity cards only show metadata, not full message history.

## 12. Testing Strategy

- **Unit:** component rendering with mock `DailyBrief` and `ProductScore` data.
- **Integration:** page-level server action calls return correct scoped data.
- **E2E:** navigate from Daily Marketing to Inbox to Growth and back; verify data consistency.

## 13. Acceptance Criteria

- [ ] Four marketing workflows are visible in navigation: Daily Marketing, Engagement, Growth, Revenue.
- [ ] `/business-brain` is branded as Marketing Brain and shows the daily brief.
- [ ] `/[storeId]/daily-marketing` exists and surfaces Today’s Brief, Today’s Content, Trending Topics, Competitor Changes, Products To Push, Best Time To Post, DM Opportunities.
- [ ] Existing module pages are reachable inside the new workflow grouping (via alias or redirect).
- [ ] Each workflow page answers a concrete business question and has a clear next action.
- [ ] No existing data or capability is removed.
- [ ] Lint + typecheck + build pass.
- [ ] `CHANGELOG.md` and task tracker updated.

## 14. Open Questions

- Should we rename `/business-brain` to `/brain` or `/marketing-brain`? Keep route alias?
- Should Daily Marketing be the default landing page after login instead of Dashboard?
- Do we implement redirects at the Next.js route level or in the navigation component?
- Which score is the primary sort for "Products To Push": composite score, sales score, or conversation score?
