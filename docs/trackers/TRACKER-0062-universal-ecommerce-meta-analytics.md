# TRACKER-0062: Universal E-commerce Connectors + Meta Business Growth Analytics

- **Status:** Completed
- **Requirement:** `docs/requirements/REQ-0062-universal-ecommerce-meta-analytics.md`
- **Task:** `docs/tasks/TASK-0062-universal-ecommerce-meta-analytics.md`
- **Module(s):** ecommerce, meta, analytics, coupons, ai, crm, conversations
- **Owner:** Devin
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Universal e-commerce connectors and advanced Meta analytics.

## Description

Implement the universal e-commerce and advanced analytics capabilities from the linked spec. This task covers adding WooCommerce/BigCommerce/Magento connectors, extending order attribution, building the business growth analytics dashboard, and delivering AI-driven content recommendations that outperform Meta's native insights.

## Subtasks

### Schema & Attribution Foundation
- [x] Add `Order.attributedMediaId`, `Order.attributionSource`, `Order.couponCode`, `Order.isFirstTimeCustomer` with indexes.
- [x] Add `Coupon.usageCount`, `Coupon.revenueAttributed`, `Coupon.lastUsedAt`.
- [x] Extend `MediaPost`/`MediaInsight` with reel/video/story metrics.
- [x] Generate and apply Prisma migration.
- [x] Update order-sync logic to attribute orders to media (7-day window) and coupon codes.
- [x] Mark first-time customers based on store order history.

### Universal E-commerce Connectors
- [x] Refactor `ConnectorCredentials` to support provider-specific credential shapes.
- [x] Update `getConnector` registry to dispatch WooCommerce/BigCommerce/Magento.
- [x] Implement `WooCommerceConnector` (REST v3 products/orders/customers/coupons).
- [x] Implement `BigCommerceConnector` (v3 products/orders/customers; v2 promotions).
- [x] Implement `MagentoConnector` (REST V1 products/orders/customers) or document as Phase 2.
- [x] Add provider-specific connect forms and validation.
- [x] Add connector unit tests with mocked HTTP responses.

### Enhanced Meta Insights
- [x] Extend `MetaService.getAccountMedia` to fetch reels/stories/live where available.
- [x] Extend `MetaService.getMediaInsights` with video, follows, profile visits, saves, shares.
- [x] Add story-insights webhook handling (best-effort).
- [x] Add `searchHashtagMedia` / `getTrendingAudio` public API wrappers (with Apify fallback).

### Analytics Dashboard
- [x] Extend `MarketingPerformanceView` with `newCustomersFromMeta`, `couponsUsed`, `couponConversionRate`, `topContentByRevenue`.
- [x] Build `/analytics/growth` page with KPI cards, growth chart, and content-attribution table.
- [x] Add coupon effectiveness table.
- [x] Add new-customers-from-Meta metric and list.
- [x] Add trending content panel (hashtags, audio, competitor posts, AI reuse suggestions).
- [x] Add best-time-to-post heatmap.
- [x] Add AI content calendar with suggested publish times.
- [x] Add data-quality badges and empty states.

### AI & Recommendations
- [x] Extend `generateContentIdea` to include `basedOnMediaIds`, `predictedEngagement`, `suggestedPublishAt`.
- [x] Add `getBestTimeToPost` analytic from historical engagement/order spikes.
- [x] Add `getContentCalendar` use case and server action.
- [x] Add AI “repurpose this top post” recommendations.

### Reports
- [x] Extend weekly AI report with growth, attribution, coupon performance, and content calendar.

### Verification
- [x] `npm run lint` passes.
- [x] `DATABASE_URL=... npm run typecheck` passes.
- [x] `npm run test` passes (new connector tests + attribution tests).
- [x] `npm audit` reports 0 vulnerabilities.
- [x] `npm run build` and `npm run build:worker` pass.
- [x] Manual E2E: connect provider → sync products → create first-follower campaign → view analytics.

## Acceptance Criteria

- [x] Matches the linked spec's acceptance criteria.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.

## Notes / Blockers

- Magento OAuth1 may be complex; can be split into a follow-up task.
- Apify / third-party enrichment may require paid account and ToS review.
- Meta story insights require webhook subscription and 24h storage policy.
- WooCommerce/BigCommerce credentials differ from Shopify; connect UI must explain each.
