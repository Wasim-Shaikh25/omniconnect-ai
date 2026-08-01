# Unbounded `findMany` inventory — `REQ-0068` M4.4

**Date:** 2026-08-01  
**Scope:** Every `prisma.*.findMany` call in `src/modules/*/infrastructure` that is reachable from a list view or returns an array of records.  
**Goal:** Confirm each list-view method has a `take` / `distinct` / pagination bound, or document why an unbounded read is intentional.

## Summary

- All repository list/query methods that drive list views now have a default `take` or effective pagination.
- Two intentional unbounded read sites remain: order diff sync and full-workspace data export. Both are correctness-critical and must read the full set; pagination is deferred to follow-up work.

## Methods bounded in this pass

| Module | Repository | Method | Bound | Notes |
|--------|------------|--------|-------|-------|
| analytics | `PrismaTrackedAccountRepository` | `listByStore` | `take: 1000` | competitors list |
| commerce | `PrismaProductMappingRepository` | `listByStore` | `take: 1000` | catalog mappings |
| commerce | `PrismaShoppableMediaRepository` | `listByStore` | `take: 1000` | shoppable media list |
| conversations | `PrismaMessageRepository` | `listByConversation` | `take: limit = 100` | already bounded |
| conversations | `PrismaMessageRepository` | `listLatestByConversationIds` | `distinct: ["conversationId"]` | database-side bound (M4.1) |
| crm | `PrismaCustomerRepository` | `listByStore` / `listByStores` | `take: 50` / `250` | already bounded |
| crm | `PrismaFollowerRepository` | `listByStore` | `take: options.limit ?? 50` | already bounded |
| ecommerce | `PrismaOrderRepository` | `listByStore` | `take: options.limit ?? 50`, `skip: 0` | added default |
| ecommerce | `PrismaProductRepository` | `listByStore` | `take: options.limit ?? 50` | already bounded |
| ecommerce | `PrismaCouponRepository` | `listByStore` | `take: options.limit ?? 50` | already bounded |
| growth | `PrismaCommentUnlockRepository` | `listCampaignsByStore` | `take: 1000` | added default |
| growth | `PrismaCommentUnlockRepository` | `listRedemptionsByCampaign` | `take: 1000` | added default |
| intelligence | `PrismaMetricRepository` | `listDefinitions` | `take: 1000` | added default |
| intelligence | `PrismaEntityLinkRepository` | `findByEntity` | `take: 1000` | added default |
| intelligence | `PrismaDecisionRepository` | `listByActionPlan` | `take: 1000` | added default |
| intelligence | `PrismaDataQualityRepository` | `listOpen` | `take: 1000` | added default |
| intelligence | `PrismaFeedbackRepository` (extended) | `getKpis` | `take: 1000` | KPI sample window |
| intelligence | `PrismaRolloutGateRepository` (extended) | `getGates` | `take: 100` | bounded |
| notifications | `PrismaNotificationPreferenceRepository` | `listForUser` | `take: 1000` | settings page |
| notifications | `PrismaNotificationRepository` | `findRecentByDedupKey` | `take: 10` | dedup window |
| notifications | `PrismaOrganizationMembersResolver` | `getUserIdsForStore` | `take: 1000` | notification routing |
| organizations | `PrismaStoreRepository` | `listByOrganization` | `take: 1000` | store list/overview |
| organizations | `PrismaOrganizationRepository` | `listAll` | default pagination `{ page: 1, limit: 100 }` | admin dashboard |
| organizations | `PrismaSaaSCouponRepository` | `list` | default pagination `{ page: 1, limit: 100 }` | admin coupons |
| support | `PrismaSupportTicketRepository` | `listByUser` | `take: 1000` | my tickets list |
| support | `PrismaSupportTicketRepository` | `listAll` | default pagination `{ page: 1, limit: 100 }` | admin tickets |
| users | `PrismaUserRepository` | `listByOrganization` / `listAll` | default pagination `{ page: 1, limit: 100 }` | admin users |
| users | `PrismaUserRepository` | `listExportRequests` | `take: 1000` | settings/audit |

## Exceptions (unbounded by design)

| File | Method | Reason | Planned follow-up |
|------|--------|--------|-------------------|
| `src/modules/ecommerce/infrastructure/order.repository.ts` | `sync` / `upsertMany` | Must load all existing `Order.id` + `externalId` for the store to compute which orders to insert/update/delete. | Replace with batched cursor pagination in a future sync-reliability task. |
| `src/modules/users/infrastructure/data-export.ts` | `build` | Exports every `Product`, `Coupon`, `Customer`, `Follower`, `Conversation`, `Notification`, `SupportTicket`, and `Integration` for the user's workspace. | Bounded export pagination tracked under `REQ-0070` data-export hardening. |

## Interface changes

Repository `application/ports.ts` interfaces gained optional `limit` parameters where the underlying Prisma call now supports one:

- `StoreRepository.listByOrganization(organizationId, includeDeleted?, limit?)`
- `TrackedAccountRepository.listByStore(storeId, limit?)`
- `SupportTicketRepository.listByUser(userId, organizationId?, limit?)`
- `NotificationPreferenceRepository.listForUser(userId, limit?)`
- `NotificationRepository.findRecentByDedupKey(dedupKey, since, limit?)`
- `NotificationQueries.findRecentByDedupKey(dedupKey, since, limit?)`
- `UserRepository.listExportRequests(userId, limit?)`
- `CommentUnlockRepository.listCampaignsByStore(storeId, limit?)`
- `CommentUnlockRepository.listRedemptionsByCampaign(campaignId, limit?)`
- `ProductMappingRepository.listByStore(storeId, limit?)`
- `ShoppableMediaRepository.listByStore(storeId, limit?)`
- `EntityLinkRepository.findByEntity(..., limit?)`
- `MetricRepository.listDefinitions(organizationId, limit?)`
- `DataQualityRepository.listOpen(organizationId, storeId?, limit?)`
- `DecisionRepository.listByActionPlan(actionPlanId, limit?)`

`change-role.ts` now explicitly requests `listByOrganization(..., { page: 1, limit: 10000 })` for the last-admin guard so the safety check is not constrained by the list-view default.

## Verification

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run test` — 121 passed, 1 skipped
- `DATABASE_URL=... REDIS_URL=... npm run test:integration` — 12 passed
- `npm run build && npm run build:worker` — passed
