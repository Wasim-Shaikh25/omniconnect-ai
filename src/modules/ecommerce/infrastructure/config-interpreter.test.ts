import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConfigInterpreter } from "./config-interpreter";
import type { AdapterConfigMapping } from "../domain/adapter-config";

function shopifyConfig(): AdapterConfigMapping {
  return {
    platformName: "Shopify",
    baseUrl: "https://{{shopDomain}}/admin/api/2024-01",
    authPattern: { type: "bearer", tokenField: "accessToken" },
    credentialSchema: {
      fields: [
        { key: "shopDomain", label: "Shop domain", type: "url", required: true },
        { key: "accessToken", label: "Access token", type: "password", required: true },
      ],
    },
    endpoints: {
      getProducts: {
        method: "GET",
        path: "/products.json",
        responseMapping: {
          dataPath: "products",
          fieldMap: {
            externalId: "id",
            title: "title",
            description: "body_html",
            price: "variants.0.price",
            currency: "variants.0.currency",
            inventory: "variants.0.inventory_quantity",
            imageUrl: "image.src",
          },
        },
      },
      getOrders: {
        method: "GET",
        path: "/orders.json",
        responseMapping: {
          dataPath: "orders",
          fieldMap: {
            externalId: "id",
            total: "total_price",
            currency: "currency",
            createdAt: "created_at",
            customerRef: "customer.id",
            customerEmail: "email",
            couponCode: "discount_codes.0.code",
          },
        },
      },
      getCustomers: {
        method: "GET",
        path: "/customers.json",
        responseMapping: {
          dataPath: "customers",
          fieldMap: { externalId: "id", name: "first_name", email: "email" },
        },
      },
      fetchDiscounts: {
        method: "GET",
        path: "/price_rules.json",
        responseMapping: {
          dataPath: "price_rules",
          fieldMap: { code: "title", discountPct: "value", status: "status" },
        },
      },
      createCoupon: {
        method: "POST",
        path: "/price_rules.json",
        body: { price_rule: { title: "{{code}}", value: "{{discountPct}}", value_type: "percentage" } },
        responseMapping: {
          dataPath: "price_rule",
          fieldMap: { code: "title", discountPct: "value", expiresAt: "ends_at" },
        },
      },
      disableCoupon: {
        method: "POST",
        path: "/price_rules/{{code}}/discount_codes.json",
        body: { discount_code: { code: "{{code}}_disabled" } },
        responseMapping: { dataPath: "", fieldMap: {} },
      },
      fetchStoreInfo: {
        method: "GET",
        path: "/shop.json",
        responseMapping: {
          dataPath: "shop",
          fieldMap: { name: "name", domain: "domain", currency: "currency" },
        },
      },
    },
    pagination: { type: "cursor", limitParam: "limit", maxPerPage: 250 },
  };
}

const credentials = {
  shopDomain: "my-shop.myshopify.com",
  accessToken: "shpat_token",
};

describe("ConfigInterpreter", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockJsonResponse(data: unknown) {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => data,
    } as Response);
  }

  it("fetches and maps store info", async () => {
    const interpreter = new ConfigInterpreter(shopifyConfig(), credentials);
    mockJsonResponse({ shop: { name: "My Shop", domain: "my-shop.myshopify.com", currency: "USD" } });

    const info = await interpreter.fetchStoreInfo();
    expect(info).toEqual({
      name: "My Shop",
      domain: "my-shop.myshopify.com",
      currency: "USD",
      provider: "Shopify",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://my-shop.myshopify.com/admin/api/2024-01/shop.json",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer shpat_token" }),
      }),
    );
  });

  it("fetches and maps products", async () => {
    const interpreter = new ConfigInterpreter(shopifyConfig(), credentials);
    mockJsonResponse({
      products: [
        {
          id: 1,
          title: "Hat",
          body_html: "A nice hat",
          variants: [{ price: "19.99", currency: "USD", inventory_quantity: 5 }],
          image: { src: "https://cdn.example/hat.jpg" },
        },
      ],
    });

    const products = await interpreter.getProducts(10);
    expect(products).toEqual([
      {
        externalId: "1",
        title: "Hat",
        description: "A nice hat",
        price: 19.99,
        currency: "USD",
        inventory: 5,
        imageUrl: "https://cdn.example/hat.jpg",
      },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("limit=10"),
      expect.any(Object),
    );
  });

  it("fetches and maps orders", async () => {
    const interpreter = new ConfigInterpreter(shopifyConfig(), credentials);
    mockJsonResponse({
      orders: [
        {
          id: 100,
          total_price: "49.99",
          currency: "USD",
          created_at: "2024-01-15T10:00:00Z",
          customer: { id: 5 },
          email: "buyer@example.com",
          discount_codes: [{ code: "SAVE10" }],
        },
      ],
    });

    const orders = await interpreter.getOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      externalId: "100",
      total: 49.99,
      currency: "USD",
      customerRef: "5",
      customerEmail: "buyer@example.com",
      couponCode: "SAVE10",
    });
    expect(orders[0].createdAt instanceof Date).toBe(true);
  });

  it("fetches and maps customers", async () => {
    const interpreter = new ConfigInterpreter(shopifyConfig(), credentials);
    mockJsonResponse({ customers: [{ id: 5, first_name: "Ada", email: "ada@example.com" }] });

    const customers = await interpreter.getCustomers();
    expect(customers).toEqual([
      { externalId: "5", name: "Ada", email: "ada@example.com" },
    ]);
  });

  it("creates a coupon with interpolated body", async () => {
    const interpreter = new ConfigInterpreter(shopifyConfig(), credentials);
    mockJsonResponse({ price_rule: { title: "WELCOME20", value: "20", ends_at: "2024-12-31T23:59:59Z" } });

    const coupon = await interpreter.generateCoupon({
      code: "WELCOME20",
      discountPct: 20,
      expiresAt: new Date("2024-12-31T23:59:59Z"),
    });
    expect(coupon).toEqual({
      code: "WELCOME20",
      discountPct: 20,
      expiresAt: new Date("2024-12-31T23:59:59Z"),
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://my-shop.myshopify.com/admin/api/2024-01/price_rules.json",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("WELCOME20"),
      }),
    );
  });

  it("disables a coupon with path interpolation", async () => {
    const interpreter = new ConfigInterpreter(shopifyConfig(), credentials);
    mockJsonResponse({});

    await interpreter.disableCoupon("WELCOME20");
    expect(fetch).toHaveBeenCalledWith(
      "https://my-shop.myshopify.com/admin/api/2024-01/price_rules/WELCOME20/discount_codes.json",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("WELCOME20_disabled"),
      }),
    );
  });

  it("throws ConnectorError when the HTTP response is not ok", async () => {
    const interpreter = new ConfigInterpreter(shopifyConfig(), credentials);
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response);

    await expect(interpreter.fetchStoreInfo()).rejects.toThrow(/Connector operation failed/);
  });
});
