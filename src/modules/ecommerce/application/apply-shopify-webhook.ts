import { logger } from "@/shared/observability";
import type { EventBus } from "@/shared/events";
import type { AuditLogCommands } from "@/modules/users";
import type { ProcessedEventsRepository } from "@/shared/webhooks/processed-events.repository";
import type { IntegrationRepository, ProductRepository, OrderRepository, CartRepository } from "./ports";
import type { ConnectorProduct, ConnectorOrder } from "../domain/connector";
import { OrderSynced } from "../domain/events";
import type { ShopifyComplianceRepository } from "./shopify-compliance";

export interface ShopifyWebhookInput {
  topic: string;
  shopDomain: string;
  eventId: string;
  payload: Record<string, unknown>;
}

export interface ShopifyWebhookResult {
  ok: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export function makeApplyShopifyWebhook(deps: {
  integrations: IntegrationRepository;
  products: ProductRepository;
  orders: OrderRepository;
  carts: CartRepository;
  processedEvents?: ProcessedEventsRepository;
  compliance: ShopifyComplianceRepository;
  auditLog: AuditLogCommands;
  jobScheduler?: { cancelForStore(projectId: string): Promise<void> };
  eventBus?: EventBus;
}) {
  return async function applyShopifyWebhook(input: ShopifyWebhookInput): Promise<ShopifyWebhookResult> {
    const integration = await deps.integrations.findByShopDomain(input.shopDomain);
    if (!integration) {
      logger.warn("shopify.webhook.storeNotFound", { shopDomain: input.shopDomain, topic: input.topic });
      return { ok: false, message: "Store not found for shop domain" };
    }
    const projectId = integration.projectId;
    const topic = input.topic;

    if (deps.processedEvents) {
      const recorded = await deps.processedEvents.record({
        id: input.eventId,
        provider: "shopify",
        type: topic,
      });
      if (!recorded.recorded) {
        logger.info("shopify.webhook.duplicate", { shopDomain: input.shopDomain, eventId: input.eventId, topic });
        return { ok: true, message: "Already processed" };
      }
    }

    try {
      if (topic === "products/create" || topic === "products/update") {
        const product = mapProductPayload(input.payload);
        await deps.products.upsertMany(projectId, [product]);
        logger.info("shopify.webhook.productUpserted", { projectId, externalId: product.externalId, topic });
        return { ok: true };
      }

      if (topic === "products/delete") {
        const externalId = String(input.payload.id ?? "");
        const existing = await deps.products.findByExternalId(projectId, externalId);
        if (existing) {
          await deps.products.delete(existing.id);
        }
        logger.info("shopify.webhook.productDeleted", { projectId, externalId, topic });
        return { ok: true };
      }

      if (topic === "orders/create" || topic === "orders/paid") {
        const order = mapOrderPayload(input.payload);
        await deps.orders.upsertMany(projectId, [order]);
        if (order.cartToken) {
          await deps.carts.markConverted(projectId, order.cartToken);
        }
        if (deps.eventBus) {
          await deps.eventBus.publish(new OrderSynced(projectId, { projectId, order }));
        }
        logger.info("shopify.webhook.orderUpserted", { projectId, externalId: order.externalId, topic });
        return { ok: true };
      }

      if (topic === "checkouts/create" || topic === "checkouts/update") {
        const cart = mapAbandonedCartPayload(input.payload);
        await deps.carts.upsert({
          projectId,
          cartToken: cart.cartToken,
          email: cart.email,
          lineItemTitles: cart.lineItemTitles,
          totalPrice: cart.totalPrice,
          currency: cart.currency,
          recoveredUrl: cart.recoveredUrl,
          lastActivityAt: new Date(),
        });
        logger.info("shopify.webhook.cartUpserted", { projectId, cartToken: cart.cartToken, topic });
        return { ok: true };
      }

      if (topic === "customers/data_request") {
        return handleDataRequest({ input, projectId, compliance: deps.compliance, auditLog: deps.auditLog });
      }

      if (topic === "customers/redact") {
        return handleCustomerRedact({ input, projectId, compliance: deps.compliance, auditLog: deps.auditLog });
      }

      if (topic === "shop/redact") {
        return handleShopRedact({ projectId, compliance: deps.compliance, auditLog: deps.auditLog });
      }

      if (topic === "app/uninstalled") {
        return handleAppUninstalled({
          projectId,
          compliance: deps.compliance,
          auditLog: deps.auditLog,
          jobScheduler: deps.jobScheduler,
        });
      }

      if (isUnhandledComplianceTopic(topic)) {
        return { ok: false, message: `Unhandled compliance topic: ${topic}` };
      }

      logger.info("shopify.webhook.ignored", { projectId, topic });
      return { ok: true, message: "Topic ignored" };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Webhook processing failed";
      logger.error("shopify.webhook.error", { projectId, topic, error: msg });
      return { ok: false, message: msg };
    }
  };
}

async function handleDataRequest(input: {
  input: ShopifyWebhookInput;
  projectId: string;
  compliance: ShopifyComplianceRepository;
  auditLog: AuditLogCommands;
}): Promise<ShopifyWebhookResult> {
  const { customerRef, customerEmail } = extractCustomer(input.input.payload);
  const data = await input.compliance.fetchCustomerData({ projectId: input.projectId, customerRef, customerEmail });

  await input.auditLog.create({
    userId: null,
    action: "shopify.customers.data_request",
    resource: "shopify_webhook",
    resourceId: input.input.eventId,
    details: JSON.stringify({ shopDomain: input.input.shopDomain, customerRef, customerEmail }),
  });

  return { ok: true, data: data as unknown as Record<string, unknown> };
}

async function handleCustomerRedact(input: {
  input: ShopifyWebhookInput;
  projectId: string;
  compliance: ShopifyComplianceRepository;
  auditLog: AuditLogCommands;
}): Promise<ShopifyWebhookResult> {
  const { customerRef, customerEmail } = extractCustomer(input.input.payload);
  const summary = await input.compliance.redactCustomer({ projectId: input.projectId, customerRef, customerEmail });

  await input.auditLog.create({
    userId: null,
    action: "shopify.customers.redact",
    resource: "shopify_webhook",
    resourceId: input.input.eventId,
    details: JSON.stringify({ shopDomain: input.input.shopDomain, customerRef, customerEmail, summary }),
  });

  return { ok: true, data: summary as unknown as Record<string, unknown> };
}

async function handleShopRedact(input: {
  projectId: string;
  compliance: ShopifyComplianceRepository;
  auditLog: AuditLogCommands;
}): Promise<ShopifyWebhookResult> {
  const summary = await input.compliance.redactShop(input.projectId);

  await input.auditLog.create({
    userId: null,
    action: "shopify.shop.redact",
    resource: "shopify_webhook",
    resourceId: input.projectId,
    details: JSON.stringify({ summary }),
  });

  return { ok: true, data: summary as unknown as Record<string, unknown> };
}

async function handleAppUninstalled(input: {
  projectId: string;
  compliance: ShopifyComplianceRepository;
  auditLog: AuditLogCommands;
  jobScheduler?: { cancelForStore(projectId: string): Promise<void> };
}): Promise<ShopifyWebhookResult> {
  await input.compliance.disconnectStore(input.projectId);

  if (input.jobScheduler) {
    await input.jobScheduler.cancelForStore(input.projectId);
  }

  await input.auditLog.create({
    userId: null,
    action: "shopify.app.uninstalled",
    resource: "shopify_webhook",
    resourceId: input.projectId,
    details: JSON.stringify({ projectId: input.projectId }),
  });

  return { ok: true };
}

function extractCustomer(payload: Record<string, unknown>): { customerRef: string | null; customerEmail: string | null } {
  const customer = payload.customer as Record<string, unknown> | undefined;
  const id = customer?.id;
  const customerRef = typeof id === "number" || typeof id === "string" ? String(id) : null;
  const email = customer?.email;
  const customerEmail = typeof email === "string" ? email : null;
  return { customerRef, customerEmail };
}

function mapProductPayload(payload: Record<string, unknown>): ConnectorProduct {
  const variants = Array.isArray(payload.variants) ? (payload.variants as Record<string, unknown>[]) : [];
  const variant = variants[0];
  const images = Array.isArray(payload.images) ? (payload.images as Record<string, unknown>[]) : [];
  const image =
    (payload.image as Record<string, unknown> | undefined)?.src ??
    (images[0]?.src as string | undefined) ??
    null;

  return {
    externalId: String(payload.id ?? ""),
    title: typeof payload.title === "string" ? payload.title : "",
    description: typeof payload.body_html === "string" ? payload.body_html : null,
    price: variant && typeof variant.price === "string" ? Number(variant.price) : null,
    currency: null,
    inventory:
      variant && typeof variant.inventory_quantity === "number" ? variant.inventory_quantity : null,
    imageUrl: typeof image === "string" ? image : null,
  };
}

function mapOrderPayload(payload: Record<string, unknown>): ConnectorOrder {
  const customer = payload.customer as Record<string, unknown> | undefined;
  const discountCodes = Array.isArray(payload.discount_codes)
    ? (payload.discount_codes as Record<string, unknown>[])
    : [];

  return {
    externalId: String(payload.id ?? ""),
    total: typeof payload.total_price === "string" ? Number(payload.total_price) : 0,
    currency: typeof payload.currency === "string" ? payload.currency : null,
    createdAt: typeof payload.created_at === "string" ? new Date(payload.created_at) : new Date(),
    customerRef: customer && typeof customer.id === "number" ? String(customer.id) : null,
    customerEmail: typeof customer?.email === "string" ? customer.email : null,
    couponCode: typeof discountCodes[0]?.code === "string" ? discountCodes[0].code : null,
    cartToken: typeof payload.cart_token === "string" ? payload.cart_token : null,
  };
}

function isUnhandledComplianceTopic(topic: string): boolean {
  const handled = [
    "customers/data_request",
    "customers/redact",
    "shop/redact",
    "app/uninstalled",
  ];
  if (handled.includes(topic)) return false;
  if (topic.startsWith("customers/") || topic.startsWith("shop/") || topic.startsWith("app/")) return true;
  return false;
}

function mapAbandonedCartPayload(payload: Record<string, unknown>) {
  const lineItems = Array.isArray(payload.line_items)
    ? (payload.line_items as Record<string, unknown>[])
    : [];
  return {
    cartToken: String(payload.token ?? payload.id ?? ""),
    email: typeof payload.email === "string" ? payload.email : null,
    lineItemTitles: lineItems
      .map((item) => (typeof item.title === "string" ? item.title : ""))
      .filter(Boolean),
    totalPrice: typeof payload.total_price === "string" ? Number(payload.total_price) : null,
    currency: typeof payload.currency === "string" ? payload.currency : null,
    recoveredUrl: typeof payload.abandoned_checkout_url === "string" ? payload.abandoned_checkout_url : null,
  };
}
