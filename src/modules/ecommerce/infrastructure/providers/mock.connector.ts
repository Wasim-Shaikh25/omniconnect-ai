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

/**
 * Deterministic in-memory connector used for local/dev when no live provider
 * credentials are configured. Lets the whole flow (connect → sync → coupon)
 * work end-to-end without external calls. Never used when real credentials exist.
 */
export class MockConnector implements EcommerceConnector {
  readonly provider = "MOCK";

  constructor(private readonly shopDomain: string | null = null) {}

  async fetchStoreInfo(): Promise<StoreInfo> {
    return {
      name: "Demo Store",
      domain: this.shopDomain ?? "demo-store.example.com",
      currency: "INR",
      provider: this.provider,
    };
  }

  async getProducts(limit = 12): Promise<ConnectorProduct[]> {
    const catalog = [
      { title: "Classic Sneakers", price: 3499.0, inventory: 42 },
      { title: "Running Shoes", price: 5999.0, inventory: 18 },
      { title: "Canvas Tote Bag", price: 1299.0, inventory: 130 },
      { title: "Wool Beanie", price: 999.0, inventory: 76 },
      { title: "Leather Wallet", price: 2499.0, inventory: 33 },
      { title: "Sports Socks (3-pack)", price: 799.0, inventory: 210 },
    ];
    return catalog.slice(0, limit).map((p, i) => ({
      externalId: `mock-${i + 1}`,
      title: p.title,
      description: `${p.title} — demo catalog item.`,
      price: p.price,
      currency: "INR",
      inventory: p.inventory,
      imageUrl: null,
    }));
  }

  async getOrders(limit = 5): Promise<ConnectorOrder[]> {
    return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      externalId: `mock-order-${i + 1}`,
      total: 5999.0 + i * 1000,
      currency: "INR",
      createdAt: new Date(Date.now() - i * 86_400_000),
      customerRef: `mock-cust-${i + 1}`,
    }));
  }

  async getCustomers(limit = 5): Promise<ConnectorCustomer[]> {
    return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      externalId: `mock-cust-${i + 1}`,
      name: `Demo Customer ${i + 1}`,
      email: `customer${i + 1}@example.com`,
    }));
  }

  async fetchDiscounts(): Promise<ConnectorDiscount[]> {
    return [{ code: "WELCOME10", discountPct: 10, status: "ACTIVE" }];
  }

  async generateCoupon(input: GenerateCouponInput): Promise<ConnectorCoupon> {
    return {
      code: input.code,
      discountPct: input.discountPct,
      expiresAt: input.expiresAt ?? null,
    };
  }

  async disableCoupon(): Promise<void> {
    // no-op for the mock provider
  }
}
