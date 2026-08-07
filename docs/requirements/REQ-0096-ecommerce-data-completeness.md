# REQ-0096 — eCommerce Data Completeness

## Status: Proposed

## Problem

### Bug 1 — Orders analysis capped at 500 rows

`prisma-dataset-fetcher.ts` `fetchOrders()` always calls
`ecommerce.listOrders(projectId, 500, start)`. For stores with more than 500 orders
this silently truncates the dataset used for all AI analysis (`attribution_breakdown`,
`compare_period`, `correlation`, `cohort_trend`). The 500 figure is hardcoded with
no pagination and no warning surfaced to the user or in logs.

### Bug 2 — Attribution page omits post caption / thumbnail beside revenue

`src/app/stores/[projectId]/analytics/attribution/page.tsx` shows attribution links
(shortCode, URL, coupon, UTM, clicks, conversions, revenue). It does NOT show which
Instagram post is driving the revenue — the `attributedMediaId` field on `Order` is
never displayed anywhere in the UI, so users cannot see "Post X drove Y orders".

The analytics main page does show `content.topPosts` (post caption + orders + revenue)
but omits the post thumbnail (see REQ-0095) and does not link through to the post
detail page.

### Bug 3 — Attribution page shows "Yes/—" for coupon, not the code

`attribution/page.tsx` line 111: `{link.couponId ? "Yes" : "—"}`. When an attribution
link is tied to a coupon the table cell shows "Yes" instead of the actual coupon code.
Users need the actual code to verify which discount was applied.

### Bug 4 — Order sync `deleteMany` removes orders not in the current API batch

`PrismaOrderRepository.sync()` deletes orders whose `externalId` is not in the current
batch: `deleteMany({ where: { projectId, externalId: { notIn: [...] } } })`. When the
eCommerce connector's `listOrders` call is paginated or time-windowed this will
permanently delete previously-synced orders that were not returned in the latest
batch, causing data loss and breaking historical analysis.

## Acceptance Criteria

1. `fetchOrders()` in `prisma-dataset-fetcher.ts` fetches ALL orders from the database
   (no limit cap) by using `ecommerce.listOrders(projectId)` without a `limit`
   argument, or by paginating with cursor/offset until exhausted. If the row count
   exceeds a new configurable env var `ANALYSIS_ORDER_CAP` (default 10,000) a warning
   is logged and the cap is documented.
2. `listOrders` port signature in
   `src/modules/ecommerce/application/ports.ts` must support returning all orders
   (unbounded), or document that `limit=0` means "no limit".
3. The analytics main page `content.topPosts` list items link through to
   `/stores/${projectId}/analytics/content/${post.id}`. Post thumbnail is shown
   beside the caption (as specified in REQ-0095).
4. Attribution page table cell for coupon column shows the actual `couponCode` string
   when set, or "—" when not.
5. `PrismaOrderRepository.sync()` is replaced by `upsertMany()` (add new/update
   existing) followed by a separate archival step rather than a bulk delete of
   non-present records. If full deletion is required it must be gated behind an
   explicit `fullSync: true` flag passed by the caller.
6. Lint, typecheck, and build pass.

## Affected Files

- `src/modules/analytics/infrastructure/prisma-dataset-fetcher.ts` — remove 500 cap
- `src/modules/ecommerce/application/ports.ts` — listOrders signature
- `src/modules/ecommerce/infrastructure/order.repository.ts` — sync safety
- `src/app/stores/[projectId]/analytics/attribution/page.tsx` — show coupon code
- `src/app/stores/[projectId]/analytics/page.tsx` — link posts, add thumbnail

## Priority: High

Bug 1 silently truncates analysis for high-volume stores. Bug 4 causes data loss on incremental syncs.
