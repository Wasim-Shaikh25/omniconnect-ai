import type {
  CustomerConsent,
  CustomerLifecycleStage,
  CustomerRecord,
  CustomerRepository,
  FollowerRecord,
  FollowerRepository,
} from "./ports";
import type { PaginationInput, PaginatedResult } from "@/shared/kernel";
import { paginatedResult, toSkip } from "@/shared/kernel";

export interface CustomerActivity {
  conversationCount: number;
  messageCount: number;
  followerCount: number;
  couponUsageCount: number;
  lastMessageAt: Date | null;
}

export interface CustomerListView extends CustomerRecord {
  storeName: string;
  engagementScore: number;
  leadScore: number;
  segment: string;
  activity: CustomerActivity;
}

export interface CustomerDetailView extends CustomerListView {
  coupons: { id: string; code: string; discountPct: number; status: string; expiresAt: Date | null }[];
  usages: { couponId: string; usedAt: Date; orderRef: string | null }[];
  followers: FollowerRecord[];
}

export interface CustomerDirectoryFilter {
  search?: string;
  lifecycleStage?: CustomerLifecycleStage;
  consent?: CustomerConsent;
  segment?: string;
}

function computeScores(activity: CustomerActivity, consent: CustomerConsent): {
  engagementScore: number;
  leadScore: number;
} {
  const engagement = Math.min(
    100,
    activity.conversationCount * 10 +
      activity.messageCount * 2 +
      activity.followerCount * 15 +
      activity.couponUsageCount * 20,
  );

  const consentBoost = consent === "GRANTED" ? 30 : 0;
  const lead = Math.min(
    100,
    activity.conversationCount * 15 +
      activity.messageCount * 5 +
      consentBoost +
      activity.couponUsageCount * 25,
  );

  return { engagementScore: engagement, leadScore: lead };
}

function computeSegment(
  stage: CustomerLifecycleStage,
  engagementScore: number,
  leadScore: number,
  createdAt: Date,
): string {
  if (stage === "CHURNED") return "At-risk";
  if (stage === "CUSTOMER" && engagementScore >= 70) return "VIP";
  if (engagementScore >= 50) return "Engaged";
  if (leadScore >= 60 && (stage === "LEAD" || stage === "PROSPECT")) {
    return "High intent";
  }
  const daysSinceCreation =
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (stage === "LEAD" && daysSinceCreation < 7) return "New lead";
  if (stage === "CUSTOMER") return "Customer";
  return "Lead";
}

function matchesFilter(
  item: CustomerListView,
  filter?: CustomerDirectoryFilter,
): boolean {
  if (!filter) return true;

  if (filter.lifecycleStage && item.lifecycleStage !== filter.lifecycleStage) {
    return false;
  }
  if (filter.consent && item.consent !== filter.consent) return false;
  if (filter.segment && item.segment !== filter.segment) return false;

  if (filter.search) {
    const q = filter.search.toLowerCase();
    const text = `${item.username ?? ""} ${item.igUserId ?? ""} ${item.fbUserId ?? ""} ${item.tags.join(" ")}`.toLowerCase();
    if (!text.includes(q)) return false;
  }

  return true;
}

export function makeCustomerDirectory(deps: {
  organizations: {
    getOrganizationOverview(
      organizationId: string,
    ): Promise<{ id: string; name: string; stores: { id: string; name: string }[] } | null>;
  };
  customers: CustomerRepository;
  followers: FollowerRepository;
}) {
  function filterStoresByScope(
    stores: { id: string; name: string }[],
    storeId?: string | null,
  ) {
    if (!storeId) return stores;
    return stores.filter((s) => s.id === storeId);
  }
  async function enrich(
    customer: CustomerRecord,
    storeNameById: Map<string, string>,
  ): Promise<CustomerListView> {
    const activity = await deps.customers.getActivity(customer.id, customer.storeId);

    const { engagementScore, leadScore } = computeScores(
      activity,
      customer.consent,
    );
    const segment = computeSegment(
      customer.lifecycleStage,
      engagementScore,
      leadScore,
      customer.createdAt,
    );

    return {
      ...customer,
      storeName: storeNameById.get(customer.storeId) ?? "Unknown",
      engagementScore,
      leadScore,
      segment,
      activity,
    };
  }

  async function fetchFiltered(
    organizationId: string,
    filter?: CustomerDirectoryFilter,
    storeId?: string | null,
  ): Promise<CustomerListView[]> {
    const overview = await deps.organizations.getOrganizationOverview(organizationId);
    if (!overview) return [];

    const stores = filterStoresByScope(overview.stores, storeId);
    const storeIds = stores.map((s) => s.id);
    const storeNameById = new Map(stores.map((s) => [s.id, s.name]));

    if (storeIds.length === 0) return [];

    const customers = await deps.customers.listByStoreIds(storeIds, 250);
    const enriched = await Promise.all(customers.map((c) => enrich(c, storeNameById)));
    return enriched.filter((item) => matchesFilter(item, filter));
  }

  return {
    async listCustomersByOrganization(
      organizationId: string,
      filter?: CustomerDirectoryFilter,
      storeId?: string | null,
    ): Promise<CustomerListView[]> {
      return fetchFiltered(organizationId, filter, storeId);
    },

    async listCustomersByOrganizationPaginated(
      organizationId: string,
      pagination: PaginationInput,
      filter?: CustomerDirectoryFilter,
      storeId?: string | null,
    ): Promise<PaginatedResult<CustomerListView>> {
      const all = await fetchFiltered(organizationId, filter, storeId);
      const skip = toSkip(pagination);
      const items = all.slice(skip, skip + pagination.limit);
      return paginatedResult(items, all.length, pagination);
    },

    async getCustomerDetail(
      organizationId: string,
      customerId: string,
    ): Promise<CustomerDetailView | null> {
      const overview = await deps.organizations.getOrganizationOverview(
        organizationId,
      );
      if (!overview) return null;

      const storeIds = overview.stores.map((s) => s.id);
      const storeNameById = new Map(overview.stores.map((s) => [s.id, s.name]));

      let customer: CustomerRecord | null = null;
      for (const storeId of storeIds) {
        customer = await deps.customers.findById(customerId, storeId);
        if (customer) break;
      }
      if (!customer) return null;

      const profile = await deps.customers.getProfile({
        storeId: customer.storeId,
        channel: customer.igUserId ? "INSTAGRAM" : "FACEBOOK",
        externalUserId: customer.igUserId ?? customer.fbUserId ?? "",
      });

      const base = await enrich(customer, storeNameById);
      const followers = await deps.followers.listByStore(customer.storeId, { limit: 50 });

      return {
        ...base,
        storeName: storeNameById.get(customer.storeId) ?? "Unknown",
        coupons: profile?.coupons ?? [],
        usages: profile?.usages ?? [],
        followers: followers.filter((f) => f.customerId === customer.id),
      };
    },
  };
}

export type CustomerDirectory = ReturnType<typeof makeCustomerDirectory>;
