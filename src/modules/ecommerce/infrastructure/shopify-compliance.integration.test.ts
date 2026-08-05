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
    prisma.ecommerceConnection.deleteMany(),
    prisma.project.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

beforeEach(clean);
afterEach(clean);

async function seedStore() {
  const org = await prisma.user.create({
    data: { name: "Compliance Test Org", plan: "FREE" },
  });
  const store = await prisma.project.create({
    data: { name: "Test Store", provider: "SHOPIFY", domain: "test.myshopify.com", userId: org.id },
  });
  await prisma.ecommerceConnection.create({
    data: {
      type: "ECOMMERCE",
      provider: "shopify",
      externalId: "test.myshopify.com",
      accessToken: "encrypted-token",
      refreshToken: "encrypted-refresh",
      scopes: "read_orders",
      projectId: store.id,
      metadata: { shopId: 42 },
    },
  });
  const customer = await prisma.customer.create({
    data: {
      projectId: store.id,
      username: "shopper@example.com",
      igUserId: "ig-1",
      fbUserId: "fb-1",
      interests: ["shoes"],
      tags: ["vip"],
    },
  });
  const order = await prisma.order.create({
    data: {
      projectId: store.id,
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
      projectId: store.id,
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
      projectId: store.id,
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
      projectId: store.id,
      customerRef: "123",
      customerEmail: "shopper@example.com",
    });

    expect(summary.orders).toBeGreaterThanOrEqual(1);
    expect(summary.carts).toBeGreaterThanOrEqual(1);
    expect(summary.customers).toBeGreaterThanOrEqual(1);

    const order = await prisma.order.findFirst({ where: { projectId: store.id } });
    expect(order?.customerRef).toBeNull();
    expect(order?.customerEmail).toBeNull();

    const cart = await prisma.cart.findFirst({ where: { projectId: store.id } });
    expect(cart?.email).toBeNull();

    const customer = await prisma.customer.findFirst({ where: { projectId: store.id } });
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

    const order = await prisma.order.findFirst({ where: { projectId: store.id } });
    expect(order).toBeNull();

    const cart = await prisma.cart.findFirst({ where: { projectId: store.id } });
    expect(cart).toBeNull();

    const integration = await prisma.ecommerceConnection.findFirst({ where: { projectId: store.id } });
    expect(integration).toBeNull();
  });

  it("disconnects store for app/uninstalled", async () => {
    const { store } = await seedStore();

    await repo.disconnectStore(store.id);

    const integration = await prisma.ecommerceConnection.findFirst({ where: { projectId: store.id } });
    expect(integration?.accessToken).toBeNull();
    expect(integration?.refreshToken).toBeNull();
    expect(integration?.externalId).toBeNull();
    expect(integration?.scopes).toBeNull();

    const updated = await prisma.project.findUnique({ where: { id: store.id } });
    expect(updated?.lastProductSyncAt).toBeNull();
  });
});
