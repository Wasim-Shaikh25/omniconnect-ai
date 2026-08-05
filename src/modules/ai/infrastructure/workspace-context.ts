import type { OrganizationOverview } from "@/modules/workspaces";
import type { EcommerceQueries } from "@/modules/ecommerce";
import type { ConversationQueries } from "@/modules/conversations";
import type { CrmQueries } from "@/modules/crm";
import type { NotificationQueries } from "@/modules/notifications";
import type { WorkspaceContextPort } from "../application/ask-business-brain";

export function makeWorkspaceContext(deps: {
  organizations: {
    getOrganizationOverview(
      organizationId: string,
    ): Promise<OrganizationOverview | null>;
  };
  ecommerce: EcommerceQueries;
  conversations: ConversationQueries;
  crm: CrmQueries;
  notifications: NotificationQueries;
}): WorkspaceContextPort {
  return {
    async getContext(input) {
      const overview = await deps.organizations.getOrganizationOverview(
        input.organizationId,
      );
      if (!overview) {
        return {
          organizationName: "Unknown",
          storeCount: 0,
          productCount: 0,
          conversationCount: 0,
          followerCount: 0,
          couponCount: 0,
          unreadNotificationCount: 0,
          connectedIntegrations: 0,
          storeNames: [],
        };
      }

      const stores = input.storeId
        ? overview.stores.filter((s) => s.id === input.storeId)
        : overview.stores;

      const totals = {
        productCount: 0,
        conversationCount: 0,
        followerCount: 0,
        couponCount: 0,
        connectedIntegrations: 0,
      };

      for (const store of stores) {
        const [productCount, conversationCount, followerCount, couponCount, connection] =
          await Promise.all([
            deps.ecommerce.countProducts(store.id),
            deps.conversations.countConversations(store.id),
            deps.crm.countFollowers(store.id),
            deps.ecommerce.countCoupons(store.id),
            deps.ecommerce.getStoreConnection(store.id),
          ]);
        totals.productCount += productCount;
        totals.conversationCount += conversationCount;
        totals.followerCount += followerCount;
        totals.couponCount += couponCount;
        if (connection.connected) totals.connectedIntegrations += 1;
      }

      const unreadNotificationCount = await deps.notifications.getUnreadCount(
        input.userId,
      );

      return {
        organizationName: overview.name,
        storeCount: stores.length,
        productCount: totals.productCount,
        conversationCount: totals.conversationCount,
        followerCount: totals.followerCount,
        couponCount: totals.couponCount,
        unreadNotificationCount,
        connectedIntegrations: totals.connectedIntegrations,
        storeNames: stores.map((s) => s.name),
      };
    },
  };
}
