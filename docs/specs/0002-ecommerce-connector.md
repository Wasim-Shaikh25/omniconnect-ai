# Spec 0002: eCommerce Connector Framework

- **Module(s):** ecommerce
- **Status:** Implemented (Phase 1)
- **Owner:** wasim
- **Related task(s):** docs/tasks/backlog.md (TASK-040)
- **Related ADR(s):** —
- **Last updated:** 2026-07-24

## 1. Summary
Provider-agnostic connector framework. A single `EcommerceConnector` interface is
implemented per provider; **Shopify** is the first real provider, with a **Mock** provider
for local development (no live credentials). Adding WooCommerce/BigCommerce/etc. means
implementing the interface and registering it — **no caller changes**.

## 2. Goals
- `EcommerceConnector` interface: `getProducts`, `getOrders`, `getCustomers`,
  `generateCoupon`, `disableCoupon`, `fetchDiscounts`, `fetchStoreInfo`.
- Provider **registry** so callers depend on the interface, never a concrete provider.
- Connect a Store to a provider (persist connection in `Integration`).
- Sync products into the catalog; generate/disable coupons via the connector.
- Shopify Admin REST adapter, config-gated; Mock adapter as safe default for dev.

## 3. Non-Goals
- Full coupon lifecycle domain (owned later by the `coupons` module — this module exposes
  the connector-level coupon operations + `CouponGenerated`/`CouponDisabled` events).
- Anything under Phase 2/3 (WhatsApp, Ads, additional providers) — those just implement
  the same interface later.

## 4. Public Contract (loose coupling)
Exposed via `@/modules/ecommerce`:
- Types: `EcommerceConnector`, `ConnectorProduct`, `ConnectorOrder`, `ConnectorCustomer`,
  `ConnectorCoupon`, `ConnectorDiscount`, `StoreInfo`, `GenerateCouponInput`.
- Registry: `getConnector(provider, credentials)` → `EcommerceConnector`.
- Use-cases: `connectStore`, `syncProducts`, `generateCoupon`, `listProducts`, `getStoreConnection`.
- Events: `StoreConnected`, `ProductsSynced`, `CouponGenerated`, `CouponDisabled`.
- Server actions: `connectStoreAction`, `syncProductsAction`, `generateCouponAction`.

> Other modules interact ONLY through the contract above. No deep imports; no cycles.
> Credentials are read via validated config or per-store `Integration` records — never
> hard-coded or logged.

## 5. Provider selection
`getConnector(provider, credentials)`:
- `SHOPIFY` **with** a shop domain + access token → `ShopifyConnector` (Admin REST API).
- Otherwise → `MockConnector` (deterministic in-memory data) so the app is fully usable
  in local/dev without live keys. Selection is logged (provider only, never secrets).

## 6. Data / Persistence
- `Integration` (type=ECOMMERCE, provider, externalId=shop domain, accessToken, scopes,
  metadata) — one active connection per store.
- `Product` (`@@unique([storeId, externalId])`) — upserted on sync.
- `Coupon` (`@@unique([storeId, code])`) — persisted on generate; status flips on disable.
- Ownership: `ecommerce`. All schema changes via Prisma migrations (no new schema needed).

## 7. Acceptance Criteria (Definition of Done)
- [x] `EcommerceConnector` interface + DTOs modeled in a pure domain layer.
- [x] Registry returns a connector by provider; Shopify + Mock implemented.
- [x] `connectStore` / `syncProducts` / `generateCoupon` use-cases exposed via the barrel.
- [x] Prisma repositories for Integration/Product/Coupon; RBAC-gated server actions.
- [x] Store detail page: connect, sync products, generate coupon (works via Mock in dev).
- [x] Lint + typecheck + build pass; `CHANGELOG.md` updated.

## 8. Follow-ups
- Real Shopify OAuth install flow (currently accepts an existing Admin API token).
- Dedicated `coupons` module for coupon domain rules + `CouponUsage` verification.
- Rate-limit/retry + pagination for large Shopify catalogs; webhook-based sync.
