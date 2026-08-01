import { describe, expect, it, vi } from "vitest";
import { makeApplyShopifyWebhook } from "./apply-shopify-webhook";
import type {
  CartRepository,
  IntegrationRepository,
  OrderRepository,
  ProductRepository,
} from "./ports";
import type { ShopifyComplianceRepository } from "./shopify-compliance";
import type { AuditLogCommands } from "@/modules/users";

function makeDeps() {
  const integrations: IntegrationRepository = {
    findByShopDomain: vi.fn().mockResolvedValue({
      id: "int-1",
      storeId: "store-1",
      provider: "shopify",
      shopDomain: "test.myshopify.com",
      scopes: null,
      connectedAt: new Date(),
      metadata: null,
    }),
    upsertEcommerce: vi.fn(),
    findEcommerceByStore: vi.fn(),
    findCredentialsByStore: vi.fn(),
  };
  const products: ProductRepository = {
    upsertMany: vi.fn().mockResolvedValue(1),
    sync: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findByExternalId: vi.fn(),
    listByStore: vi.fn(),
    countByStore: vi.fn(),
    delete: vi.fn(),
    markDeletedNotInBatch: vi.fn(),
  };
  const orders: OrderRepository = {
    sync: vi.fn(),
    upsertMany: vi.fn().mockResolvedValue(1),
    listByStore: vi.fn(),
    countByStore: vi.fn(),
    findByExternalId: vi.fn(),
  };
  const carts: CartRepository = {
    upsert: vi.fn().mockResolvedValue({ id: "cart-1", storeId: "store-1", cartToken: "abc123" } as never),
    findByStoreAndToken: vi.fn(),
    markConverted: vi.fn().mockResolvedValue(undefined),
    markNotified: vi.fn().mockResolvedValue(true),
    findAbandoned: vi.fn(),
  };
  const compliance: ShopifyComplianceRepository = {
    fetchCustomerData: vi.fn().mockResolvedValue({
      customer: { id: "123", email: "shopper@example.com" },
      orders: [],
      carts: [],
    }),
    redactCustomer: vi.fn().mockResolvedValue({
      orders: 1,
      carts: 0,
      customers: 0,
      followers: 0,
      conversations: 0,
      messages: 0,
    }),
    redactShop: vi.fn().mockResolvedValue({
      products: 0,
      orders: 0,
      carts: 0,
      coupons: 0,
      customers: 0,
      followers: 0,
      conversations: 0,
      messages: 0,
      integrations: 1,
    }),
    disconnectStore: vi.fn().mockResolvedValue(undefined),
  };
  const auditLog: AuditLogCommands = {
    create: vi.fn().mockResolvedValue({
      id: "log-1",
      organizationId: null,
      actorId: null,
      actorEmail: null,
      action: "test",
      resource: "test",
      resourceId: null,
      details: null,
      createdAt: new Date(),
    }),
  };
  return { integrations, products, orders, carts, compliance, auditLog };
}

function checkoutPayload(token = "abc123") {
  return {
    token,
    email: "shopper@example.com",
    line_items: [{ title: "T-Shirt", quantity: 1, price: "29.99" }],
    total_price: "29.99",
    currency: "USD",
    abandoned_checkout_url: "https://test.myshopify.com/checkouts/abc123",
  };
}

function orderPayload(cartToken = "abc123") {
  return {
    id: 1001,
    total_price: "29.99",
    currency: "USD",
    created_at: "2026-01-01T00:00:00Z",
    customer: { id: 1, email: "shopper@example.com" },
    discount_codes: [],
    cart_token: cartToken,
  };
}

describe("applyShopifyWebhook", () => {
  it("upserts a cart on checkouts/create without publishing an event", async () => {
    const deps = makeDeps();
    const apply = makeApplyShopifyWebhook(deps);

    const result = await apply({
      topic: "checkouts/create",
      shopDomain: "test.myshopify.com",
      eventId: "evt-1",
      payload: checkoutPayload(),
    });

    expect(result.ok).toBe(true);
    expect(deps.carts.upsert).toHaveBeenCalledWith(expect.objectContaining({
      storeId: "store-1",
      cartToken: "abc123",
      email: "shopper@example.com",
      totalPrice: 29.99,
      currency: "USD",
    }));
  });

  it("marks a cart converted on orders/create", async () => {
    const deps = makeDeps();
    const apply = makeApplyShopifyWebhook(deps);

    const result = await apply({
      topic: "orders/create",
      shopDomain: "test.myshopify.com",
      eventId: "evt-2",
      payload: orderPayload(),
    });

    expect(result.ok).toBe(true);
    expect(deps.orders.upsertMany).toHaveBeenCalledWith("store-1", expect.any(Array));
    expect(deps.carts.markConverted).toHaveBeenCalledWith("store-1", "abc123");
  });

  it("idempotently updates a cart on repeated checkouts/update without publishing events (T14)", async () => {
    const deps = makeDeps();
    const apply = makeApplyShopifyWebhook(deps);

    for (let i = 0; i < 10; i++) {
      const result = await apply({
        topic: "checkouts/update",
        shopDomain: "test.myshopify.com",
        eventId: `evt-update-${i}`,
        payload: checkoutPayload(),
      });
      expect(result.ok).toBe(true);
    }

    expect(deps.carts.upsert).toHaveBeenCalledTimes(10);
    expect(deps.carts.upsert).toHaveBeenLastCalledWith(expect.objectContaining({ cartToken: "abc123" }));
  });

  it("produces a data payload for customers/data_request and logs an audit record", async () => {
    const deps = makeDeps();
    const apply = makeApplyShopifyWebhook(deps);

    const result = await apply({
      topic: "customers/data_request",
      shopDomain: "test.myshopify.com",
      eventId: "evt-data-1",
      payload: { customer: { id: 123, email: "shopper@example.com" } },
    });

    expect(result.ok).toBe(true);
    expect(result.data).toEqual(expect.objectContaining({ customer: { id: "123", email: "shopper@example.com" } }));
    expect(deps.compliance.fetchCustomerData).toHaveBeenCalledWith({ storeId: "store-1", customerRef: "123", customerEmail: "shopper@example.com" });
    expect(deps.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: "shopify.customers.data_request" }));
  });

  it("redacts customer PII for customers/redact and logs an audit record", async () => {
    const deps = makeDeps();
    const apply = makeApplyShopifyWebhook(deps);

    const result = await apply({
      topic: "customers/redact",
      shopDomain: "test.myshopify.com",
      eventId: "evt-redact-1",
      payload: { customer: { id: 123, email: "shopper@example.com" } },
    });

    expect(result.ok).toBe(true);
    expect(deps.compliance.redactCustomer).toHaveBeenCalledWith({ storeId: "store-1", customerRef: "123", customerEmail: "shopper@example.com" });
    expect(deps.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: "shopify.customers.redact" }));
  });

  it("erases shop data and tokens for shop/redact and logs an audit record", async () => {
    const deps = makeDeps();
    const apply = makeApplyShopifyWebhook(deps);

    const result = await apply({
      topic: "shop/redact",
      shopDomain: "test.myshopify.com",
      eventId: "evt-shop-redact-1",
      payload: { shop_id: 42 },
    });

    expect(result.ok).toBe(true);
    expect(deps.compliance.redactShop).toHaveBeenCalledWith("store-1");
    expect(deps.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: "shopify.shop.redact" }));
  });

  it("disconnects the integration and cancels scheduled jobs for app/uninstalled", async () => {
    const deps = makeDeps();
    const scheduler = { cancelForStore: vi.fn().mockResolvedValue(undefined) };
    const apply = makeApplyShopifyWebhook({ ...deps, jobScheduler: scheduler });

    const result = await apply({
      topic: "app/uninstalled",
      shopDomain: "test.myshopify.com",
      eventId: "evt-uninstall-1",
      payload: { shop_id: 42 },
    });

    expect(result.ok).toBe(true);
    expect(deps.compliance.disconnectStore).toHaveBeenCalledWith("store-1");
    expect(scheduler.cancelForStore).toHaveBeenCalledWith("store-1");
    expect(deps.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: "shopify.app.uninstalled" }));
  });

  it("does not return { ok: true } for an unhandled compliance topic", async () => {
    const deps = makeDeps();
    const apply = makeApplyShopifyWebhook(deps);

    const result = await apply({
      topic: "customers/unknown",
      shopDomain: "test.myshopify.com",
      eventId: "evt-unknown-1",
      payload: {},
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Unhandled compliance topic: customers/unknown");
  });
});
