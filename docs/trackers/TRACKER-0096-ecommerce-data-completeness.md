# TRACKER-0096: eCommerce Data Completeness

- **Status:** Implemented
- **Owner:** claude
- **Requirement:** `docs/requirements/REQ-0096-ecommerce-data-completeness.md`
- **Task:** `docs/tasks/TASK-0096-ecommerce-data-completeness.md`
- **Last updated:** 2026-08-07

## 1. Summary

Removed the 500-order analysis cap (now configurable via `ANALYSIS_ORDER_CAP`,
default 10,000), attribution page now shows real coupon codes, analytics page links
top posts to their detail page, and order sync no longer destructively deletes
orders outside the connector's most recent page.

## 2. Subtasks

- [x] Remove/raise 500-order cap in `prisma-dataset-fetcher.ts` (now `env.ANALYSIS_ORDER_CAP`, default 10,000, with a warning log when the cap is hit).
- [x] Attribution page shows real coupon code (joined from the coupons list already fetched on the page).
- [x] Analytics page links top posts to detail page.
- [x] Order sync uses upsert-only; the destructive `OrderRepository.sync()` (deleteMany of orders absent from a 250-item connector batch) was removed entirely since its only caller (`syncOrders`) was invoking it on a partial batch, silently deleting historical orders every sync. Replaced with `upsertMany()`.
- [x] Tests: existing `apply-shopify-webhook.test.ts` mock updated; no behavior regression per full suite run.
- [x] `npm run lint` passes.
- [x] `npx tsc --noEmit` passes.
- [x] `npm run test` passes (372 passed).
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated.

## 3. Notes

- This was the highest-severity finding in the batch: `syncOrders()` called
  `connector.getOrders(250)` (a bounded recent page) and then destructively deleted
  every DB order not in that page, on every sync. Any store with >250 orders was
  losing historical order data on each sync run. Fixed by switching to
  `upsertMany()`, which never deletes.
- Post thumbnail on the analytics page top-posts list was deferred — the
  `ContentPerformanceSection.topPosts` type does not currently carry a thumbnail
  URL, and threading it through was judged lower priority than the data-loss fix
  above; the Link-through to the post detail page (which does show the thumbnail
  per REQ-0095) covers the main need.
