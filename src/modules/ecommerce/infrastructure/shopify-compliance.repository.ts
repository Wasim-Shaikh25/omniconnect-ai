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
    projectId: string;
    customerRef: string | null;
    customerEmail: string | null;
  }): Promise<CustomerDataPayload> {
    const where = this.customerWhere(input.projectId, input.customerRef, input.customerEmail);

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
        where: { projectId: input.projectId, ...(input.customerEmail ? { email: input.customerEmail } : {}) },
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
    projectId: string;
    customerRef: string | null;
    customerEmail: string | null;
  }): Promise<RedactionSummary> {
    const { projectId, customerRef, customerEmail } = input;
    const orderWhere = this.customerWhere(projectId, customerRef, customerEmail);

    const [orders, carts, customers, followers] = await Promise.all([
      prisma.order.updateMany({
        where: orderWhere,
        data: { customerRef: null, customerEmail: null },
      }),
      prisma.cart.updateMany({
        where: { projectId, ...(customerEmail ? { email: customerEmail } : {}) },
        data: { email: null },
      }),
      prisma.customer.updateMany({
        where: { projectId, ...(customerEmail ? { username: customerEmail } : {}) },
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
        where: { projectId, ...(customerEmail ? { username: customerEmail } : {}) },
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

  async redactShop(projectId: string): Promise<ShopRedactionSummary> {
    const now = new Date();

    const [products, orders, carts, coupons, customers, followers, messages, conversations, integrations] =
      await prisma.$transaction([
        prisma.product.updateMany({
          where: { projectId, deletedAt: null },
          data: { deletedAt: now, title: "[REDACTED]", description: null, imageUrl: null },
        }),
        prisma.order.deleteMany({ where: { projectId } }),
        prisma.cart.deleteMany({ where: { projectId } }),
        prisma.coupon.updateMany({
          where: { projectId, deletedAt: null },
          data: { deletedAt: now, code: "[REDACTED]" },
        }),
        prisma.customer.updateMany({
          where: { projectId },
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
        prisma.follower.deleteMany({ where: { projectId } }),
        prisma.message.deleteMany({ where: { conversation: { projectId } } }),
        prisma.conversation.deleteMany({ where: { projectId } }),
        prisma.ecommerceConnection.deleteMany({
          where: { projectId, type: "ECOMMERCE" },
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

  async disconnectStore(projectId: string): Promise<void> {
    await prisma.ecommerceConnection.updateMany({
      where: { projectId, type: "ECOMMERCE" },
      data: {
        accessToken: null,
        refreshToken: null,
        externalId: null,
        scopes: null,
        metadata: Prisma.DbNull,
      },
    });
    await prisma.project.updateMany({
      where: { id: projectId },
      data: { lastProductSyncAt: null },
    });
  }

  private customerWhere(
    projectId: string,
    customerRef: string | null,
    customerEmail: string | null,
  ): { projectId: string; OR?: Array<{ customerRef?: string | null; customerEmail?: string | null }> } {
    const or: Array<{ customerRef?: string | null; customerEmail?: string | null }> = [];
    if (customerRef) {
      or.push({ customerRef });
    }
    if (customerEmail) {
      or.push({ customerEmail });
    }
    return or.length > 0 ? { projectId, OR: or } : { projectId };
  }
}
