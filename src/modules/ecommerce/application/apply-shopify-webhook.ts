import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import type { ProcessedEventsRepository } from "@/shared/webhooks/processed-events.repository";
import type { IntegrationRepository, ProductRepository, OrderRepository } from "./ports";
import type { ConnectorProduct, ConnectorOrder } from "../domain/connector";
import { AbandonedCartDetected } from "../domain/events";

export interface ShopifyWebhookInput {
  topic: string;
  shopDomain: string;
  eventId: string;
  payload: Record<string, unknown>;
}

export interface ShopifyWebhookResult {
  ok: boolean;
  message?: string;
}

export function makeApplyShopifyWebhook(deps: {
  integrations: IntegrationRepository;
  products: ProductRepository;
  orders: OrderRepository;
  processedEvents?: ProcessedEventsRepository;
}) {
  return async function applyShopifyWebhook(input: ShopifyWebhookInput): Promise<ShopifyWebhookResult> {
    const integration = await deps.integrations.findByShopDomain(input.shopDomain);
    if (!integration) {
      logger.warn("shopify.webhook.storeNotFound", { shopDomain: input.shopDomain, topic: input.topic });
      return { ok: false, message: "Store not found for shop domain" };
    }
    const storeId = integration.storeId;
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
        await deps.products.upsertMany(storeId, [product]);
        logger.info("shopify.webhook.productUpserted", { storeId, externalId: product.externalId, topic });
        return { ok: true };
      }

      if (topic === "products/delete") {
        const externalId = String(input.payload.id ?? "");
        const existing = await deps.products.findByExternalId(storeId, externalId);
        if (existing) {
          await deps.products.delete(existing.id);
        }
        logger.info("shopify.webhook.productDeleted", { storeId, externalId, topic });
        return { ok: true };
      }

      if (topic === "orders/create" || topic === "orders/paid") {
        const order = mapOrderPayload(input.payload);
        await deps.orders.upsertMany(storeId, [order]);
        logger.info("shopify.webhook.orderUpserted", { storeId, externalId: order.externalId, topic });
        return { ok: true };
      }

      if (topic === "checkouts/create" || topic === "checkouts/update") {
        const cart = mapAbandonedCartPayload(input.payload);
        await eventBus.publish(
          new AbandonedCartDetected(storeId, {
            cartToken: cart.cartToken,
            email: cart.email,
            lineItemTitles: cart.lineItemTitles,
            totalPrice: cart.totalPrice,
            currency: cart.currency,
            recoveredUrl: cart.recoveredUrl,
            detectedAt: new Date(),
          }),
        );
        logger.info("shopify.webhook.abandonedCartDetected", { storeId, cartToken: cart.cartToken, topic });
        return { ok: true };
      }

      logger.info("shopify.webhook.ignored", { storeId, topic });
      return { ok: true, message: "Topic ignored" };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Webhook processing failed";
      logger.error("shopify.webhook.error", { storeId, topic, error: msg });
      return { ok: false, message: msg };
    }
  };
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
  };
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
