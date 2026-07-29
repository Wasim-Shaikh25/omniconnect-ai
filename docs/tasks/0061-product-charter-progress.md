# Task 0061: Product Charter and Scope Cleanup

- **Status:** In Progress
- **Spec:** `docs/specs/0061-product-charter.md`
- **Module(s):** all
- **Owner:** Devin
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Product charter and Meta-first scope cleanup.

## Description

Finalize and ratify the product charter for OmniConnect AI, then clean up the codebase to match the declared scope: universal Meta-first growth platform for creators and merchants. Remove all UI routes, components, and server actions that imply store administration, customer storefront, affiliate/UGC/brand-deals marketplace, or other out-of-scope features. The charter also drives the universal e-commerce + advanced analytics work tracked in `0062`.

## Subtasks

### Phase 0 — Charter
- [x] Draft product charter (`docs/specs/0061-product-charter.md`).
- [x] Create master progress tracker (`docs/tasks/0061-product-charter-progress.md`).
- [ ] Get user approval on charter and deletion list.
- [ ] Update `CHANGELOG.md` with the new scope and associated tasks.

### Phase 1 — Navigation and Layout
- [ ] Audit `TopNav` / `MobileNav` and route tree.
- [ ] Implement collapsible hamburger sidebar with groups: Connect / Create / Engage / Analyze / Settings.
- [ ] Remove nav links to out-of-scope pages.
- [ ] Update landing/onboarding/dashboard copy to Meta-first value prop.

### Phase 2 — Delete Out-of-Scope Routes and Files
- [ ] Delete `src/app/stores/[storeId]/affiliates` (and `src/modules/growth` UI only if unused).
- [ ] Delete `src/app/stores/[storeId]/media-kit`.
- [ ] Delete `src/app/stores/[storeId]/growth`.
- [ ] Delete `src/app/stores/[storeId]/revenue`.
- [ ] Delete `src/app/stores/[storeId]/projects`.
- [ ] Delete `src/app/stores/[storeId]/daily-marketing`.
- [ ] Delete `src/app/stores/[storeId]/engagement`.
- [ ] Delete `src/app/stores/[storeId]/brand-deals`.
- [ ] Delete `src/app/stores/[storeId]/orders` (keep orders widget in Analytics).
- [ ] Delete `src/app/projects`.
- [ ] Delete `src/app/stores/[storeId]/commerce/leads`.
- [ ] Delete `src/app/stores/[storeId]/commerce/growth`.
- [ ] Delete `src/app/stores/[storeId]/commerce/catalog` (if it duplicates product sync).
- [ ] Delete unused `/settings/*` pages (`rollout`, `operating-model`, `quality`, `unified-context`) if present and empty.
- [ ] Remove components/server actions only referenced by deleted pages.

### Phase 3 — Simplify Store/Product/Coupon UI
- [ ] Remove archive/restore/delete buttons from `/stores` and `/stores/[storeId]/settings`.
- [ ] Remove product edit/delete actions from `/stores/[storeId]/products`; make list read-only.
- [ ] Update product empty state to “Sync your e-commerce catalog for AI insights and Meta campaigns.”
- [ ] Keep coupon lifecycle **only** for Meta campaign coupons (first-follower / DM); remove generic standalone coupon management UI.
- [ ] Update `/stores/[storeId]/coupons` to show campaign-generated coupons with campaign context.

### Phase 4 — Universal E-commerce + Advanced Analytics (tracked in `0062`)
- [ ] Add WooCommerce/BigCommerce/Magento connectors.
- [ ] Extend `Order` attribution fields and `Coupon` usage tracking.
- [ ] Build business growth analytics: revenue, new customers, AOV, content-to-sale attribution, coupon effectiveness.
- [ ] Add trending content, best-time-to-post, and AI content calendar.
- [ ] Update analytics copy to “universal e-commerce + Meta growth.”

### Phase 5 — Verify
- [ ] `npm run lint` passes.
- [ ] `DATABASE_URL=... npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` and `npm run build:worker` pass.
- [ ] Manual spot-check of sidebar on desktop and mobile.
- [ ] Spot-check analytics dashboard with new growth/attribution widgets.

## Acceptance Criteria

- [ ] Charter approved and committed.
- [ ] All out-of-scope routes and files are deleted (not hidden).
- [ ] Navigation is Meta-first and uses hamburger/collapsible sidebar.
- [ ] Product/order data is read-only in the UI.
- [ ] Coupon lifecycle is scoped to Meta campaigns.
- [ ] `0062` acceptance criteria met for universal connectors and advanced analytics.
- [ ] Quality gates pass.
- [ ] `CHANGELOG.md` updated.

## Notes / Blockers

- `0060-meta-first-product-reframing.md` is the implementation spec for Phase 1–3; `0062-universal-ecommerce-meta-analytics.md` is the spec for Phase 4.
- Deleting `commerce/catalog`, `commerce/leads`, and `commerce/growth` requires verifying whether they have real Meta/e-commerce wiring or are mock forms.
- Store/product/coupon backend use-cases should remain available for future reuse but no longer be exposed through UI server actions.
- Connector work should not break existing Shopify/Mock connectors.
