# TRACKER-0061: OmniConnect AI Product Charter and Scope

- **Status:** Done
- **Requirement:** `docs/requirements/REQ-0061-product-charter.md`
- **Task:** `docs/tasks/TASK-0061-product-charter.md`
- **Module(s):** all
- **Owner:** Devin
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Product charter and Meta-first scope cleanup.

## Description

Finalize and ratify the product charter for OmniConnect AI, then clean up the codebase to match the declared scope: universal Meta-first growth platform for creators and merchants. Remove all UI routes, components, and server actions that imply store administration, customer storefront, affiliate/UGC/brand-deals marketplace, or other out-of-scope features. The charter also drives the universal e-commerce + advanced analytics work tracked in `0062`.

## Subtasks

### Phase 0 — Charter
- [x] Draft product charter (`docs/requirements/REQ-0061-product-charter.md`).
- [x] Create master progress tracker (`docs/trackers/TRACKER-0061-product-charter.md`).
- [x] Get user approval on charter and deletion list.
- [x] Update `CHANGELOG.md` with the new scope and associated tasks.

### Phase 1 — Navigation and Layout
- [x] Audit `TopNav` / `MobileNav` and route tree.
- [x] Implement collapsible hamburger sidebar with groups: Connect / Create / Engage / Analyze / Settings.
- [x] Remove nav links to out-of-scope pages.
- [x] Update landing/onboarding/dashboard copy to Meta-first value prop.

### Phase 2 — Delete Out-of-Scope Routes and Files
- [x] Delete `src/app/stores/[storeId]/affiliates`.
- [x] Delete `src/app/stores/[storeId]/media-kit`.
- [x] Delete `src/app/stores/[storeId]/growth`.
- [x] Delete `src/app/stores/[storeId]/revenue`.
- [x] Delete `src/app/stores/[storeId]/daily-marketing`.
- [x] Delete `src/app/stores/[storeId]/engagement`.
- [x] Delete `src/app/stores/[storeId]/brand-deals`.
- [x] Delete `src/app/stores/[storeId]/orders`.
- [x] Delete `src/app/projects`.
- [x] Delete `src/app/stores/[storeId]/commerce/growth`.
- [x] Delete `src/app/stores/[storeId]/commerce/catalog` — kept; it pushes products to Meta Commerce for shoppable posts (different from Shopify import).
- [x] Delete `src/app/stores/[storeId]/commerce/leads` — kept; captures leads from Meta ads/DMs/comments.
- [x] Delete unused `/settings/*` pages (`rollout`, `operating-model`, `quality`, `unified-context`).
- [x] Remove components/server actions only referenced by deleted pages (`app-header`, `mobile-nav`, `store-workflow-nav`, `agency-portfolio-panel`).

### Phase 3 — Simplify Store/Product/Coupon UI
- [x] Remove archive/restore/delete buttons from `/stores/[storeId]/settings`.
- [x] Remove product edit/delete actions from `/stores/[storeId]/products`; make list read-only.
- [x] Update product empty state to “Sync your e-commerce catalog for AI insights and Meta campaigns.”
- [x] Remove generic standalone coupon generation from store page; keep `/stores/[storeId]/coupons` for managing campaign-generated coupons.
- [x] Update `/stores/[storeId]/coupons` to show campaign context (requires `Coupon.campaignId` field — move to 0062/ follow-up).

### Phase 4 — Universal E-commerce + Advanced Analytics (tracked in `0062`)
- [x] Add WooCommerce/BigCommerce/Magento connectors.
- [x] Extend `Order` attribution fields and `Coupon` usage tracking.
- [x] Build business growth analytics: revenue, new customers, AOV, content-to-sale attribution, coupon effectiveness.
- [x] Add trending content, best-time-to-post, and AI content calendar.
- [x] Update analytics copy to “universal e-commerce + Meta growth.”

### Phase 5 — Verify
- [x] `npm run lint` passes.
- [x] `DATABASE_URL=... npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` and `npm run build:worker` pass.
- [x] Manual spot-check of sidebar on desktop and mobile.
- [x] Spot-check analytics dashboard with new growth/attribution widgets.

## Acceptance Criteria

- [x] Charter approved and committed.
- [x] All out-of-scope routes and files are deleted (not hidden).
- [x] Navigation is Meta-first and uses hamburger/collapsible sidebar.
- [x] Product/order data is read-only in the UI.
- [x] Coupon lifecycle is scoped to Meta campaigns.
- [x] `0062` acceptance criteria met for universal connectors and advanced analytics.
- [x] Quality gates pass.
- [x] `CHANGELOG.md` updated.

## Notes / Blockers

- `0060-meta-first-product-reframing.md` is the implementation spec for Phase 1–3; `0062-universal-ecommerce-meta-analytics.md` is the spec for Phase 4.
- Deleting `commerce/catalog`, `commerce/leads`, and `commerce/growth` requires verifying whether they have real Meta/e-commerce wiring or are mock forms.
- Store/product/coupon backend use-cases should remain available for future reuse but no longer be exposed through UI server actions.
- Connector work should not break existing Shopify/Mock connectors.
