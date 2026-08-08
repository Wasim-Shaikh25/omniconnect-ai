# TASK-0096 — eCommerce Data Completeness

## Requirement: REQ-0096

## Steps

### 1. Remove 500-order cap in dataset fetcher

`src/modules/analytics/infrastructure/prisma-dataset-fetcher.ts` `fetchOrders()`:
replace the hardcoded `500` with an unbounded fetch (or a much higher configurable
cap `ANALYSIS_ORDER_CAP`, default 10000), reading straight from Prisma rather than
going back through the connector limit.

### 2. Attribution page: show real coupon code + link posts

`src/app/stores/[projectId]/analytics/attribution/page.tsx`:
- Replace `{link.couponId ? "Yes" : "—"}` with the coupon's actual code, joined from
  the `coupons` list already fetched on the page (`coupons.find(c => c.id === link.couponId)?.code`).

`src/app/stores/[projectId]/analytics/page.tsx`:
- Wrap each `content.topPosts` item in a `<Link href={.../analytics/content/${post.id}}>`
- Show thumbnail (depends on REQ-0095 field names being available on `topPosts` items —
  add `thumbnailUrl` to the `MarketingPerformanceView.content.topPosts` type if missing)

### 3. Order sync safety — replace destructive deleteMany

Locate `PrismaOrderRepository.sync()` (or equivalent) — likely in
`src/modules/ecommerce/infrastructure/*.repository.ts`. Replace the
`deleteMany({ where: { externalId: { notIn: [...] } } })` pattern with:
- `upsert` each order from the batch (no deletion by default)
- Add a `fullSync?: boolean` parameter; only run the deleteMany cleanup when
  `fullSync === true` and the batch represents the connector's *complete* order list
  (not a paginated/time-windowed partial fetch)

## References

- `src/modules/analytics/infrastructure/prisma-dataset-fetcher.ts`
- `src/modules/ecommerce/application/ports.ts`
- `src/modules/ecommerce/infrastructure/*order*.repository.ts`
- `src/app/stores/[projectId]/analytics/attribution/page.tsx`
- `src/app/stores/[projectId]/analytics/page.tsx`

## Verification

- Confirm actual repository file/method name for order sync before editing (grep for `deleteMany.*externalId`).
- Add/adjust tests for upsert-only sync behavior.
