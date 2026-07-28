import type {
  ConnectorCoupon,
  ConnectorCustomer,
  ConnectorDiscount,
  ConnectorOrder,
  ConnectorProduct,
  EcommerceConnector,
  GenerateCouponInput,
  StoreInfo,
} from "../../domain/connector";

const API_VERSION = "2024-01";
const REQUEST_TIMEOUT_MS = 15000;

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  image: { src: string } | null;
  variants: { price: string; inventory_quantity: number }[];
}

interface ShopifyOrder {
  id: number;
  total_price: string;
  currency: string;
  created_at: string;
  customer: { id: number } | null;
}

interface ShopifyCustomer {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface ShopifyPriceRule {
  id: number;
  title: string;
  value: string;
  status?: string;
}

function validateShopDomain(raw: string): string {
  // Strip optional protocol and trailing paths so we can validate the hostname only.
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
 * Shopify Admin REST API connector.
 *
 * Talks to `https://{shopDomain}/admin/api/{version}`. Requires an Admin API
 * access token (per-store). Tokens are supplied by the caller and never logged.
 */
export class ShopifyConnector implements EcommerceConnector {
  readonly provider = "SHOPIFY";
  private readonly shopDomain: string;

  constructor(
    shopDomain: string,
    private readonly accessToken: string,
  ) {
    this.shopDomain = validateShopDomain(shopDomain);
  }

  private async request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    if (path.includes("..") || path.includes("//")) {
      throw new Error("Invalid API path");
    }

    const res = await fetch(
      `https://${this.shopDomain}/admin/api/${API_VERSION}/${path}`,
      {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          "X-Shopify-Access-Token": this.accessToken,
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
      },
    );
    if (!res.ok) {
      throw new Error(`Shopify request failed: ${res.status}`);
    }
    return (await res.json()) as T;
  }

  async fetchStoreInfo(): Promise<StoreInfo> {
    const data = await this.request<{
      shop: { name: string; domain: string; currency: string };
    }>("shop.json");
    return {
      name: data.shop.name,
      domain: data.shop.domain,
      currency: data.shop.currency,
      provider: this.provider,
    };
  }

  async getProducts(limit = 50): Promise<ConnectorProduct[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 250);
    const data = await this.request<{ products: ShopifyProduct[] }>(
      `products.json?limit=${safeLimit}`,
    );
    return data.products.map((p) => {
      const variant = p.variants[0];
      return {
        externalId: String(p.id),
        title: p.title,
        description: p.body_html,
        price: variant ? Number(variant.price) : null,
        currency: null,
        inventory: variant ? variant.inventory_quantity : null,
        imageUrl: p.image?.src ?? null,
      };
    });
  }

  async getOrders(limit = 50): Promise<ConnectorOrder[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 250);
    const data = await this.request<{ orders: ShopifyOrder[] }>(
      `orders.json?status=any&limit=${safeLimit}`,
    );
    return data.orders.map((o) => ({
      externalId: String(o.id),
      total: Number(o.total_price),
      currency: o.currency,
      createdAt: new Date(o.created_at),
      customerRef: o.customer ? String(o.customer.id) : null,
    }));
  }

  async getCustomers(limit = 50): Promise<ConnectorCustomer[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 250);
    const data = await this.request<{ customers: ShopifyCustomer[] }>(
      `customers.json?limit=${safeLimit}`,
    );
    return data.customers.map((c) => ({
      externalId: String(c.id),
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || null,
      email: c.email,
    }));
  }

  async fetchDiscounts(): Promise<ConnectorDiscount[]> {
    const data = await this.request<{ price_rules: ShopifyPriceRule[] }>(
      "price_rules.json",
    );
    return data.price_rules.map((r) => ({
      code: r.title,
      discountPct: Math.abs(Number(r.value)),
      status: r.status ?? "ACTIVE",
    }));
  }

  async generateCoupon(input: GenerateCouponInput): Promise<ConnectorCoupon> {
    const priceRule = await this.request<{ price_rule: ShopifyPriceRule }>(
      "price_rules.json",
      {
        method: "POST",
        body: JSON.stringify({
          price_rule: {
            title: input.code,
            target_type: "line_item",
            target_selection: "all",
            allocation_method: "across",
            value_type: "percentage",
            value: `-${input.discountPct}`,
            customer_selection: "all",
            starts_at: new Date().toISOString(),
            ends_at: input.expiresAt ? input.expiresAt.toISOString() : null,
          },
        }),
      },
    );

    await this.request(
      `price_rules/${priceRule.price_rule.id}/discount_codes.json`,
      {
        method: "POST",
        body: JSON.stringify({ discount_code: { code: input.code } }),
      },
    );

    return {
      code: input.code,
      discountPct: input.discountPct,
      expiresAt: input.expiresAt ?? null,
    };
  }

  async disableCoupon(code: string): Promise<void> {
    const data = await this.request<{ price_rules: ShopifyPriceRule[] }>(
      "price_rules.json",
    );
    const rule = data.price_rules.find((r) => r.title === code);
    if (!rule) return;
    await this.request(`price_rules/${rule.id}.json`, { method: "DELETE" });
  }
}
