# Spec 0002: eCommerce Connector Framework

- **Module(s):** ecommerce
- **Status:** Draft
- **Owner:** wasim
- **Related task(s):** docs/tasks/backlog.md
- **Related ADR(s):** —
- **Last updated:** 2026-07-24

## 1. Summary
Provider-agnostic connector framework. A single `EcommerceConnector` interface is implemented per provider; Shopify is the first provider. Adding WooCommerce/BigCommerce/etc. requires implementing the interface only.

## 2. Goals
- Define `EcommerceConnector` interface: getProducts, getOrders, getCustomers, generateCoupon, disableCoupon, fetchDiscounts, fetchStoreInfo
- Shopify OAuth integration
- Read product catalog, product details, inventory
- Generate coupon codes, deactivate coupons, verify coupon usage
- Provider registry so callers depend on the interface, never a concrete provider

## 3. Non-Goals
- Anything listed under Phase 2/3 in the Future Roadmap (see `docs/specs/0000-project-overview.md`).

## 4. Public Contract (loose coupling)
- `EcommerceConnector` interface (the seven methods above).
- `ConnectorRegistry.get(provider)` → returns a connector.
- Domain events: `StoreConnected`, `CouponGenerated`, `CouponDisabled`, `CouponUsed`.
- `coupons` module orchestrates coupon lifecycle through this connector port.

> Other modules interact ONLY through the contract above (application service / port /
> domain events). No module imports this module's internals. No circular dependencies.

## 5. Data / Persistence
`Stores`, `Integrations` (provider, credentials ref, scopes), `Products`, `Coupons`, `CouponUsage`. Ownership: `ecommerce` (+ `coupons` for coupon domain rules).
All schema changes via Prisma migrations.

## 6. Notes
Credentials stored via secrets ref, never in plaintext. Rate-limit + retry per provider adapter.

## 7. Acceptance Criteria (Definition of Done)
- [ ] Domain modeled (entities, events) with pure unit tests.
- [ ] Application services/ports implemented and exposed via the module's public barrel.
- [ ] Infrastructure adapters/repositories implemented (Prisma, external APIs).
- [ ] Presentation (routes/UI) wired where applicable, with RBAC.
- [ ] Lint + typecheck + tests pass; `CHANGELOG.md` updated.

> This is an initial stub. Expand using `_TEMPLATE.md` before implementation begins.
