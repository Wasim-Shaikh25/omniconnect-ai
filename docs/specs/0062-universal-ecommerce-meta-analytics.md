# Spec 0062: Universal E-commerce Connectors + Meta Business Growth Analytics

- **Module(s):** ecommerce, meta, analytics, coupons, ai, crm, conversations
- **Status:** Draft
- **Owner:** Devin
- **Related spec(s):** `docs/specs/0061-product-charter.md`
- **Related task(s):** `docs/tasks/0062-universal-ecommerce-meta-analytics-progress.md`
- **Related ADR(s):** N/A
- **Last updated:** 2026-07-28

## 1. Summary

Make OmniConnect AI a **universal Meta growth layer** for any e-commerce store. Add new `EcommerceConnector` providers (WooCommerce, BigCommerce, Magento) and extend the analytics dashboard with the business-growth insights that Meta's native tools do not provide: post/reel/video-to-sale attribution, new-customer tracking, coupon effectiveness, trending content recommendations, and AI-powered “what to post next” suggestions.

## 2. Goals

1. **Universal e-commerce sync** — add WooCommerce, BigCommerce, and Magento connectors behind the existing `EcommerceConnector` interface.
2. **Deeper Meta media insights** — fetch reel/video/story metrics and expose them in analytics.
3. **Business growth dashboard** — revenue, orders, AOV, new customers, and cohort trends over time.
4. **Content-to-commerce attribution** — know which post/reel/DM/coupon drove a lead or sale.
5. **New customer attribution** — flag first-time buyers who came from Meta.
6. **Coupon effectiveness** — generated vs. used, revenue, conversion rate, top campaigns.
7. **Trending content engine** — top posts/hashtags/audio in the user's niche + AI recommendations to reuse them.
8. **Best-time-to-post and content calendar** — AI suggestions based on past engagement and sales spikes.

## 3. Non-Goals

- Not a customer-facing storefront or checkout.
- Not a full e-commerce admin (we remain read-only for products/orders).
- Not direct Meta publishing/scheduling in this phase.
- Not TikTok/Pinterest/YouTube.
- Not affiliate/UGC/brand-deals marketplace.

## 4. User Stories

- As a merchant on **WooCommerce**, I can connect my store and see the same product/order/coupon analytics as a Shopify merchant.
- As a merchant, I want to see which **Instagram Reel** generated the most sales last week so I can make more like it.
- As a creator, I want to know my **best time to post** based on when my audience engages and buys.
- As a merchant, I want to see which **coupon campaigns** actually converted into orders and revenue.
- As a merchant, I want to see how many **new customers** came from Meta this month.
- As a merchant, I want AI to suggest **trending content** I can reuse for my niche.

## 5. Domain Model

No new core entities; reuse and extend:

- `Integration` — `provider` enum now includes `SHOPIFY`, `WOOCOMMERCE`, `BIGCOMMERCE`, `MAGENTO`.
- `Product`, `Order`, `Customer`, `Coupon` — provider-agnostic; filled by connector.
- `MediaPost` / `MediaInsight` — already store per-post metrics; extend with `videoViews`, `follows`, `profileVisits`, `crosspostedViews`.
- `Order` — add optional `attributedMediaId`, `attributionSource` (`META_POST`, `META_DM`, `META_STORY`, `META_LIVE`, `COUPON`, `DIRECT`), `couponCode`, `isFirstTimeCustomer`.
- `Coupon` — add `usageCount`, `revenueAttributed` (updated on order sync where `couponCode` matches).
- `TrendSnapshot` — extended with `audioSuggestion` and `contentFormat`.
- `ContentRecommendation` — add `basedOnMediaIds`, `predictedEngagement`, `predictedRevenue`, `suggestedPublishAt`.

## 6. Public Contract

### Ecommerce module
- `getConnector(provider, credentials)` resolves to provider adapter.
- New connector classes implement `EcommerceConnector`.
- `syncProducts(storeId)`, `syncOrders(storeId)`, `syncCustomers(storeId)` use the connector and persist.

### Analytics module
- `getMarketingPerformance(storeId, range?)` — extended view with `growth`, `attribution`, `couponsUsed`, `newCustomersFromMeta`.
- `getTopContent(storeId, range?, metric?)` — top posts by engagement or revenue.
- `getTrendingContent(storeId, niche?)` — trending hashtags/audio/competitor posts.
- `getBestTimeToPost(storeId)` — hour/day heatmap from engagement + order attribution.
- `getContentCalendar(storeId, days?)` — AI-generated upcoming post ideas with best times.
- `getNewCustomersFromMeta(storeId, range?)` — first-time customers attributed to Meta.

### Meta module
- `getMediaInsights(mediaId)` returns full per-media metrics.
- `getAccountMedia(storeId, limit?)` includes story/live media where available.
- `searchHashtagMedia(niche, limit?)` and `getTrendingAudio(niche, limit?)` (best-effort via public API or Apify).

## 7. Data / Persistence

### Schema additions (Prisma migration)
- `Order.attributedMediaId` (optional string, indexed with `storeId`).
- `Order.attributionSource` (optional enum).
- `Order.couponCode` (optional string).
- `Order.isFirstTimeCustomer` (boolean, default false).
- `Coupon.usageCount` (int), `Coupon.revenueAttributed` (decimal), `Coupon.lastUsedAt` (datetime).
- `MediaPost.mediaProductType` (enum: `FEED`, `REEL`, `STORY`, `LIVE`, `CAROUSEL`).
- `MediaInsight.videoViews`, `follows`, `profileVisits`, `crosspostedViews`, `saved`.
- `ContentRecommendation.suggestedPublishAt`, `predictedEngagement`, `predictedRevenue`, `basedOnMediaIds` JSON.

### Indexes
- `Order` by `(storeId, attributedMediaId)`, `(storeId, couponCode)`, `(storeId, createdAt)`.
- `MediaPost` by `(storeId, publishedAt)`, `(storeId, mediaProductType)`.

## 8. API / UI Surface

### E-commerce connectors
- Connect form adapts per provider (shop domain, consumer key/secret for WooCommerce, store hash/token for BigCommerce, base URL/bearer token for Magento).
- Provider selection dropdown in connect UI.
- `Integration.provider` validation.

### Analytics dashboard (`/analytics` → `/analytics/journeys` or new `/analytics/growth`)
- KPI cards: total revenue, orders, new customers, AOV, follower growth, active coupons.
- Growth chart: revenue and new customers over time.
- Top content table: post/reel thumb, caption, engagement, orders, revenue.
- Attribution sankey/funnel: Meta content → DM/coupon → order.
- New customers from Meta metric and list.
- Coupon effectiveness table: code, generated, used, conversion %, revenue.
- Trending content panel: top hashtags, trending audio, competitor posts, AI reuse suggestions.
- Best-time-to-post heatmap.
- AI content calendar: next 7–14 days with suggested post ideas and publish times.

### Store-scoped analytics (`/stores/[storeId]/analytics`)
- Same widgets scoped to one store.
- “Sync now” button for products/orders/customers.
- Data-quality badge per widget.

### Reports
- Weekly AI report (extend existing `Report` model) includes: growth, top content, coupon performance, recommendations.

## 9. External Integrations

### Meta Graph API
- Existing endpoints: page/account media, insights, audience demographics, hashtag search.
- New media metrics: `video_views`, `follows`, `profile_visits`, `crossposted_views`, `saved`, `shares`, `total_interactions`.
- Story insights: require webhook subscription `story_insights`; store in `MediaPost` with 24h lifecycle.
- Reels: `/{ig-user-id}/media?media_type=REELS` or fetch by `media_product_type`.
- Rate limit: 200 calls/hour/user; cache aggressively and degrade to partial data.

### WooCommerce REST API v3
- Base URL `/wp-json/wc/v3/`.
- Endpoints: `/products`, `/orders`, `/customers`.
- Auth: consumer key + consumer secret (query or header) or OAuth1 for external sites.
- Pagination: `per_page` max 100, `page` param.

### BigCommerce REST API
- Base URL `https://api.bigcommerce.com/stores/{store_hash}/v3/`.
- Endpoints: `/catalog/products`, `/orders`, `/customers`.
- Auth: `X-Auth-Token` header + `Accept: application/json`.
- Pagination: `page`/`limit`.

### Magento 2 REST API
- Base URL `{base_url}/rest/V1/`.
- Endpoints: `/products`, `/orders`, `/customers`.
- Auth: Bearer token via OAuth1 (customer/integration) or admin token.
- Pagination: `searchCriteria[pageSize]` and `searchCriteria[currentPage]`.

### Apify / third-party enrichment (optional)
- `instagram-hashtag-scraper`, `instagram-reel-scraper`, `instagram-profile-scraper` for competitor/trending data when Meta API is limited.
- Only public profiles/hashtags; respect ToS.

## 10. Edge Cases & Failure Modes

- New provider credentials invalid → clear error message per provider.
- Connector returns partial data → mark `dataQuality` `partial` and show fallback values.
- Meta media insights delayed up to 48h → show “data pending” and retry later.
- Order sync misses coupon code → attribute by 7-day post window only.
- First-time customer detection: no prior `Order` for that `customerRef` in the store.
- Large catalogs: paginate and rate-limit; sync jobs via BullMQ.
- Webhook unavailability: polling fallback for orders.

## 11. Security & Privacy

- Connector credentials stored encrypted at rest (already done for `Integration`).
- No e-commerce admin tokens logged.
- Customer PII redacted in analytics exports and logs.
- Attribution data scoped by tenant.
- Coupon codes are opaque; do not expose generated codes to unauthorized users.

## 12. Testing Strategy

- Unit tests for each new connector against mocked HTTP responses.
- Integration test for attribution logic (order → media/coupon matching).
- Manual E2E with Shopify (existing), WooCommerce sandbox, BigCommerce sandbox, Magento dev instance.
- Verify analytics dashboard renders with `dataQuality` labels.

## 13. Acceptance Criteria

- [ ] WooCommerce connector implements `EcommerceConnector` and passes `getProducts`/`getOrders`/`getCustomers`/`generateCoupon`/`disableCoupon`/`fetchStoreInfo`.
- [ ] BigCommerce connector implements the same contract.
- [ ] Magento connector implements the same contract (or is documented as Phase 1.5 if blocked by OAuth1 complexity).
- [ ] Provider can be selected in the connect-store UI.
- [ ] `getMarketingPerformance` returns `newCustomersFromMeta`, `couponsUsed`, `couponConversionRate`, and `topContent` with revenue attribution.
- [ ] Analytics dashboard shows growth KPIs, attribution, coupon effectiveness, trending content, best-time-to-post, and AI content calendar.
- [ ] `Order` schema supports attribution fields and indexes.
- [ ] Quality gates pass: lint, typecheck, tests, build, build:worker.
- [ ] `CHANGELOG.md` updated.

## 14. Open Questions

1. Should we prioritize WooCommerce or BigCommerce first?
2. Do we need Magento in Phase 1, or can it be Phase 2 due to OAuth1 complexity?
3. Should direct Meta content publishing be added later, or do we stay a suggestion/assistant tool?
4. Do we use Apify for trending audio/competitor data, or rely on public Meta hashtag search only?
