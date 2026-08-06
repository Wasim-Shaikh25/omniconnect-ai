import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getConnector } from "./provider-registry";

describe("getConnector", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves Shopify to a ConfigInterpreter using the built-in mapping", async () => {
    const connector = getConnector("SHOPIFY", {
      shopDomain: "my-shop.myshopify.com",
      accessToken: "shpat_token",
    });

    expect(connector.provider).toBe("SHOPIFY");

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        price_rule: { id: 123, title: "WELCOME20", value: "20" },
      }),
    } as Response);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        discount_code: { code: "WELCOME20" },
      }),
    } as Response);

    const coupon = await connector.generateCoupon({
      code: "WELCOME20",
      discountPct: 20,
    });

    expect(coupon).toEqual({
      code: "WELCOME20",
      discountPct: 20,
      expiresAt: null,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(
      "https://my-shop.myshopify.com/admin/api/2024-01/price_rules.json",
    );
    expect(vi.mocked(fetch).mock.calls[1]![0]).toBe(
      "https://my-shop.myshopify.com/admin/api/2024-01/price_rules/123/discount_codes.json",
    );
  });

  it("disables a Shopify coupon by looking up the price rule by title", async () => {
    const connector = getConnector("SHOPIFY", {
      shopDomain: "my-shop.myshopify.com",
      accessToken: "shpat_token",
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        price_rules: [
          { id: 456, title: "OTHER" },
          { id: 789, title: "SAVE10" },
        ],
      }),
    } as Response);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    await connector.disableCoupon("SAVE10");

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls[1]![0]).toBe(
      "https://my-shop.myshopify.com/admin/api/2024-01/price_rules/789.json",
    );
    expect(vi.mocked(fetch).mock.calls[1]![1]).toMatchObject({ method: "DELETE" });
  });

  it("falls back to the Mock connector for non-Shopify providers", () => {
    const connector = getConnector("WIX", {
      shopDomain: "example.com",
      accessToken: "token",
    });
    expect(connector.provider).toBe("MOCK");
  });

  it("throws for invalid Shopify domains", () => {
    expect(() =>
      getConnector("SHOPIFY", {
        shopDomain: "example.com",
        accessToken: "token",
      }),
    ).toThrow("Invalid Shopify shop domain");
  });
});
