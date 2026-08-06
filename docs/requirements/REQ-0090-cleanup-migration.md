---
description: Cleanup & Migration (Full Rewrite)
---

# REQ-0090: Cleanup & Migration (Full Rewrite)

- **Status:** Implemented
- **Owner:** wasim
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0090-cleanup-migration.md`
- **Related Tracker:** `docs/trackers/TRACKER-0090-cleanup-migration.md`
- **Supersedes:** `REQ-0011-users-organizations-stores.md`, `REQ-0060-meta-first-product-reframing.md`
- **Last updated:** 2026-08-06 (acceptance criteria verified and closed on `devin/batch-meta-oauth-doc-closeouts-1786007775`)

## 1. Summary

Full cleanup of old architecture. Delete Organization, Store, Staff, StoreIntegration models. Replace hardcoded connectors with provider implementations behind the `EcommerceConnector` interface. Delete organizations module entirely. Remove product CRUD, standalone orders view, store lifecycle. Remove direct OpenAI integration. Update all queries from org/store scope to user/workspace/project scope.

## 2. Goals

- Delete Prisma models: Organization, Store, Staff, StoreIntegration, and related relations.
- Delete `src/modules/organizations/` module entirely.
- Replace hardcoded connector files with provider implementations behind `EcommerceConnector`.
- Delete product CRUD actions (updateProductAction, deleteProductAction, bulk operations).
- Delete standalone orders and coupon management views.
- Replace direct OpenAI integration with OpenRouter.
- Update all existing queries: org/store scope → user/workspace/project scope.

## 3. Non-Goals

- Data migration from old schema (clean break — no legacy data preserved).
- Gradual migration (full rewrite chosen over incremental).

## 4. User Stories

- As a developer, I want a clean codebase without legacy organization/store code.
- As a developer, I want all queries scoped to user/workspace/project.

## 5. Acceptance Criteria

- [x] Organization, Store, Staff, StoreIntegration removed from Prisma schema.
- [x] `src/modules/organizations/` directory deleted.
- [x] Hardcoded connector files replaced by `EcommerceConnector` provider implementations (`src/modules/ecommerce/infrastructure/providers/{shopify,woocommerce,bigcommerce}.connector.ts` plus `connector.factory.ts` and `provider-registry.ts`).
- [x] Product CRUD actions deleted (products are read-only via adapter).
- [x] Standalone orders view deleted (orders only in analytics context).
- [x] Direct OpenAI imports replaced with OpenRouter.
- [x] All queries updated to user/workspace/project scope.
- [x] No TypeScript compilation errors after cleanup.
- [x] All tests pass or are updated to reflect new architecture.

## 6. Scope & Dependencies

- Modules: all (cross-cutting cleanup)
- Must be Phase 1 — blocks all other requirements.

## 7. Open Questions

None — full cleanup approach chosen over gradual migration.
