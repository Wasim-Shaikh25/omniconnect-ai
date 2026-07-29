import { describe, it, expect, vi } from "vitest";
import { BigCommerceConnector } from "./bigcommerce.connector";

function mockFetch(response: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
  } as Response);
}

describe("BigCommerceConnector", () => {
  it("fetches store info", async () => {
    globalThis.fetch = mockFetch({ data: { store_name: "Demo Store", currency: "USD", domain: "store.test" } });
    const connector = new BigCommerceConnector("abc123", "token");
    const info = await connector.fetchStoreInfo();
    expect(info.name).toBe("Demo Store");
    expect(info.currency).toBe("USD");
    expect(info.domain).toBe("store.test");
  });

  it("maps products", async () => {
    globalThis.fetch = mockFetch({
      data: [
        {
          id: 1,
          name: "T-Shirt",
          description: "A nice shirt",
          price: 29.99,
          inventory_level: 15,
          images: [{ url_standard: "https://cdn.test/shirt.jpg" }],
        },
      ],
    });
    const connector = new BigCommerceConnector("abc123", "token");
    const products = await connector.getProducts();
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      externalId: "1",
      title: "T-Shirt",
      price: 29.99,
      inventory: 15,
      imageUrl: "https://cdn.test/shirt.jpg",
    });
  });

  it("maps orders with coupon code", async () => {
    globalThis.fetch = mockFetch({
      data: [
        {
          id: 200,
          total_inc_tax: 59.99,
          currency_code: "USD",
          date_created: "2026-07-20T10:00:00",
          customer_id: 5,
          coupon_codes: ["WELCOME10"],
        },
      ],
    });
    const connector = new BigCommerceConnector("abc123", "token");
    const orders = await connector.getOrders();
    expect(orders[0]).toMatchObject({
      externalId: "200",
      total: 59.99,
      currency: "USD",
      customerRef: "5",
      couponCode: "WELCOME10",
    });
  });

  it("normalizes store hash from full domain", async () => {
    globalThis.fetch = mockFetch({ data: { store_name: "Demo", currency: "USD", domain: "store.test" } });
    const connector = new BigCommerceConnector("https://store-test.mybigcommerce.com", "token");
    await connector.fetchStoreInfo();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("api.bigcommerce.com/stores/store-test/v3/store"),
      expect.any(Object),
    );
  });
});
