import type { StoreRecord } from "@/modules/organizations";
import type { EcommerceQueries } from "@/modules/ecommerce";
import type { ConversationQueries } from "@/modules/conversations";
import type { CrmQueries } from "@/modules/crm";
import type { NotificationQueries } from "@/modules/notifications";
import type { TrackedAccountRepository, TrackedAccountRecord } from "./ports";

export interface WorkspaceKpiSnapshot {
  organizationId: string;
  organizationName: string;
  storeCount: number;
  productCount: number;
  conversationCount: number;
  followerCount: number;
  couponCount: number;
  unreadNotificationCount: number;
  connectedIntegrations: number;
  stores: StoreRecord[];
}

export interface OrganizationOverviewPort {
  getOrganizationOverview(
    organizationId: string,
  ): Promise<{ id: string; name: string; stores: StoreRecord[] } | null>;
}

export function makeAnalyticsQueries(deps: {
  organizations: OrganizationOverviewPort;
  ecommerce: EcommerceQueries;
  conversations: ConversationQueries;
  crm: CrmQueries;
  notifications: NotificationQueries;
  trackedAccounts: TrackedAccountRepository;
}) {
  return {
    async getWorkspaceKpis(
      organizationId: string,
      userId: string,
    ): Promise<WorkspaceKpiSnapshot | null> {
      const overview = await deps.organizations.getOrganizationOverview(
        organizationId,
      );
      if (!overview) return null;

      const stores = overview.stores;
      const perStore = await Promise.all(
        stores.map(async (store) => {
          const [productCount, conversationCount, followerCount, couponCount, connection] =
            await Promise.all([
              deps.ecommerce.countProducts(store.id),
              deps.conversations.countConversations(store.id),
              deps.crm.countFollowers(store.id),
              deps.ecommerce.countCoupons(store.id),
              deps.ecommerce.getStoreConnection(store.id),
            ]);
          return {
            productCount,
            conversationCount,
            followerCount,
            couponCount,
            connected: connection.connected,
          };
        }),
      );

      const unreadNotificationCount = await deps.notifications.getUnreadCount(
        userId,
      );

      return {
        organizationId: overview.id,
        organizationName: overview.name,
        storeCount: stores.length,
        productCount: perStore.reduce(
          (sum, s) => sum + s.productCount,
          0,
        ),
        conversationCount: perStore.reduce(
          (sum, s) => sum + s.conversationCount,
          0,
        ),
        followerCount: perStore.reduce(
          (sum, s) => sum + s.followerCount,
          0,
        ),
        couponCount: perStore.reduce((sum, s) => sum + s.couponCount, 0),
        unreadNotificationCount,
        connectedIntegrations: perStore.filter((s) => s.connected).length,
        stores,
      };
    },

    async listTrackedAccounts(storeId: string): Promise<TrackedAccountRecord[]> {
      return deps.trackedAccounts.listByStore(storeId);
    },
  };
}

export type AnalyticsQueries = ReturnType<typeof makeAnalyticsQueries>;
