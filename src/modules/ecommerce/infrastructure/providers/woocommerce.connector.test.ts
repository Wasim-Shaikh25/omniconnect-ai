import { describe, it, expect, vi } from "vitest";
import { WooCommerceConnector } from "./woocommerce.connector";

function mockFetch(response: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
  } as Response);
}

describe("WooCommerceConnector", () => {
  it("fetches store info", async () => {
    globalThis.fetch = mockFetch({ name: "Demo Store", currency: "USD" });
    const connector = new WooCommerceConnector("https://store.test", "key", "secret");
    const info = await connector.fetchStoreInfo();
    expect(info.name).toBe("Demo Store");
    expect(info.currency).toBe("USD");
    expect(info.provider).toBe("WOOCOMMERCE");
  });

  it("maps products", async () => {
    globalThis.fetch = mockFetch([
      {
        id: 1,
        name: "T-Shirt",
        description: "A nice shirt",
        price: "29.99",
        regular_price: "29.99",
        stock_quantity: 15,
        images: [{ src: "https://cdn.test/shirt.jpg" }],
      },
    ]);
    const connector = new WooCommerceConnector("https://store.test", "key", "secret");
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
    globalThis.fetch = mockFetch([
      {
        id: 100,
        total: "59.99",
        currency: "USD",
        date_created: "2026-07-20T10:00:00",
        coupon_lines: [{ code: "WELCOME10" }],
        billing: { email: "cust@example.com" },
        customer_id: 5,
      },
    ]);
    const connector = new WooCommerceConnector("https://store.test", "key", "secret");
    const orders = await connector.getOrders();
    expect(orders[0]).toMatchObject({
      externalId: "100",
      total: 59.99,
      currency: "USD",
      customerEmail: "cust@example.com",
      couponCode: "WELCOME10",
    });
  });

  it("throws when request fails", async () => {
    globalThis.fetch = mockFetch({ message: "Unauthorized" }, 401);
    const connector = new WooCommerceConnector("https://store.test", "key", "secret");
    await expect(connector.getProducts()).rejects.toThrow("WooCommerce request failed");
  });
});
