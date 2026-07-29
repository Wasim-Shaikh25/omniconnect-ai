# TASK-0012: Meta Commerce & Engagement Automation (Phase 2)

- **Status:** Completed
- **Owner:** wasim
- **Module(s):** ecommerce, meta, crm, ai, notifications, commerce, social, growth
- **Requirement:** `docs/requirements/REQ-0012-meta-commerce-engagement-automation.md`
- **Tracker:** `docs/trackers/TRACKER-0012-meta-commerce-engagement-automation.md`
- **Changelog entry:** See `CHANGELOG.md` (follow-up to TASK-0012).
- **Last updated:** 2026-07-29

## 1. Summary

Implementation task for REQ-0012, scoped to the Shopify → Meta read-only data flow. The Shopify webhook handler is wired to receive catalog, order, and abandoned-cart events and feed them into product/order persistence and conversational commerce.

## 2. References

- Requirement: `docs/requirements/REQ-0012-meta-commerce-engagement-automation.md`
- Tracker: `docs/trackers/TRACKER-0012-meta-commerce-engagement-automation.md`
- Webhook route: `src/app/api/shopify/webhooks/route.ts`
- Webhook use case: `src/modules/ecommerce/application/apply-shopify-webhook.ts`
- `IntegrationRepository.findByShopDomain`: `src/modules/ecommerce/infrastructure/integration.repository.ts`
- `ProductRepository.upsertMany` + `findByExternalId`: `src/modules/ecommerce/infrastructure/product.repository.ts`
- `OrderRepository.upsertMany`: `src/modules/ecommerce/infrastructure/order.repository.ts`
- `AbandonedCartDetected` event: `src/modules/ecommerce/domain/events.ts`
- `applyShopifyWebhook` export: `src/modules/ecommerce/infrastructure/container.ts` and `src/modules/ecommerce/index.ts`

## 3. Implementation Plan

- [x] Review the requirement and original design.
- [x] Add `findByShopDomain` to `IntegrationRepository` to resolve a Shopify shop domain to a store/integration.
- [x] Add `ProductRepository.findByExternalId` and `OrderRepository.upsertMany` for idempotent single-event processing.
- [x] Create `applyShopifyWebhook` use case that maps `products/*`, `orders/*`, and `checkouts/*` payloads.
- [x] Create `POST /api/shopify/webhooks` route with HMAC-SHA256 signature verification.
- [x] Emit `AbandonedCartDetected` for checkout abandonment events.
- [x] Update `current-state.md` and `CHANGELOG.md`.
- [x] Run lint + typecheck + tests + build.

## 4. Subtasks

- [x] `IntegrationRepository.findByShopDomain` interface + Prisma implementation.
- [x] `ProductRepository.findByExternalId` interface + Prisma implementation.
- [x] `OrderRepository.upsertMany` interface + Prisma implementation (no batch deletion).
- [x] Shopify product/order payload mappers to `ConnectorProduct`/`ConnectorOrder`.
- [x] `AbandonedCartDetected` domain event and `applyShopifyWebhook` use case.
- [x] `/api/shopify/webhooks` route with HMAC verification and idempotent processing.
- [x] Quality gates pass.
- [x] Documentation updated.

## 5. Acceptance Criteria

- [x] Shopify webhooks are verified before processing.
- [x] Product create/update/delete, order create/paid, and abandoned-cart events update the correct store.
- [x] No Shopify product/order event deletes unrelated records.
- [x] Quality gates pass.
- [x] `CHANGELOG.md` and `current-state.md` updated.

## 6. Notes / Blockers

- The broader Phase 2 scope (Instagram Shop catalog push, comment moderation, UGC gallery, ambassadors, etc.) remains partially stubbed; only the Shopify-side webhook feed and abandoned-cart event are completed in this pass, aligned with the Meta-first product charter.
