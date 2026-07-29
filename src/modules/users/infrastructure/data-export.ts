import { prisma } from "@/shared/database";
import type { DataExportBuilder, UserDataExport } from "../application/data-export";

function redactEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local ? local.slice(0, 2) : ""}***@${domain}`;
}

function redactUser(user: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...user };
  if (typeof redacted.email === "string") {
    redacted.email = redactEmail(redacted.email);
  }
  if (typeof redacted.name === "string") {
    redacted.name = "Redacted";
  }
  return redacted;
}

function omitSensitive(user: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...user };
  delete rest.passwordHash;
  return rest;
}

export const prismaDataExportBuilder: DataExportBuilder = {
  async build(userId: string): Promise<UserDataExport> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { include: { stores: true } } },
    });
    if (!user) throw new Error("User not found");

    const safeUser = omitSensitive(user);
    const organization = user.organization;
    const storeIds = organization?.stores.map((s) => s.id) ?? [];

    const [
      products,
      coupons,
      customers,
      followers,
      conversations,
      notifications,
      supportTickets,
      auditLogs,
      integrations,
      brainMemory,
    ] = await Promise.all([
      prisma.product.findMany({ where: { storeId: { in: storeIds } } }),
      prisma.coupon.findMany({ where: { storeId: { in: storeIds } }, include: { usages: true } }),
      prisma.customer.findMany({ where: { storeId: { in: storeIds } } }),
      prisma.follower.findMany({ where: { storeId: { in: storeIds } } }),
      prisma.conversation.findMany({
        where: { storeId: { in: storeIds } },
        include: { messages: true },
      }),
      prisma.notification.findMany({ where: { userId } }),
      prisma.supportTicket.findMany({
        where: { userId },
        include: { comments: true },
      }),
      prisma.auditLog.findMany({
        where: { OR: [{ actorId: userId }, { organizationId: organization?.id }] },
        take: 1000,
        orderBy: { createdAt: "desc" },
      }),
      prisma.integration.findMany({
        where: { storeId: { in: storeIds } },
        select: {
          id: true,
          type: true,
          provider: true,
          externalId: true,
          scopes: true,
          storeId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.brainConversationMemory.findMany({
        where: { userId },
        take: 500,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const redactedCustomers = customers.map((c) => ({
      ...c,
      username: typeof c.username === "string" ? redactUser({ username: c.username }).username : c.username,
    }));

    return {
      userId,
      exportedAt: new Date().toISOString(),
      user: safeUser,
      organization: organization ? { ...organization, stores: organization.stores.map((s) => ({ ...s })) } : null,
      stores: organization?.stores ?? [],
      products: products.map((p) => ({ ...p })),
      coupons: coupons.map((c) => ({ ...c })),
      customers: redactedCustomers.map((c) => ({ ...c })),
      followers: followers.map((f) => ({ ...f })),
      conversations: conversations.map((c) => ({ ...c })),
      notifications: notifications.map((n) => ({ ...n })),
      supportTickets: supportTickets.map((t) => ({ ...t })),
      auditLogs: auditLogs.map((l) => ({ ...l })),
      integrations: integrations.map((i) => ({ ...i })),
      brainMemory: brainMemory.map((m) => ({ ...m })),
    };
  },
};
