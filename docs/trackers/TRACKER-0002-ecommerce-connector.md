# TRACKER-0002: eCommerce Connector Framework

- **Status:** Done
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0002-ecommerce-connector.md`
- **Task:** `docs/tasks/TASK-0002-ecommerce-connector.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0002.

## 2. Subtasks

### Planning
- [x] Requirement approved and task created.

### Implementation / Verification
- [x] `EcommerceConnector` interface + DTOs modeled in a pure domain layer.
- [x] Registry returns a connector by provider; Shopify + Mock implemented.
- [x] `connectStore` / `syncProducts` / `generateCoupon` use-cases exposed via the barrel.
- [x] Prisma repositories for Integration/Product/Coupon; RBAC-gated server actions.
- [x] Store detail page: connect, sync products, generate coupon (works via Mock in dev).
- [x] Lint + typecheck + build pass; `CHANGELOG.md` updated.

### Quality Gates
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.

## 3. Acceptance Criteria

- [x] All linked requirement acceptance criteria are met.
- [x] All quality gates pass.

## 4. Notes / Blockers

- Migrated from legacy spec `docs/specs/0002-ecommerce-connector.md`.
