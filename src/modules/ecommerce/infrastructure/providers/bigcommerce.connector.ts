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

const API_BASE = "https://api.bigcommerce.com/stores";
const REQUEST_TIMEOUT_MS = 15000;

interface BigCommerceStoreInfo {
  store_name: string;
  currency: string;
  domain: string;
}

interface BigCommerceProduct {
  id: number;
  name: string;
  description: string | null;
  price: number;
  inventory_level: number | null;
  images: { url_standard: string }[];
}

interface BigCommerceOrder {
  id: number;
  total_inc_tax: number;
  currency_code: string;
  date_created: string;
  customer_id: number;
  coupon_codes?: string[];
}

interface BigCommerceCustomer {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

function normalizeStoreHash(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.startsWith("https://") || trimmed.includes(".")) {
    const match = trimmed.match(/stores\/([a-z0-9]+)/);
    return match ? match[1] : trimmed.replace(/^https?:\/\//, "").split(".")[0];
  }
  return trimmed;
}

export class BigCommerceConnector implements EcommerceConnector {
  readonly provider = "BIGCOMMERCE";
  private readonly storeHash: string;

  constructor(
    storeHash: string,
    private readonly accessToken: string,
  ) {
    this.storeHash = normalizeStoreHash(storeHash);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    return withSpan(
      "ecommerce.bigcommerce.request",
      async () => {
        if (path.includes("..") || path.includes("//")) {
          throw new Error("Invalid API path");
        }
        const url = new URL(`${API_BASE}/${this.storeHash}/v3${path}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch(url.toString(), {
            ...init,
            signal: controller.signal,
            headers: {
              "X-Auth-Token": this.accessToken,
              "Content-Type": "application/json",
              Accept: "application/json",
              ...(init?.headers ?? {}),
            },
          });
        } finally {
          clearTimeout(timeout);
        }
        if (!res.ok) {
          throw new Error(`BigCommerce request failed: ${res.status}`);
        }
        return (await res.json()) as T;
      },
      { attributes: { storeHash: this.storeHash, path } },
    );
  }

  async fetchStoreInfo(): Promise<StoreInfo> {
    const data = await this.request<{ data: BigCommerceStoreInfo }>("/store");
    return {
      name: data.data.store_name,
      domain: data.data.domain,
      currency: data.data.currency,
      provider: this.provider,
    };
  }

  async getProducts(limit = 50): Promise<ConnectorProduct[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 250);
    const data = await this.request<{ data: BigCommerceProduct[] }>(`/catalog/products?limit=${safeLimit}`);
    return data.data.map((p) => ({
      externalId: String(p.id),
      title: p.name,
      description: p.description,
      price: Number(p.price),
      currency: null,
      inventory: p.inventory_level,
      imageUrl: p.images[0]?.url_standard ?? null,
    }));
  }

  async getOrders(limit = 50): Promise<ConnectorOrder[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 250);
    const data = await this.request<{ data: BigCommerceOrder[] }>(`/orders?limit=${safeLimit}`);
    return data.data.map((o) => ({
      externalId: String(o.id),
      total: Number(o.total_inc_tax),
      currency: o.currency_code,
      createdAt: new Date(o.date_created),
      customerRef: String(o.customer_id),
      customerEmail: null,
      couponCode: o.coupon_codes?.[0] ?? null,
    }));
  }

  async getCustomers(limit = 50): Promise<ConnectorCustomer[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 250);
    const data = await this.request<{ data: BigCommerceCustomer[] }>(`/customers?limit=${safeLimit}`);
    return data.data.map((c) => ({
      externalId: String(c.id),
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || null,
      email: c.email,
    }));
  }

  async fetchDiscounts(): Promise<ConnectorDiscount[]> {
    const data = await this.request<{ data: { code: string; amount: number; type: string; status: string }[] }>("/coupons");
    return data.data.map((c) => ({
      code: c.code,
      discountPct: c.type === "percentage_discount" ? Number(c.amount) : 0,
      status: c.status,
    }));
  }

  async generateCoupon(input: GenerateCouponInput): Promise<ConnectorCoupon> {
    await this.request("/coupons", {
      method: "POST",
      body: JSON.stringify({
        code: input.code,
        type: "percentage_discount",
        amount: input.discountPct,
        expires: input.expiresAt ? input.expiresAt.toISOString() : null,
      }),
    });
    return {
      code: input.code,
      discountPct: input.discountPct,
      expiresAt: input.expiresAt ?? null,
    };
  }

  async disableCoupon(code: string): Promise<void> {
    const data = await this.request<{ data: { id: number }[] }>(`/coupons?code=${encodeURIComponent(code)}`);
    const coupon = data.data[0];
    if (!coupon) return;
    await this.request(`/coupons/${coupon.id}`, {
      method: "PUT",
      body: JSON.stringify({ max_uses: 0 }),
    });
  }
}
