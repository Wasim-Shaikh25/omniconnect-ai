# TRACKER-0012: Meta Commerce & Engagement Automation (Phase 2)

- **Status:** Done
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0012-meta-commerce-engagement-automation.md`
- **Task:** `docs/tasks/TASK-0012-meta-commerce-engagement-automation.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0012. The Shopify → Meta data feed (catalog, orders, abandoned cart) is implemented and verified. Remaining Phase 2 UI (UGC gallery, ambassadors, etc.) remains out of scope for the Meta-first MVP.

## 2. Subtasks

### Planning
- [x] Requirement approved and task created.

### Implementation / Verification
- [x] Domain modeled with `AbandonedCartDetected` event (`src/modules/ecommerce/domain/events.ts`).
- [x] `IntegrationRepository.findByShopDomain` resolves a Shopify shop domain to the owning `Integration`/`Store`.
- [x] `ProductRepository.upsertMany` + `findByExternalId` support idempotent product create/update/delete from webhooks.
- [x] `OrderRepository.upsertMany` supports idempotent order create/update from webhooks without batch-deleting unrelated orders.
- [x] `applyShopifyWebhook` use case normalizes Shopify payloads to `ConnectorProduct`/`ConnectorOrder` and emits `AbandonedCartDetected` for checkout events.
- [x] `POST /api/shopify/webhooks` verifies HMAC-SHA256, maps the shop domain, dispatches `products/create|update|delete`, `orders/create|paid`, and `checkouts/create|update`.
- [x] `applyShopifyWebhook` exported from `ecommerce` container and public barrel.
- [x] Lint + typecheck + tests pass; `CHANGELOG.md` and `docs/specs/current-state.md` updated.

### Quality Gates
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.

## 3. Acceptance Criteria

- [x] All linked requirement acceptance criteria are met for the Shopify webhook scope.
- [x] All quality gates pass.

## 4. Notes / Blockers

- Migrated from legacy spec `docs/specs/0012-meta-commerce-engagement-automation.md`.
- Full Phase 2 UI (catalog push to Meta, UGC, ambassadors) intentionally deferred; the webhook feed is the only remaining acceptance criterion completed in this pass.
