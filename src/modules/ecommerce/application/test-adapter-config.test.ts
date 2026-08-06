import { describe, it, expect, vi } from "vitest";
import { makeTestAdapterConfig } from "./test-adapter-config";
import type { AdapterConfigMapping } from "../domain/adapter-config";
import type { EcommerceConnector, StoreInfo, ConnectorProduct } from "../domain/connector";

const mockConfig: AdapterConfigMapping = {
  platformName: "Mock",
  baseUrl: "https://example.com",
  authPattern: { type: "bearer" },
  credentialSchema: { fields: [] },
  endpoints: {
    getProducts: {
      method: "GET",
      path: "/products",
      responseMapping: { dataPath: "products", fieldMap: {} },
    },
    getOrders: {
      method: "GET",
      path: "/orders",
      responseMapping: { dataPath: "orders", fieldMap: {} },
    },
    getCustomers: {
      method: "GET",
      path: "/customers",
      responseMapping: { dataPath: "customers", fieldMap: {} },
    },
    fetchDiscounts: {
      method: "GET",
      path: "/discounts",
      responseMapping: { dataPath: "discounts", fieldMap: {} },
    },
    createCoupon: {
      method: "POST",
      path: "/coupons",
      body: {},
      responseMapping: { dataPath: "coupon", fieldMap: {} },
    },
    disableCoupon: {
      method: "POST",
      path: "/coupons/{{code}}/disable",
      body: {},
      responseMapping: { dataPath: "", fieldMap: {} },
    },
    fetchStoreInfo: {
      method: "GET",
      path: "/shop",
      responseMapping: { dataPath: "shop", fieldMap: {} },
    },
  },
};

describe("makeTestAdapterConfig", () => {
  it("returns valid result when fetchStoreInfo and getProducts succeed", async () => {
    const connector: EcommerceConnector = {
      provider: "Mock",
      fetchStoreInfo: vi.fn(async (): Promise<StoreInfo> => ({ name: "Mock Store", domain: null, currency: "USD", provider: "Mock" })),
      getProducts: vi.fn(async (): Promise<ConnectorProduct[]> => []),
      getOrders: vi.fn(),
      getCustomers: vi.fn(),
      fetchDiscounts: vi.fn(),
      generateCoupon: vi.fn(),
      disableCoupon: vi.fn(),
    };

    const testAdapterConfig = makeTestAdapterConfig({
      buildConnector: () => connector,
    });

    const result = await testAdapterConfig({
      projectId: "project-1",
      config: mockConfig,
      credentials: { accessToken: "token" },
    });

    expect(result).toEqual({ valid: true, storeName: "Mock Store", productCount: 0 });
  });

  it("returns failure result when the connector throws", async () => {
    const connector: EcommerceConnector = {
      provider: "Mock",
      fetchStoreInfo: vi.fn(async () => { throw new Error("Connection refused"); }),
      getProducts: vi.fn(),
      getOrders: vi.fn(),
      getCustomers: vi.fn(),
      fetchDiscounts: vi.fn(),
      generateCoupon: vi.fn(),
      disableCoupon: vi.fn(),
    };

    const testAdapterConfig = makeTestAdapterConfig({
      buildConnector: () => connector,
    });

    const result = await testAdapterConfig({
      projectId: "project-1",
      config: mockConfig,
      credentials: { accessToken: "token" },
    });

    expect(result).toEqual({ valid: false, error: "Connection refused" });
  });
});
