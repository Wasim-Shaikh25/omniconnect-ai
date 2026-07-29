# TRACKER-0062: Universal E-commerce Connectors + Meta Business Growth Analytics

- **Status:** In Progress
- **Requirement:** `docs/requirements/REQ-0062-universal-ecommerce-meta-analytics.md`
- **Task:** `docs/tasks/TASK-0062-universal-ecommerce-meta-analytics.md`
- **Module(s):** ecommerce, meta, analytics, coupons, ai, crm, conversations
- **Owner:** Devin
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Universal e-commerce connectors and advanced Meta analytics.

## Description

Implement the universal e-commerce and advanced analytics capabilities from the linked spec. This task covers adding WooCommerce/BigCommerce/Magento connectors, extending order attribution, building the business growth analytics dashboard, and delivering AI-driven content recommendations that outperform Meta's native insights.

## Subtasks

### Schema & Attribution Foundation
- [ ] Add `Order.attributedMediaId`, `Order.attributionSource`, `Order.couponCode`, `Order.isFirstTimeCustomer` with indexes.
- [ ] Add `Coupon.usageCount`, `Coupon.revenueAttributed`, `Coupon.lastUsedAt`.
- [ ] Extend `MediaPost`/`MediaInsight` with reel/video/story metrics.
- [ ] Generate and apply Prisma migration.
- [ ] Update order-sync logic to attribute orders to media (7-day window) and coupon codes.
- [ ] Mark first-time customers based on store order history.

### Universal E-commerce Connectors
- [ ] Refactor `ConnectorCredentials` to support provider-specific credential shapes.
- [ ] Update `getConnector` registry to dispatch WooCommerce/BigCommerce/Magento.
- [ ] Implement `WooCommerceConnector` (REST v3 products/orders/customers/coupons).
- [ ] Implement `BigCommerceConnector` (v3 products/orders/customers; v2 promotions).
- [ ] Implement `MagentoConnector` (REST V1 products/orders/customers) or document as Phase 2.
- [ ] Add provider-specific connect forms and validation.
- [ ] Add connector unit tests with mocked HTTP responses.

### Enhanced Meta Insights
- [ ] Extend `MetaService.getAccountMedia` to fetch reels/stories/live where available.
- [ ] Extend `MetaService.getMediaInsights` with video, follows, profile visits, saves, shares.
- [ ] Add story-insights webhook handling (best-effort).
- [ ] Add `searchHashtagMedia` / `getTrendingAudio` public API wrappers (with Apify fallback).

### Analytics Dashboard
- [ ] Extend `MarketingPerformanceView` with `newCustomersFromMeta`, `couponsUsed`, `couponConversionRate`, `topContentByRevenue`.
- [ ] Build `/analytics/growth` page with KPI cards, growth chart, and content-attribution table.
- [ ] Add coupon effectiveness table.
- [ ] Add new-customers-from-Meta metric and list.
- [ ] Add trending content panel (hashtags, audio, competitor posts, AI reuse suggestions).
- [ ] Add best-time-to-post heatmap.
- [ ] Add AI content calendar with suggested publish times.
- [ ] Add data-quality badges and empty states.

### AI & Recommendations
- [ ] Extend `generateContentIdea` to include `basedOnMediaIds`, `predictedEngagement`, `suggestedPublishAt`.
- [ ] Add `getBestTimeToPost` analytic from historical engagement/order spikes.
- [ ] Add `getContentCalendar` use case and server action.
- [ ] Add AI “repurpose this top post” recommendations.

### Reports
- [ ] Extend weekly AI report with growth, attribution, coupon performance, and content calendar.

### Verification
- [ ] `npm run lint` passes.
- [ ] `DATABASE_URL=... npm run typecheck` passes.
- [ ] `npm run test` passes (new connector tests + attribution tests).
- [ ] `npm audit` reports 0 vulnerabilities.
- [ ] `npm run build` and `npm run build:worker` pass.
- [ ] Manual E2E: connect provider → sync products → create first-follower campaign → view analytics.

## Acceptance Criteria

- [ ] Matches the linked spec's acceptance criteria.
- [ ] Lint + typecheck + tests pass.
- [ ] `CHANGELOG.md` updated.

## Notes / Blockers

- Magento OAuth1 may be complex; can be split into a follow-up task.
- Apify / third-party enrichment may require paid account and ToS review.
- Meta story insights require webhook subscription and 24h storage policy.
- WooCommerce/BigCommerce credentials differ from Shopify; connect UI must explain each.
