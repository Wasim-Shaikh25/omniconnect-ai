import type { MetricRepository } from "./ports";
import type { MetricDefinitionRecord, MetricSnapshotRecord, MetricSnapshotStatus } from "../domain/types";

export interface MetricSourceProvider {
  getWorkspaceOverview(
    userId: string,
  ): Promise<{ id: string; name: string; stores: { id: string; name: string }[] } | null>;
  getConversationCount(projectId: string): Promise<number>;
  getFollowerCount(projectId: string): Promise<number>;
  getCouponCount(projectId: string): Promise<number>;
  getProductCount(projectId: string): Promise<number>;
  getLastMessageAt(projectId: string): Promise<Date | null>;
  getRevenue(projectId: string, days: number): Promise<number>;
  getOrderCount(projectId: string, days: number): Promise<number>;
  getAverageOrderValue(projectId: string, days: number): Promise<number>;
}

const DEFAULT_DEFINITIONS: Array<Omit<MetricDefinitionRecord, "id" | "createdAt" | "updatedAt">> = [
  {
    userId: null,
    name: "conversation_count",
    displayName: "Conversations",
    description: "Total conversations across the workspace or store.",
    formula: "count(Conversation)",
    grain: "daily",
    dimensions: ["store"],
    source: "conversations",
    freshnessSlaMs: 300_000,
    owner: "intelligence",
    version: 1,
  },
  {
    userId: null,
    name: "follower_count",
    displayName: "Followers",
    description: "Total Meta followers.",
    formula: "count(Follower)",
    grain: "daily",
    dimensions: ["store"],
    source: "crm",
    freshnessSlaMs: 300_000,
    owner: "intelligence",
    version: 1,
  },
  {
    userId: null,
    name: "coupon_count",
    displayName: "Coupons",
    description: "Total coupons generated.",
    formula: "count(Coupon)",
    grain: "daily",
    dimensions: ["store"],
    source: "ecommerce",
    freshnessSlaMs: 300_000,
    owner: "intelligence",
    version: 1,
  },
  {
    userId: null,
    name: "product_count",
    displayName: "Products",
    description: "Products synced from the connected catalog.",
    formula: "count(Product)",
    grain: "daily",
    dimensions: ["store"],
    source: "ecommerce",
    freshnessSlaMs: 300_000,
    owner: "intelligence",
    version: 1,
  },
  {
    userId: null,
    name: "response_time_minutes",
    displayName: "Response time",
    description: "Median time from customer message to first reply (minutes).",
    formula: "median(first_reply_at - message_created_at)",
    grain: "daily",
    dimensions: ["store"],
    source: "conversations",
    freshnessSlaMs: 600_000,
    owner: "intelligence",
    version: 1,
  },
  {
    userId: null,
    name: "revenue_7d",
    displayName: "Revenue (7d)",
    description: "Trailing 7-day revenue from completed orders.",
    formula: "sum(Order.total where createdAt within 7 days)",
    grain: "daily",
    dimensions: ["store"],
    source: "ecommerce",
    freshnessSlaMs: 300_000,
    owner: "intelligence",
    version: 1,
  },
  {
    userId: null,
    name: "order_count_7d",
    displayName: "Orders (7d)",
    description: "Trailing 7-day order count.",
    formula: "count(Order where createdAt within 7 days)",
    grain: "daily",
    dimensions: ["store"],
    source: "ecommerce",
    freshnessSlaMs: 300_000,
    owner: "intelligence",
    version: 1,
  },
  {
    userId: null,
    name: "aov_7d",
    displayName: "AOV (7d)",
    description: "Trailing 7-day average order value.",
    formula: "revenue_7d / order_count_7d",
    grain: "daily",
    dimensions: ["store"],
    source: "ecommerce",
    freshnessSlaMs: 300_000,
    owner: "intelligence",
    version: 1,
  },
];

async function ensureDefinitions(repo: MetricRepository): Promise<MetricDefinitionRecord[]> {
  const existing = await repo.listDefinitions(null);
  const existingNames = new Set(existing.map((d) => d.name));
  const missing = DEFAULT_DEFINITIONS.filter((d) => !existingNames.has(d.name));
  for (const def of missing) {
    await repo.saveDefinition(def);
  }
  return repo.listDefinitions(null);
}

function snapshotStatus(computedAt: Date, slaMs: number): MetricSnapshotStatus {
  const age = Date.now() - computedAt.getTime();
  if (age <= slaMs) return "FRESH";
  return "STALE";
}

async function computeValue(
  name: string,
  provider: MetricSourceProvider,
  userId: string,
  projectId: string | null,
): Promise<{ value: number; sourceIds: string[]; periodStart: Date; periodEnd: Date }> {
  const overview = await provider.getWorkspaceOverview(userId);
  if (!overview) {
    return { value: 0, sourceIds: [], periodStart: new Date(), periodEnd: new Date() };
  }
  const stores = projectId ? overview.stores.filter((s) => s.id === projectId) : overview.stores;

  if (name === "conversation_count") {
    const counts = await Promise.all(stores.map((s) => provider.getConversationCount(s.id)));
    return {
      value: counts.reduce((a, b) => a + b, 0),
      sourceIds: stores.map((s) => s.id),
      periodStart: new Date(),
      periodEnd: new Date(),
    };
  }

  if (name === "follower_count") {
    const counts = await Promise.all(stores.map((s) => provider.getFollowerCount(s.id)));
    return {
      value: counts.reduce((a, b) => a + b, 0),
      sourceIds: stores.map((s) => s.id),
      periodStart: new Date(),
      periodEnd: new Date(),
    };
  }

  if (name === "coupon_count") {
    const counts = await Promise.all(stores.map((s) => provider.getCouponCount(s.id)));
    return {
      value: counts.reduce((a, b) => a + b, 0),
      sourceIds: stores.map((s) => s.id),
      periodStart: new Date(),
      periodEnd: new Date(),
    };
  }

  if (name === "product_count") {
    const counts = await Promise.all(stores.map((s) => provider.getProductCount(s.id)));
    return {
      value: counts.reduce((a, b) => a + b, 0),
      sourceIds: stores.map((s) => s.id),
      periodStart: new Date(),
      periodEnd: new Date(),
    };
  }

  if (name === "response_time_minutes") {
    const timestamps = await Promise.all(stores.map((s) => provider.getLastMessageAt(s.id)));
    const valid = timestamps.filter((d): d is Date => d !== null);
    if (valid.length === 0) {
      return { value: 0, sourceIds: stores.map((s) => s.id), periodStart: new Date(), periodEnd: new Date() };
    }
    const median = valid.sort((a, b) => a.getTime() - b.getTime())[Math.floor(valid.length / 2)];
    const minutes = Math.max(0, Math.round((Date.now() - median.getTime()) / 60_000));
    return {
      value: minutes,
      sourceIds: stores.map((s) => s.id),
      periodStart: valid[0],
      periodEnd: valid[valid.length - 1],
    };
  }

  if (name === "revenue_7d") {
    const values = await Promise.all(stores.map((s) => provider.getRevenue(s.id, 7)));
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();
    return {
      value: values.reduce((a, b) => a + b, 0),
      sourceIds: stores.map((s) => s.id),
      periodStart,
      periodEnd,
    };
  }

  if (name === "order_count_7d") {
    const values = await Promise.all(stores.map((s) => provider.getOrderCount(s.id, 7)));
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();
    return {
      value: values.reduce((a, b) => a + b, 0),
      sourceIds: stores.map((s) => s.id),
      periodStart,
      periodEnd,
    };
  }

  if (name === "aov_7d") {
    const [revenues, counts] = await Promise.all([
      Promise.all(stores.map((s) => provider.getRevenue(s.id, 7))),
      Promise.all(stores.map((s) => provider.getOrderCount(s.id, 7))),
    ]);
    const totalRevenue = revenues.reduce((a, b) => a + b, 0);
    const totalOrders = counts.reduce((a, b) => a + b, 0);
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();
    return {
      value: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
      sourceIds: stores.map((s) => s.id),
      periodStart,
      periodEnd,
    };
  }

  return { value: 0, sourceIds: [], periodStart: new Date(), periodEnd: new Date() };
}

export function makeMetricService(repo: MetricRepository, provider: MetricSourceProvider) {
  return {
    async getDefinitions(): Promise<MetricDefinitionRecord[]> {
      return ensureDefinitions(repo);
    },

    async getMetric(
      name: string,
      userId: string,
      projectId: string | null = null,
    ): Promise<MetricSnapshotRecord | null> {
      const definitions = await ensureDefinitions(repo);
      const definition = definitions.find((d) => d.name === name);
      if (!definition) return null;

      const latest = await repo.getLatestSnapshot(definition.id, userId, projectId);
      if (latest && latest.status !== "STALE") {
        const status = snapshotStatus(latest.computedAt, definition.freshnessSlaMs);
        if (status === "FRESH") return latest;
      }

      const computed = await computeValue(name, provider, userId, projectId);
      const status = snapshotStatus(new Date(), definition.freshnessSlaMs);
      return repo.saveSnapshot({
        definitionId: definition.id,
        userId,
        projectId,
        value: computed.value,
        dimensions: projectId ? { projectId } : null,
        periodStart: computed.periodStart,
        periodEnd: computed.periodEnd,
        status,
        sourceIds: computed.sourceIds,
      });
    },

    async getMetricsForWorkspace(userId: string): Promise<MetricSnapshotRecord[]> {
      const definitions = await ensureDefinitions(repo);
      return Promise.all(
        definitions.map((d) => this.getMetric(d.name, userId, null)),
      ).then((results) => results.filter((s): s is MetricSnapshotRecord => s !== null));
    },

    async refreshMetric(name: string, userId: string, projectId: string | null = null): Promise<MetricSnapshotRecord | null> {
      const definitions = await ensureDefinitions(repo);
      const definition = definitions.find((d) => d.name === name);
      if (!definition) return null;

      const computed = await computeValue(name, provider, userId, projectId);
      const status = snapshotStatus(new Date(), definition.freshnessSlaMs);
      return repo.saveSnapshot({
        definitionId: definition.id,
        userId,
        projectId,
        value: computed.value,
        dimensions: projectId ? { projectId } : null,
        periodStart: computed.periodStart,
        periodEnd: computed.periodEnd,
        status,
        sourceIds: computed.sourceIds,
      });
    },
  };
}

export type MetricService = ReturnType<typeof makeMetricService>;
