import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { prisma } from "@/shared/database";
import { PrismaShopifyComplianceRepository } from "./shopify-compliance.repository";

const repo = new PrismaShopifyComplianceRepository();

async function clean() {
  await prisma.$transaction([
    prisma.processedWebhookEvent.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.follower.deleteMany(),
    prisma.couponUsage.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.product.deleteMany(),
    prisma.integration.deleteMany(),
    prisma.store.deleteMany(),
    prisma.organization.deleteMany(),
  ]);
}

beforeEach(clean);
afterEach(clean);

async function seedStore() {
  const org = await prisma.organization.create({
    data: { name: "Compliance Test Org", plan: "FREE" },
  });
  const store = await prisma.store.create({
    data: { name: "Test Store", provider: "SHOPIFY", domain: "test.myshopify.com", organizationId: org.id },
  });
  await prisma.integration.create({
    data: {
      type: "ECOMMERCE",
      provider: "shopify",
      externalId: "test.myshopify.com",
      accessToken: "encrypted-token",
      refreshToken: "encrypted-refresh",
      scopes: "read_orders",
      storeId: store.id,
      metadata: { shopId: 42 },
    },
  });
  const customer = await prisma.customer.create({
    data: {
      storeId: store.id,
      username: "shopper@example.com",
      igUserId: "ig-1",
      fbUserId: "fb-1",
      interests: ["shoes"],
      tags: ["vip"],
    },
  });
  const order = await prisma.order.create({
    data: {
      storeId: store.id,
      externalId: "order-1",
      total: 29.99,
      currency: "USD",
      orderDate: new Date("2026-01-01T00:00:00Z"),
      customerRef: "123",
      customerEmail: "shopper@example.com",
    },
  });
  const cart = await prisma.cart.create({
    data: {
      storeId: store.id,
      cartToken: "abc123",
      email: "shopper@example.com",
      lineItemTitles: ["T-Shirt"],
      totalPrice: 29.99,
      currency: "USD",
      lastActivityAt: new Date(),
    },
  });
  return { org, store, customer, order, cart };
}

describe("PrismaShopifyComplianceRepository", () => {
  it("fetches customer data for data_request", async () => {
    const { store, order, cart } = await seedStore();

    const data = await repo.fetchCustomerData({
      storeId: store.id,
      customerRef: "123",
      customerEmail: "shopper@example.com",
    });

    expect(data.customer).toEqual({ id: "123", email: "shopper@example.com" });
    expect(data.orders.map((o) => o.id)).toContain(order.id);
    expect(data.carts.map((c) => c.id)).toContain(cart.id);
  });

  it("redacts customer PII for customers/redact", async () => {
    const { store } = await seedStore();

    const summary = await repo.redactCustomer({
      storeId: store.id,
      customerRef: "123",
      customerEmail: "shopper@example.com",
    });

    expect(summary.orders).toBeGreaterThanOrEqual(1);
    expect(summary.carts).toBeGreaterThanOrEqual(1);
    expect(summary.customers).toBeGreaterThanOrEqual(1);

    const order = await prisma.order.findFirst({ where: { storeId: store.id } });
    expect(order?.customerRef).toBeNull();
    expect(order?.customerEmail).toBeNull();

    const cart = await prisma.cart.findFirst({ where: { storeId: store.id } });
    expect(cart?.email).toBeNull();

    const customer = await prisma.customer.findFirst({ where: { storeId: store.id } });
    expect(customer?.username).toBeNull();
    expect(customer?.igUserId).toBeNull();
    expect(customer?.fbUserId).toBeNull();
    expect(customer?.interests).toEqual([]);
    expect(customer?.tags).toEqual([]);
  });

  it("erases shop data and tokens for shop/redact", async () => {
    const { store } = await seedStore();

    const summary = await repo.redactShop(store.id);

    expect(summary.orders).toBeGreaterThanOrEqual(1);
    expect(summary.carts).toBeGreaterThanOrEqual(1);
    expect(summary.integrations).toBe(1);

    const order = await prisma.order.findFirst({ where: { storeId: store.id } });
    expect(order).toBeNull();

    const cart = await prisma.cart.findFirst({ where: { storeId: store.id } });
    expect(cart).toBeNull();

    const integration = await prisma.integration.findFirst({ where: { storeId: store.id } });
    expect(integration).toBeNull();
  });

  it("disconnects store for app/uninstalled", async () => {
    const { store } = await seedStore();

    await repo.disconnectStore(store.id);

    const integration = await prisma.integration.findFirst({ where: { storeId: store.id } });
    expect(integration?.accessToken).toBeNull();
    expect(integration?.refreshToken).toBeNull();
    expect(integration?.externalId).toBeNull();
    expect(integration?.scopes).toBeNull();

    const updated = await prisma.store.findUnique({ where: { id: store.id } });
    expect(updated?.lastProductSyncAt).toBeNull();
  });
});
