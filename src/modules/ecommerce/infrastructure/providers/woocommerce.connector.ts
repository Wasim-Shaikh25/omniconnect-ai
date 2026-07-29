import { withSpan } from "@/shared/observability";
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

const API_PREFIX = "/wp-json/wc/v3";
const REQUEST_TIMEOUT_MS = 15000;

interface WooCommerceProduct {
  id: number;
  name: string;
  description: string | null;
  price: string;
  regular_price: string;
  stock_quantity: number | null;
  images: { src: string }[];
}

interface WooCommerceOrder {
  id: number;
  total: string;
  currency: string;
  date_created: string;
  coupon_lines?: { code: string }[];
  billing?: { email?: string; first_name?: string; last_name?: string };
  customer_id?: number;
}

interface WooCommerceCustomer {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed.replace(/\/$/, "");
  return `https://${trimmed}`.replace(/\/$/, "");
}

export class WooCommerceConnector implements EcommerceConnector {
  readonly provider = "WOOCOMMERCE";
  private readonly baseUrl: string;

  constructor(
    shopDomain: string,
    private readonly consumerKey: string,
    private readonly consumerSecret: string,
  ) {
    this.baseUrl = normalizeBaseUrl(shopDomain);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    return withSpan(
      "ecommerce.woocommerce.request",
      async () => {
        if (path.includes("..") || path.includes("//")) {
          throw new Error("Invalid API path");
        }
        const url = new URL(`${API_PREFIX}${path}`, this.baseUrl);
        url.searchParams.set("consumer_key", this.consumerKey);
        url.searchParams.set("consumer_secret", this.consumerSecret);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch(url.toString(), {
            ...init,
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              ...(init?.headers ?? {}),
            },
          });
        } finally {
          clearTimeout(timeout);
        }
        if (!res.ok) {
          throw new Error(`WooCommerce request failed: ${res.status}`);
        }
        return (await res.json()) as T;
      },
      { attributes: { baseUrl: this.baseUrl, path } },
    );
  }

  async fetchStoreInfo(): Promise<StoreInfo> {
    const data = await this.request<{ name: string; currency: string }>("/");
    return {
      name: data.name,
      domain: this.baseUrl.replace(/^https?:\/\//, ""),
      currency: data.currency,
      provider: this.provider,
    };
  }

  async getProducts(limit = 50): Promise<ConnectorProduct[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const data = await this.request<WooCommerceProduct[]>(`/products?per_page=${safeLimit}`);
    return data.map((p) => ({
      externalId: String(p.id),
      title: p.name,
      description: p.description,
      price: Number(p.price ?? p.regular_price) || null,
      currency: null,
      inventory: p.stock_quantity,
      imageUrl: p.images[0]?.src ?? null,
    }));
  }

  async getOrders(limit = 50): Promise<ConnectorOrder[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const data = await this.request<WooCommerceOrder[]>(`/orders?per_page=${safeLimit}&status=any`);
    return data.map((o) => ({
      externalId: String(o.id),
      total: Number(o.total),
      currency: o.currency,
      createdAt: new Date(o.date_created),
      customerRef: o.customer_id ? String(o.customer_id) : null,
      customerEmail: o.billing?.email ?? null,
      couponCode: o.coupon_lines?.[0]?.code ?? null,
    }));
  }

  async getCustomers(limit = 50): Promise<ConnectorCustomer[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const data = await this.request<WooCommerceCustomer[]>(`/customers?per_page=${safeLimit}`);
    return data.map((c) => ({
      externalId: String(c.id),
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || null,
      email: c.email,
    }));
  }

  async fetchDiscounts(): Promise<ConnectorDiscount[]> {
    const data = await this.request<{ code: string; amount: string; discount_type: string }[]>("/coupons");
    return data.map((c) => ({
      code: c.code,
      discountPct: Number(c.amount) || 0,
      status: c.discount_type === "percent" ? "ACTIVE" : "ACTIVE",
    }));
  }

  async generateCoupon(input: GenerateCouponInput): Promise<ConnectorCoupon> {
    await this.request("/coupons", {
      method: "POST",
      body: JSON.stringify({
        code: input.code,
        discount_type: "percent",
        amount: String(input.discountPct),
        date_expires: input.expiresAt ? input.expiresAt.toISOString().split("T")[0] : null,
      }),
    });
    return {
      code: input.code,
      discountPct: input.discountPct,
      expiresAt: input.expiresAt ?? null,
    };
  }

  async disableCoupon(code: string): Promise<void> {
    const data = await this.request<{ id: number }[]>(`/coupons?code=${encodeURIComponent(code)}`);
    const coupon = data[0];
    if (!coupon) return;
    await this.request(`/coupons/${coupon.id}`, {
      method: "PUT",
      body: JSON.stringify({ usage_limit: 0 }),
    });
  }
}
