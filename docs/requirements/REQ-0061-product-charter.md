---
description: OmniConnect AI Product Charter and Scope
---

# REQ-0061: OmniConnect AI Product Charter and Scope

- **Status:** Draft
- **Owner:** Devin
- **Module(s):** all
- **Original spec path:** `docs/specs/0061-product-charter.md` (restructured)
- **Task:** `docs/tasks/TASK-0061-product-charter.md`
- **Tracker:** `docs/trackers/TRACKER-0061-product-charter.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0061-product-charter.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** all
- **Status:** Draft
- **Owner:** Devin
- **Related task(s):** `docs/trackers/TRACKER-0061-product-charter.md`
- **Related ADR(s):** N/A
- **Last updated:** 2026-07-28

## 1. Summary

**OmniConnect AI** is a **Meta-first growth platform** for creators and merchants on any major e-commerce provider. It helps users create more relatable Instagram/Facebook content, understand what is trending in their niche, analyze competitors, engage followers with AI-assisted replies, and run automated Meta campaigns that use real product, order, and coupon data. It is **not** a Shopify replacement, a customer-facing storefront, or a vendor/supplier portal — it is a growth layer that sits **on top** of a merchant's existing store and Meta accounts.

## 2. Product Goal

Help creators and merchants **grow faster on Meta (Instagram/Facebook)** by connecting their e-commerce catalog (Shopify, WooCommerce, BigCommerce, Magento, and more) and Meta accounts to an AI assistant that:

1. **Understands** the merchant's products, orders, customers, and follower behavior across any connected store.
2. **Creates** post ideas, captions, hashtags, and content strategies aligned with real trends.
3. **Engages** followers through AI replies, first-follower coupons, and DM campaigns.
4. **Analyzes** social and sales data to surface which posts, reels, videos, and campaigns drive new customers, leads, and revenue.
5. **Recommends** what to post next, when to post, and which products or coupons to promote.

## 3. Target Users

| User | Primary Need |
|------|-------------|
| **Creator** | Grow audience on Instagram/Facebook; get AI content ideas and trend insights. |
| **Solo merchant** | Connect any supported store once; automate Meta engagement and coupon campaigns with real product data. |
| **Small team / owner + staff** | Owner sets up integrations; staff replies to DMs and comments for one store. |
| **Super admin (platform)** | Triage support tickets, manage organizations, monitor platform health. |

## 4. In-Scope Features (MVP)

### 4.1 Connect
- **Universal e-commerce** — read-only product/order/customer sync from Shopify, WooCommerce, BigCommerce, Magento, and future providers via the `EcommerceConnector` interface.
- **Meta (Facebook/Instagram)** — OAuth connection for page/account insights and outbound messaging.

### 4.2 Create
- AI-generated **post ideas**, **captions**, **trending hashtags**, and **content types**.
- **Trending post discovery** in the user's niche (top hashtags, trending audio, high-performing formats).
- **Competitor and niche trend analysis**.
- **Best-time-to-post** and **AI content calendar** suggestions (not a full CMS).

### 4.3 Engage
- **Unified inbox** for Meta DMs and comments.
- AI reply generation with **consent** and **plan quota** guards.
- **Human takeover** for conversations.
- **First-follower campaign** that generates a store coupon and sends a welcome DM.
- **DM coupon campaigns** tied to products and promotions.

### 4.4 Analyze
- **Business growth dashboard** — revenue, new customers, orders, average order value over time.
- **Post/reel/video-level attribution** — which content generated leads and sales (7-day window + coupon/UTM attribution).
- **New customers from Meta** — first-time buyers attributed to a post, DM, or campaign.
- **Coupon effectiveness** — generated vs. used, revenue per coupon, conversion rate, top campaigns.
- **Meta page, audience, and post insights** plus **reel/video metrics** (plays, reach, follows, profile visits, shares, saves).
- **Trending content recommendations** — top-performing posts/hashtags/audio to reuse.
- **Competitor benchmarking** and **niche trend tracking**.
- **Data-quality labels** (`live` / `partial` / `simulated`) when real data is unavailable.

### 4.5 Manage
- Multi-tenant workspace with **Organization**, **Store** (data source), and **User** roles.
- RBAC: **Owner/Admin**, **Staff** (scoped to one store), **Super Admin**.
- Team invitations with seat limits.
- Account settings, billing (Stripe), notifications, and GDPR export/delete.

## 5. Out-of-Scope for MVP

These are explicitly **not** part of the current product. They may become future roadmap items only if the product direction changes.

- Customer-facing storefront, cart, checkout, or payment processing.
- Full Shopify admin (product edit/delete, store archive/delete, order management).
- Affiliate/ambassador marketplace.
- UGC collection and rights management.
- Brand-deals marketplace.
- Media kit generator.
- Project management module (separate from store workspace).
- Revenue/profit dashboards that duplicate Shopify's finance tools.
- Generic lead scoring outside Meta conversation context.
- TikTok, Pinterest, YouTube, or other social platforms.

## 6. Key Principles

1. **Meta-first.** Every feature must directly help Instagram/Facebook growth or use Meta data.
2. **E-commerce is a data source, not a replacement.** We read product/order/customer data from any connected provider; we do not run the store.
3. **Coupons serve Meta campaigns.** Coupon lifecycle exists to power first-follower / DM campaigns, not standalone coupon management.
4. **Read-only e-commerce data in UI.** Product/order lists are for AI context and analytics, not admin editing.
5. **Universal connector model.** New e-commerce providers are added by implementing `EcommerceConnector` — no caller changes.
6. **Attribution is core.** Every campaign, post, and coupon should be traceable to new customers, leads, and revenue where possible.
7. **Clean navigation.** Collapsible sidebar grouped around Connect → Create → Engage → Analyze → Settings.
8. **No dead-end pages.** Out-of-scope routes and placeholders are removed, not hidden.

## 7. User Journeys

### 7.1 Creator
1. Sign up → connect Meta account.
2. Discover trends / generate content ideas.
3. Publish manually to Instagram/Facebook (we suggest; we do not post directly).
4. Track follower growth and post performance.

### 7.2 Merchant
1. Sign up → connect any supported e-commerce store and Meta.
2. Sync products → create first-follower campaign.
3. Engage customers in unified inbox with AI-assisted replies.
4. Review analytics to see which content, videos, and coupons drive sales, new customers, and growth.

### 7.3 Staff Member
1. Owner invites staff and assigns them to a store.
2. Staff logs in, sees only that store's inbox, followers, and analytics.
3. Staff takes over or resumes AI conversations.

## 8. Data Sources and Trust Boundaries

- **Organization** is the tenant boundary.
- **Store** represents a connected e-commerce or Meta source within an organization.
- **Staff** can only access their assigned store.
- **Owner/Admin** can access all stores in the organization.
- E-commerce/Meta tokens are encrypted at rest.
- Customer consent is required before any automated AI message.

## 9. Success Metrics

- Activation: connect Meta within 7 days of signup.
- Engagement: AI replies or content ideas generated per week.
- Retention: weekly return to analytics or inbox.
- Commerce: first-follower coupon usage rate, revenue attributed to Meta content, new customers from Meta.
- Growth: follower growth, top-performing content, trend-driven post creation.

## 10. Public Contract

This charter does not change module contracts. Implementation specs (e.g. `0060`) derive from it.

## 11. Acceptance Criteria

- [ ] Product charter is approved and stored in `docs/requirements/REQ-0061-product-charter.md`.
- [ ] Master progress tracker exists in `docs/trackers/TRACKER-0061-product-charter.md`.
- [ ] All future specs reference this charter for scope decisions.
- [ ] Implementation spec `0062` defines universal connectors and advanced analytics.
- [ ] Out-of-scope UI routes and components are removed per derived implementation spec.

## 12. Open Questions

1. Do we want to rename `Store` to `Source` in the UI to avoid implying a store is being managed here?
2. Should the onboarding flow differ for creators (Meta only) versus merchants (e-commerce + Meta)?
3. What is the exact list of out-of-scope pages to delete in the first cleanup pass?
4. Which e-commerce providers should be implemented first after Shopify (WooCommerce, BigCommerce, Magento)?
5. Do we need direct Meta content publishing/scheduling in a later phase, or do we stay as a suggestion/assistant tool?
