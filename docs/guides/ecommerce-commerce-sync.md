# OmniConnect — E-commerce Commerce Sync & Analytics (Complete Handoff)

**Add this file to:** `docs/guides/ecommerce-commerce-sync.md` in the `omniconnect-ai` repo  
**Suggested branch:** `cursor/canvil-connector-d12f` (or merge into `main` after review)  
**Last updated:** 2026-07-30  
**Status:** Planning + partial implementation — read before any connector work

---

## How to use this document

1. Copy this file into OmniConnect at `docs/guides/ecommerce-commerce-sync.md`.
2. Create linked docs from templates (optional but recommended per `AGENTS.md`):
   - `docs/requirements/REQ-0067-shopify-graphql-commerce-sync.md`
   - `docs/tasks/TASK-0067-shopify-graphql-commerce-sync.md`
   - `docs/trackers/TRACKER-0067-shopify-graphql-commerce-sync.md`
3. Complete **§0 Research checklist** before writing connector code.
4. Update `CHANGELOG.md` when work ships.

---

## Executive summary

OmniConnect is a **Meta growth + business intelligence layer** on e-commerce data. It is **not** a coupon tool.

```
E-commerce (Shopify | Woo | BigCommerce | headless CUSTOM)
        ↓  sync: products, orders (+ line items), customers, discounts
OmniConnect DB (normalized Product, Order, Customer, Coupon)
        ↓
Analytics + Intelligence (revenue, AOV, top products, coupon ROI, AI recommendations)
        ↓  write actions
Coupons pushed to store checkout (optional)
```

| Priority | Provider | Protocol |
|----------|----------|----------|
| **Primary** | `SHOPIFY` | Admin **GraphQL** + webhooks |
| **Secondary** | `WOOCOMMERCE`, `BIGCOMMERCE` | Native REST → same DTOs |
| **Edge** | `CUSTOM` | Shopify-compat GraphQL on merchant domain |

**Never** add vendor-specific provider enums (`CANVIL`, etc.). Personal headless stores connect as **`CUSTOM`**.

---

## §0 — Research checklist (mandatory before coding)

Complete every item. Paste findings into `TASK-0067` before Step 1.

### 0.1 Read internal OmniConnect docs

- [ ] `CHANGELOG.md`
- [ ] `docs/specs/current-state.md`
- [ ] `AGENTS.md` §0 (REQ → TASK → TRACKER workflow)
- [ ] `docs/requirements/REQ-0062-universal-ecommerce-meta-analytics.md`
- [ ] `src/modules/ecommerce/domain/connector.ts`
- [ ] `src/modules/intelligence/application/metrics.ts`
- [ ] `prisma/schema.prisma` — `Product`, `Order`, `Customer`, `Coupon`

### 0.2 Read Shopify official docs

| Topic | URL |
|-------|-----|
| Admin GraphQL overview | https://shopify.dev/docs/api/admin-graphql |
| Products query | https://shopify.dev/docs/api/admin-graphql/latest/queries/products |
| Orders query | https://shopify.dev/docs/api/admin-graphql/latest/queries/orders |
| Customers query | https://shopify.dev/docs/api/admin-graphql/latest/queries/customers |
| Create discount | https://shopify.dev/docs/api/admin-graphql/latest/mutations/discountCodeBasicCreate |
| Deactivate discount | https://shopify.dev/docs/api/admin-graphql/latest/mutations/discountCodeDeactivate |
| Webhooks | https://shopify.dev/docs/api/admin-rest/latest/resources/webhook |
| Access scopes | https://shopify.dev/docs/api/usage/access-scopes |
| Rate limits | https://shopify.dev/docs/api/usage/rate-limits |

**Required scopes:** `read_products`, `read_orders`, `read_customers`, `write_discounts`, `read_discounts`

### 0.3 Field mapping exercise

For each row in **§2 Analytics Data Contract**, document:
- Shopify GraphQL field name
- OmniConnect consumer (metric / feature)
- Stored in Prisma today? (yes/no)

### 0.4 API strategy decision

| Option | Status |
|--------|--------|
| **GraphQL Admin API** | **Target** — Shopify + CUSTOM headless |
| REST Price Rules (current `shopify.connector.ts`) | **Deprecate** |
| REST `/api/v1` via `HeadlessApiConnector` | **Transitional** only |

### 0.5 Acceptance proof (E2E)

- [ ] `syncProducts` → product count metric + store UI
- [ ] `syncOrders` → `revenue_7d`, `order_count_7d`, `aov_7d`
- [ ] Orders with **line items** → top-product / stock-out recommendations
- [ ] `generateCoupon` + push → code works at checkout
- [ ] `fetchDiscounts` → coupon effectiveness table
- [ ] Webhook or delta sync → new order without full re-sync

---

## §1 — What OmniConnect reads (full data requirements)

Analytics and intelligence modules read from **OmniConnect DB after sync**. They never call Shopify directly.

### 1.1 Products (`ConnectorProduct`)

| Field | Required | In DB today | Shopify GraphQL | Used for |
|-------|----------|-------------|-----------------|----------|
| `externalId` | yes | yes | `product.id` | sync key |
| `title` | yes | yes | `product.title` | UI, recommendations |
| `description` | no | yes | `product.description` | AI content |
| `price` | yes | yes | `variant.price` | merchandising |
| `compareAtPrice` | no | **no** | `variant.compareAtPrice` | sale detection |
| `currency` | no | yes | `shop.currencyCode` | formatting |
| `inventory` | yes | yes | `variant.inventoryQuantity` | **low-stock alerts** |
| `imageUrl` | no | yes | `product.featuredImage.url` | Meta catalog |
| `sku` | no | **no** | `variant.sku` | ops |
| `status` | no | **no** | `product.status` | filter drafts |
| `tags` | no | **no** | `product.tags` | segmentation |
| `productType` | no | **no** | `product.productType` | reporting |
| `vendor` | no | **no** | `product.vendor` | reporting |
| `updatedAt` | no | **no** | `product.updatedAt` | delta sync |

### 1.2 Orders (`ConnectorOrder`) — **most critical for analytics**

| Field | Required | In DB today | Shopify GraphQL | Used for |
|-------|----------|-------------|-----------------|----------|
| `externalId` | yes | yes | `order.id` | sync key |
| `orderNumber` | no | **no** | `order.name` | UI |
| `total` | yes | yes | `totalPriceSet.shopMoney.amount` | **revenue_7d** |
| `subtotal` | no | **no** | `subtotalPriceSet` | margin |
| `discountTotal` | no | **no** | `totalDiscountsSet` | promo analysis |
| `shippingTotal` | no | **no** | `totalShippingPriceSet` | AOV breakdown |
| `taxTotal` | no | **no** | `totalTaxSet` | reporting |
| `currency` | yes | yes | `currencyCode` | formatting |
| `createdAt` | yes | yes | `createdAt` | time series |
| `financialStatus` | yes | **no** | `displayFinancialStatus` | **exclude unpaid** |
| `fulfillmentStatus` | no | **no** | `displayFulfillmentStatus` | ops |
| `cancelledAt` | no | **no** | `cancelledAt` | net revenue |
| `refundedAmount` | no | **no** | `totalRefundedSet` | net revenue |
| `customerRef` | yes | yes | `customer.id` | CRM |
| `customerEmail` | yes | yes | `customer.email` | DM / identity |
| `couponCode` | yes | yes | `discountCodes` | **coupon ROI** |
| `isFirstTimeCustomer` | no | yes | derived | new customer KPI |
| **`lineItems[]`** | **yes** | **NOT PERSISTED** | `lineItems` | **top products by revenue** |

**Line item shape (required):**

```typescript
{
  externalId: string;
  productExternalId: string | null;
  variantExternalId: string | null;
  title: string;
  sku: string | null;
  quantity: number;
  price: number;      // unit
  total: number;
}
```

### 1.3 Customers (`ConnectorCustomer`)

| Field | Required | In DB today | Shopify GraphQL | Used for |
|-------|----------|-------------|-----------------|----------|
| `externalId` | yes | partial | `customer.id` | link to orders |
| `email` | yes | partial | `customer.email` | identity |
| `name` | no | partial | `displayName` | UI |
| `phone` | no | **no** | `phone` | support |
| `ordersCount` | no | **no** | `numberOfOrders` | VIP / churn |
| `totalSpent` | no | **no** | `amountSpent` | LTV |
| `lastOrderAt` | no | **no** | `lastOrder.createdAt` | churn |

**Gap:** `syncCustomers` use-case exists on interface but is **not wired** to UI/actions yet.

### 1.4 Discounts / coupons

| Field | Read | Write | Shopify GraphQL |
|-------|------|-------|-----------------|
| `code` | yes | yes | `discountCode` |
| `discountPct` | yes | yes | `customerGets.value.percentage` |
| `status` | yes | — | active / expired |
| `usageCount` | yes | — | `asyncUsageCount` |
| `usageLimit` | no | yes | `usageLimit` |
| `expiresAt` | yes | yes | `endsAt` |
| `oncePerCustomer` | no | yes | `appliesOncePerCustomer` |

---

## §2 — Intelligence metrics → data dependencies

| Metric / feature | Required data |
|------------------|---------------|
| `revenue_7d` | `Order.total` where `financialStatus` = PAID, last 7 days |
| `order_count_7d` | Count of paid orders |
| `aov_7d` | revenue / count |
| `product_count` | `Product` rows |
| `coupon_count` | `Coupon` rows |
| Top product by revenue | **`Order.lineItems`** × qty × price |
| Revenue decline diagnosis | revenue windows + **product inventory** |
| Coupon effectiveness | `Coupon.code` ↔ `Order.couponCode` |
| New customers from Meta | `Order.isFirstTimeCustomer` + attribution |
| Low-stock recommendations | `Product.inventory` + order line items mentioning product |
| Meta catalog sync | `Product.title`, `price`, `imageUrl`, `inventory` |

---

## §3 — Shopify GraphQL reference queries

Pin API version (suggest `2025-01`). These are the **canonical contract** — headless CUSTOM stores must return equivalent shapes.

### 3.1 Shop

```graphql
query ShopInfo {
  shop {
    name
    myshopifyDomain
    currencyCode
    primaryDomain { url }
  }
}
```

### 3.2 Products

```graphql
query SyncProducts($first: Int!, $after: String) {
  products(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
    edges {
      node {
        id
        title
        description
        status
        vendor
        productType
        tags
        updatedAt
        featuredImage { url }
        variants(first: 10) {
          edges {
            node {
              id
              sku
              price
              compareAtPrice
              inventoryQuantity
            }
          }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

### 3.3 Orders (must include line items)

```graphql
query SyncOrders($first: Int!, $after: String, $query: String) {
  orders(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        updatedAt
        cancelledAt
        displayFinancialStatus
        displayFulfillmentStatus
        currencyCode
        discountCodes
        totalPriceSet { shopMoney { amount currencyCode } }
        subtotalPriceSet { shopMoney { amount } }
        totalDiscountsSet { shopMoney { amount } }
        totalShippingPriceSet { shopMoney { amount } }
        totalTaxSet { shopMoney { amount } }
        totalRefundedSet { shopMoney { amount } }
        customer { id email displayName phone numberOfOrders }
        lineItems(first: 50) {
          edges {
            node {
              id
              title
              quantity
              sku
              originalUnitPriceSet { shopMoney { amount } }
              variant { id product { id } }
            }
          }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

Delta sync variable: `"updated_at:>='2026-07-01T00:00:00Z'"`

### 3.4 Customers

```graphql
query SyncCustomers($first: Int!, $after: String) {
  customers(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
    edges {
      node {
        id
        email
        displayName
        phone
        numberOfOrders
        amountSpent { amount currencyCode }
        createdAt
        lastOrder { createdAt }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

### 3.5 List discounts

```graphql
query ListDiscounts($first: Int!) {
  codeDiscountNodes(first: $first, sortKey: CREATED_AT, reverse: true) {
    edges {
      node {
        id
        codeDiscount {
          ... on DiscountCodeBasic {
            title
            status
            asyncUsageCount
            usageLimit
            startsAt
            endsAt
            codes(first: 1) { nodes { code } }
            customerGets {
              value { ... on DiscountPercentage { percentage } }
            }
          }
        }
      }
    }
  }
}
```

### 3.6 Create discount (replace REST Price Rules)

```graphql
mutation CreateDiscount($input: DiscountCodeBasicInput!) {
  discountCodeBasicCreate(basicCodeDiscount: $input) {
    codeDiscountNode { id }
    userErrors { field message }
  }
}
```

Example variables (10% off):

```json
{
  "input": {
    "title": "WELCOME10",
    "code": "WELCOME10",
    "startsAt": "2026-07-30T00:00:00Z",
    "customerGets": {
      "value": { "percentage": 0.10 },
      "items": { "all": true }
    },
    "context": { "allCustomers": true },
    "usageLimit": 100,
    "appliesOncePerCustomer": true
  }
}
```

Docs: https://shopify.dev/docs/api/admin-graphql/latest/mutations/discountCodeBasicCreate

---

## §4 — Sync architecture

### 4.1 Modes

| Mode | Trigger | Implementation |
|------|---------|----------------|
| Full backfill | `connectStore` | Paginated GraphQL |
| Manual poll | Sync buttons on store page | `syncProducts`, `syncOrders` |
| Delta poll | Cron (future) | `updated_at:>=` query filter |
| Real-time | Webhooks | `POST /api/shopify/webhooks` (exists) |

### 4.2 Webhook topics

| Topic | Action |
|-------|--------|
| `products/create`, `update`, `delete` | Upsert / soft-delete `Product` |
| `orders/create`, `paid`, `updated` | Upsert `Order` |
| `orders/cancelled` | Mark cancelled |
| `refunds/create` | Update net revenue |
| `inventory_levels/update` | Update inventory |
| `discounts/create`, `update` | Refresh discounts |

### 4.3 CUSTOM / headless stores

Expose same GraphQL endpoint:

```
POST https://{store}/admin/api/2025-01/graphql.json
X-Shopify-Access-Token: {apiKey}
```

Until headless GraphQL exists, `HeadlessApiConnector` (CUSTOM + base URL + API key) speaks REST `/api/v1/*`.

---

## §5 — Coupon push (write path)

Coupons are **one write action** on the read pipeline.

### Flow

```
UI / AI / Campaign
       ↓
 generateCoupon (pushToProvider: true by default)
       ↓
 connector.generateCoupon()  →  Shopify GraphQL or headless API
       ↓
 coupons.create() in OmniConnect DB + CouponGenerated event
```

### Key files (already implemented on feature branch)

| File | Role |
|------|------|
| `src/modules/ecommerce/application/generate-coupon.ts` | `pushToProvider` flag |
| `src/components/generate-coupon-form.tsx` | Push toggle + expiry field |
| `src/modules/ecommerce/infrastructure/providers/shopify.connector.ts` | REST (migrate to GraphQL) |
| `src/modules/ecommerce/infrastructure/providers/headless-api.connector.ts` | CUSTOM REST bridge |
| `src/modules/coupons/application/welcome-first-follower.ts` | `pushToProvider: false` for welcome DMs |

### Shopify coupon API today vs target

| | Today (REST) | Target (GraphQL) |
|---|-------------|------------------|
| Create | `POST price_rules.json` + `discount_codes.json` | `discountCodeBasicCreate` |
| List | `GET price_rules.json` | `codeDiscountNodes` |
| Disable | `DELETE price_rules/{id}` | `discountCodeDeactivate` |

---

## §6 — Code already on feature branch

Branch: `cursor/canvil-connector-d12f`

| Commit | Changes |
|--------|---------|
| `b63f66d` | Reverted `CANVIL` provider; added `HeadlessApiConnector` under `CUSTOM`; coupon form push toggle |
| `59a8e4d` | This design guide + REQ-0067 planning docs |

### `HeadlessApiConnector` (CUSTOM provider)

- File: `src/modules/ecommerce/infrastructure/providers/headless-api.connector.ts`
- When: `provider === "CUSTOM"` + `shopDomain` + `accessToken`
- Calls: `{baseUrl}/api/v1/{store,products,orders,customers,coupons}`
- Auth: `X-API-Key` header
- **Transitional** — retire when headless stores ship Shopify GraphQL compat

### Connect form (`CUSTOM`)

- Store base URL + API key fields in `src/components/connect-store-form.tsx`

---

## §7 — Persistence gaps to fix (REQ-0067)

| Gap | Fix |
|-----|-----|
| Order line items not stored | Add `OrderLineItem` table or `lineItems Json` on `Order` |
| `syncCustomers` not wired | New use-case + UI button |
| `financialStatus` not on Order | Prisma migration + filter metrics |
| REST Shopify connector | New `ShopifyGraphQLConnector` |
| Thin connector DTOs | Expand `connector.ts` types |

---

## §8 — Implementation roadmap

| Phase | OmniConnect | Headless store (e.g. Canvil CUSTOM) |
|-------|-------------|-------------------------------------|
| **P0** | Complete §0 research; approve REQ-0067 | Approve Shopify GraphQL compat REQ |
| **P1** | `ShopifyGraphQLConnector` — shop, products, orders | `POST .../graphql.json` endpoint |
| **P2** | Persist line items; filter revenue by financial status | Order `lineItems` in GraphQL |
| **P3** | `syncCustomers`; GraphQL discounts read/write | Customer + discount resolvers |
| **P4** | Extend webhook normalizer | Emit Shopify-shaped webhooks |
| **P5** | Remove REST Price Rules; deprecate `HeadlessApiConnector` | Keep `/api/v1` legacy only |

---

## §9 — REQ-0067 quick reference (create from templates)

### Requirement summary

Migrate Shopify connector to **Admin GraphQL** for full analytics sync + coupon push. Expand DTOs and persist order line items.

### Acceptance criteria

- [ ] §0 research complete
- [ ] `ShopifyGraphQLConnector` implements `EcommerceConnector`
- [ ] `syncOrders` persists line items
- [ ] `syncCustomers` wired
- [ ] `revenue_7d` excludes unpaid orders
- [ ] `generateCoupon` via `discountCodeBasicCreate`
- [ ] `fetchDiscounts` via `codeDiscountNodes`
- [ ] Quality gates pass

### Implementation steps

1. Expand `src/modules/ecommerce/domain/connector.ts` DTOs
2. Prisma migration for line items + `financialStatus`
3. Create `shopify-graphql.connector.ts`
4. Register in `provider-registry.ts` for `SHOPIFY`
5. Add `sync-customers.ts` use-case
6. Update `metrics.ts` revenue filters
7. Unit tests with mocked GraphQL responses

---

## §10 — Decision log

| Date | Decision |
|------|----------|
| 2026-07-30 | OmniConnect is **analytics-first**; coupons are one write action |
| 2026-07-30 | **Shopify Admin GraphQL** is target for Shopify + CUSTOM |
| 2026-07-30 | **Rejected** vendor-specific `CANVIL` provider enum |
| 2026-07-30 | `HeadlessApiConnector` is transitional REST for CUSTOM |
| 2026-07-30 | §0 research checklist mandatory before implementation |

---

## §11 — Related OmniConnect files

```
src/modules/ecommerce/domain/connector.ts          # DTO contract
src/modules/ecommerce/infrastructure/provider-registry.ts
src/modules/ecommerce/infrastructure/providers/shopify.connector.ts       # REST (legacy)
src/modules/ecommerce/infrastructure/providers/headless-api.connector.ts  # CUSTOM REST
src/modules/ecommerce/application/sync-products.ts
src/modules/ecommerce/application/sync-orders.ts
src/modules/ecommerce/application/generate-coupon.ts
src/modules/intelligence/application/metrics.ts
app/api/shopify/webhooks/route.ts                  # incremental sync
prisma/schema.prisma                               # Product, Order, Coupon
```

---

*End of handoff document.*
