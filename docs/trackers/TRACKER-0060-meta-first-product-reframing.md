# TRACKER-0060: Meta-First Product Reframing

- **Status:** In Progress
- **Requirement:** `docs/requirements/REQ-0060-meta-first-product-reframing.md`
- **Task:** `docs/tasks/TASK-0060-meta-first-product-reframing.md`
- **Module(s):** presentation, ecommerce, organizations, coupons, meta, analytics
- **Owner:** Devin
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Meta-first UI reframe and navigation cleanup.

## Description

Implement the Meta-first product reframe defined in the linked spec. The app must read as a Meta growth/insights platform for creators and Shopify merchants, not a Shopify admin. This task tracks the sidebar/hamburger work, permanently deleting out-of-scope pages, making product/order data read-only in the UI, keeping coupon lifecycle scoped to Meta campaigns, and updating copy.

## Subtasks

### Navigation & Layout
- [ ] Audit current `TopNav` / `MobileNav` usage and route definitions.
- [ ] Design and implement collapsible sidebar (`DesktopSidebar` + `MobileSidebar`) with hamburger.
- [ ] Group nav items under Connect / Engage / Create / Analyze / Settings.
- [ ] Remove nav links to deleted/out-of-scope pages from sidebar and top nav.

### Store/Product/Coupon UI Cleanup
- [ ] Remove archive/restore/delete buttons from `/stores` and `/stores/[id]/settings`.
- [ ] Remove product edit/delete actions from `/stores/[id]/products` and make list read-only.
- [ ] Update product empty state to “Sync your Shopify catalog for AI insights.”
- [ ] Keep coupon lifecycle for Meta campaign coupons (first-follower / DM) and remove standalone generic coupon management UI.

### Out-of-Scope Page Deletion
- [ ] Delete `src/app/stores/[storeId]/(affiliates|media-kit|growth|revenue|projects|daily-marketing|engagement|brand-deals|orders)` route directories.
- [ ] Delete `src/app/projects`.
- [ ] Delete `src/app/stores/[storeId]/commerce/(leads|growth|catalog)` if unwired / overlapping.
- [ ] Delete unused `/settings/*` pages (`rollout`, `operating-model`, `quality`, `unified-context`) if present.
- [ ] Remove any components/server actions that are only referenced by deleted pages.

### Copy & Positioning
- [ ] Update landing page hero/subtitle to Meta-first value prop.
- [ ] Update onboarding steps to “Connect Shopify” / “Connect Meta” / “Create your first campaign.”
- [ ] Update dashboard empty state and KPI labels to “Meta engagement,” “AI replies,” etc.
- [ ] Update first-follower campaign copy to clarify it generates a Shopify coupon for Meta followers.

### Verification
- [ ] `npm run lint` passes.
- [ ] `DATABASE_URL=... npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` and `npm run build:worker` pass.
- [ ] Manual spot-check of navigation on desktop and mobile.

## Acceptance Criteria

- [ ] Matches the linked spec's acceptance criteria.
- [ ] Lint + typecheck + tests pass.
- [ ] `CHANGELOG.md` updated.

## Notes / Blockers

- Deletion of `commerce/catalog`, `commerce/leads`, and `commerce/growth` depends on whether they have real Meta/Shopify integration wiring; verify before deleting.
- No Prisma migrations are needed; this is a UI/UX + server-action exposure change.
