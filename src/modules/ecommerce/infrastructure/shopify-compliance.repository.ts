import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import type {
  CustomerDataPayload,
  RedactionSummary,
  ShopRedactionSummary,
  ShopifyComplianceRepository,
} from "../application/shopify-compliance";

export class PrismaShopifyComplianceRepository implements ShopifyComplianceRepository {
  async fetchCustomerData(input: {
    storeId: string;
    customerRef: string | null;
    customerEmail: string | null;
  }): Promise<CustomerDataPayload> {
    const where = this.customerWhere(input.storeId, input.customerRef, input.customerEmail);

    const [orders, carts] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { orderDate: "desc" },
        take: 1000,
        select: {
          id: true,
          externalId: true,
          total: true,
          currency: true,
          orderDate: true,
          couponCode: true,
        },
      }),
      prisma.cart.findMany({
        where: { storeId: input.storeId, ...(input.customerEmail ? { email: input.customerEmail } : {}) },
        orderBy: { createdAt: "desc" },
        take: 1000,
        select: {
          id: true,
          cartToken: true,
          totalPrice: true,
          currency: true,
          lineItemTitles: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      customer: {
        id: input.customerRef ?? undefined,
        email: input.customerEmail ?? undefined,
      },
      orders: orders.map((o) => ({
        id: o.id,
        externalId: o.externalId,
        total: o.total ? Number(o.total.toString()) : null,
        currency: o.currency,
        orderDate: o.orderDate,
        couponCode: o.couponCode,
      })),
      carts: carts.map((c) => ({
        id: c.id,
        cartToken: c.cartToken,
        totalPrice: c.totalPrice ? Number(c.totalPrice.toString()) : null,
        currency: c.currency,
        lineItemTitles: c.lineItemTitles,
        createdAt: c.createdAt,
      })),
    };
  }

  async redactCustomer(input: {
    storeId: string;
    customerRef: string | null;
    customerEmail: string | null;
  }): Promise<RedactionSummary> {
    const { storeId, customerRef, customerEmail } = input;
    const orderWhere = this.customerWhere(storeId, customerRef, customerEmail);

    const [orders, carts, customers, followers] = await Promise.all([
      prisma.order.updateMany({
        where: orderWhere,
        data: { customerRef: null, customerEmail: null },
      }),
      prisma.cart.updateMany({
        where: { storeId, ...(customerEmail ? { email: customerEmail } : {}) },
        data: { email: null },
      }),
      prisma.customer.updateMany({
        where: { storeId, ...(customerEmail ? { username: customerEmail } : {}) },
        data: {
          igUserId: null,
          fbUserId: null,
          username: null,
          interests: [],
          tags: [],
          lastActivityAt: null,
          consentUpdatedAt: null,
        },
      }),
      prisma.follower.updateMany({
        where: { storeId, ...(customerEmail ? { username: customerEmail } : {}) },
        data: { username: null, welcomeMessageText: null, couponId: null },
      }),
    ]);

    return {
      orders: orders.count,
      carts: carts.count,
      customers: customers.count,
      followers: followers.count,
      conversations: 0,
      messages: 0,
    };
  }

  async redactShop(storeId: string): Promise<ShopRedactionSummary> {
    const now = new Date();

    const [products, orders, carts, coupons, customers, followers, messages, conversations, integrations] =
      await prisma.$transaction([
        prisma.product.updateMany({
          where: { storeId, deletedAt: null },
          data: { deletedAt: now, title: "[REDACTED]", description: null, imageUrl: null },
        }),
        prisma.order.deleteMany({ where: { storeId } }),
        prisma.cart.deleteMany({ where: { storeId } }),
        prisma.coupon.updateMany({
          where: { storeId, deletedAt: null },
          data: { deletedAt: now, code: "[REDACTED]" },
        }),
        prisma.customer.updateMany({
          where: { storeId },
          data: {
            igUserId: null,
            fbUserId: null,
            username: null,
            interests: [],
            tags: [],
            lastActivityAt: null,
            consentUpdatedAt: null,
          },
        }),
        prisma.follower.deleteMany({ where: { storeId } }),
        prisma.message.deleteMany({ where: { conversation: { storeId } } }),
        prisma.conversation.deleteMany({ where: { storeId } }),
        prisma.integration.deleteMany({
          where: { storeId, type: "ECOMMERCE" },
        }),
      ]);

    return {
      products: products.count,
      orders: orders.count,
      carts: carts.count,
      coupons: coupons.count,
      customers: customers.count,
      followers: followers.count,
      conversations: conversations.count,
      messages: messages.count,
      integrations: integrations.count,
    };
  }

  async disconnectStore(storeId: string): Promise<void> {
    await prisma.integration.updateMany({
      where: { storeId, type: "ECOMMERCE" },
      data: {
        accessToken: null,
        refreshToken: null,
        externalId: null,
        scopes: null,
        metadata: Prisma.DbNull,
      },
    });
    await prisma.store.updateMany({
      where: { id: storeId },
      data: { lastProductSyncAt: null },
    });
  }

  private customerWhere(
    storeId: string,
    customerRef: string | null,
    customerEmail: string | null,
  ): { storeId: string; OR?: Array<{ customerRef?: string | null; customerEmail?: string | null }> } {
    const or: Array<{ customerRef?: string | null; customerEmail?: string | null }> = [];
    if (customerRef) {
      or.push({ customerRef });
    }
    if (customerEmail) {
      or.push({ customerEmail });
    }
    return or.length > 0 ? { storeId, OR: or } : { storeId };
  }
}
