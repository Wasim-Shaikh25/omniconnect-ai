import type { AdapterConfigMapping } from "../domain/adapter-config";

export const SHOPIFY_API_VERSION = "2024-01";

export function validateShopDomain(raw: string): string {
  const trimmed = raw.trim().replace(/^https?:\/\//, "").split("/")[0] ?? "";
  if (!trimmed) throw new Error("Shopify shop domain is required");

  const hostname = trimmed.split(":")[0] ?? "";
  const parts = hostname.toLowerCase().split(".");
  const isMyShopify =
    parts.length >= 2 &&
    parts[parts.length - 2] === "myshopify" &&
    parts[parts.length - 1] === "com";

  if (!isMyShopify || !/^[a-z0-9][a-z0-9-]*$/.test(parts[0] ?? "")) {
    throw new Error("Invalid Shopify shop domain: must be a *.myshopify.com hostname");
  }

  return hostname;
}

/**
 * Built-in Shopify Admin REST API mapping. Replaces the hardcoded `ShopifyConnector`
 * with a `ConfigInterpreter`-driven adapter. Coupon creation requires a two-step
 * Shopify flow: create a price rule, then create a discount code under it.
 */
export function getShopifyAdapterMapping(): AdapterConfigMapping {
  return {
    platformName: "SHOPIFY",
    baseUrl: "https://{{shopDomain}}/admin/api/2024-01",
    authPattern: { type: "apiKey", headerName: "X-Shopify-Access-Token", tokenField: "accessToken" },
    credentialSchema: {
      fields: [
        { key: "shopDomain", label: "Shop domain", type: "text", required: true, placeholder: "my-shop.myshopify.com" },
        { key: "accessToken", label: "Admin API access token", type: "password", required: true, placeholder: "shpat_…" },
      ],
    },
    endpoints: {
      fetchStoreInfo: {
        method: "GET",
        path: "shop.json",
        responseMapping: {
          dataPath: "shop",
          fieldMap: {
            name: "name",
            domain: "domain",
            currency: "currency",
            provider: "var:SHOPIFY",
          },
        },
      },
      getProducts: {
        method: "GET",
        path: "products.json",
        queryParams: { limit: "{{limit}}" },
        responseMapping: {
          dataPath: "products",
          fieldMap: {
            externalId: "id",
            title: "title",
            description: "body_html",
            price: "variants.0.price",
            currency: "var:null",
            inventory: "variants.0.inventory_quantity",
            imageUrl: "image.src",
          },
        },
      },
      getOrders: {
        method: "GET",
        path: "orders.json",
        queryParams: { status: "any", limit: "{{limit}}" },
        responseMapping: {
          dataPath: "orders",
          fieldMap: {
            externalId: "id",
            total: "total_price",
            currency: "currency",
            createdAt: "created_at",
            customerRef: "customer.id",
            customerEmail: "customer.email",
            couponCode: "discount_codes.0.code",
            cartToken: "token",
          },
        },
      },
      getCustomers: {
        method: "GET",
        path: "customers.json",
        queryParams: { limit: "{{limit}}" },
        responseMapping: {
          dataPath: "customers",
          fieldMap: {
            externalId: "id",
            name: "name",
            email: "email",
          },
        },
      },
      fetchDiscounts: {
        method: "GET",
        path: "price_rules.json",
        responseMapping: {
          dataPath: "price_rules",
          fieldMap: {
            code: "title",
            discountPct: "value",
            status: "status",
          },
        },
      },
      createCoupon: {
        responseMapping: {
          dataPath: "discount_code",
          fieldMap: {
            code: "code",
            discountPct: "var:discountPct",
            expiresAt: "var:expiresAt",
          },
        },
        steps: [
          {
            method: "POST",
            path: "price_rules.json",
            body: {
              price_rule: {
                title: "{{code}}",
                target_type: "line_item",
                target_selection: "all",
                allocation_method: "across",
                value_type: "percentage",
                value: "-{{discountPct}}",
                customer_selection: "all",
                starts_at: "{{startsAt}}",
                ends_at: "{{expiresAt}}",
              },
            },
            variableMap: { priceRuleId: "price_rule.id" },
          },
          {
            method: "POST",
            path: "price_rules/{{priceRuleId}}/discount_codes.json",
            body: {
              discount_code: { code: "{{code}}" },
            },
            variableMap: {
              code: "discount_code.code",
              discountPct: "var:discountPct",
              expiresAt: "var:expiresAt",
            },
          },
        ],
      },
      disableCoupon: {
        responseMapping: { dataPath: "", fieldMap: {} },
        steps: [
          {
            method: "GET",
            path: "price_rules.json",
            lookup: {
              dataPath: "price_rules",
              field: "title",
              againstVariable: "code",
              variableMap: { priceRuleId: "id" },
              optional: true,
            },
          },
          {
            method: "DELETE",
            path: "price_rules/{{priceRuleId}}.json",
          },
        ],
      },
    },
    pagination: { type: "offset", limitParam: "limit", maxPerPage: 250 },
  };
}
