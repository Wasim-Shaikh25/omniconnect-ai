import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { prisma } from "@/shared/database";
import { InMemoryEventBus } from "@/shared/events";
import { makeApplyShopifyWebhook } from "./apply-shopify-webhook";
import { PrismaIntegrationRepository } from "../infrastructure/integration.repository";
import { PrismaProductRepository } from "../infrastructure/product.repository";
import { PrismaOrderRepository } from "../infrastructure/order.repository";
import { PrismaCartRepository } from "../infrastructure/cart.repository";
import { PrismaShopifyComplianceRepository } from "../infrastructure/shopify-compliance.repository";
import { PrismaProcessedEventsRepository } from "@/shared/webhooks/processed-events.repository";

const integrations = new PrismaIntegrationRepository();
const products = new PrismaProductRepository();
const orders = new PrismaOrderRepository();
const carts = new PrismaCartRepository();
const processedEvents = new PrismaProcessedEventsRepository();
const compliance = new PrismaShopifyComplianceRepository();
const eventBus = new InMemoryEventBus();

const auditLog = {
  create: () =>
    Promise.resolve({
      id: "audit-1",
      userId: null,
      actorId: null,
      actorEmail: null,
      action: "shopify.webhook",
      resource: "webhook",
      resourceId: null,
      details: null,
      createdAt: new Date(),
    }),
};

const applyShopifyWebhook = makeApplyShopifyWebhook({
  integrations,
  products,
  orders,
  carts,
  processedEvents,
  compliance,
  auditLog,
  eventBus,
});

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
    data: { name: "Webhook Test Org", email: `webhook-${Date.now()}@example.com`, plan: "FREE" },
  });
  const workspace = await prisma.workspace.create({
    data: { userId: org.id, name: "Webhook Workspace" },
  });
  const store = await prisma.project.create({
    data: { workspaceId: workspace.id, name: "Webhook Store", provider: "SHOPIFY", domain: "test.myshopify.com", userId: org.id },
  });
  await prisma.ecommerceConnection.create({
    data: {
      provider: "SHOPIFY",
      baseUrl: "test.myshopify.com",
      accessToken: "encrypted-token",
      refreshToken: "encrypted-refresh",
      config: { shopId: 42, scopes: "read_products" },
      projectId: store.id,
    },
  });
  return { store };
}

describe("applyShopifyWebhook integration", () => {
  it("persists a product on products/create and deduplicates by event id", async () => {
    const { store } = await seedStore();
    const eventId = `products-create-${Date.now()}`;
    const payload = {
      id: 12345,
      title: "Webhook Product",
      body_html: "<p>Description</p>",
      variants: [{ price: "19.99", inventory_quantity: 42 }],
      image: { src: "https://cdn.example.com/image.jpg" },
    };

    const first = await applyShopifyWebhook({
      topic: "products/create",
      shopDomain: "test.myshopify.com",
      eventId,
      payload,
    });
    expect(first.ok).toBe(true);

    const second = await applyShopifyWebhook({
      topic: "products/create",
      shopDomain: "test.myshopify.com",
      eventId,
      payload,
    });
    expect(second.ok).toBe(true);
    expect(second.message).toMatch(/already processed/i);

    const rows = await prisma.product.findMany({ where: { projectId: store.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].externalId).toBe("12345");
    expect(rows[0].title).toBe("Webhook Product");
    expect(rows[0].price?.toNumber()).toBe(19.99);
    expect(rows[0].inventory).toBe(42);
    expect(rows[0].imageUrl).toBe("https://cdn.example.com/image.jpg");
  });
});
