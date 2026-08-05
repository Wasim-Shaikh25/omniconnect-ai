import { eventBus } from "@/shared/events";
import type { EcommerceQueries } from "./queries";
import {
  CommerceInsight,
  CommerceRecommendation,
  CommerceInsightGenerated,
  CommerceRecommendationGenerated,
} from "../domain/events";

export type { CommerceInsight, CommerceRecommendation } from "../domain/events";

export interface DetectCommerceInsightsInput {
  ecommerce: EcommerceQueries;
  now?: Date;
}

interface WindowStats {
  revenue: number;
  orders: number;
  aov: number;
  newCustomers: number;
  repeatCustomers: number;
  outOfStockProducts: number;
  lowStockProducts: number;
}

function windowStart(daysAgo: number, now: Date): Date {
  return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

function safeDivide(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function percentChange(current: number, previous: number): number {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return round(((current - previous) / previous) * 100);
}

export interface DetectCommerceInsights {
  (organizationId: string, storeId: string): Promise<{
    insights: CommerceInsight[];
    recommendations: CommerceRecommendation[];
  }>;
}

export function makeDetectCommerceInsights(input: DetectCommerceInsightsInput): DetectCommerceInsights {
  const now = input.now ?? new Date();

  async function computeWindowStats(storeId: string, start: Date, end: Date): Promise<WindowStats> {
    const [orders, products] = await Promise.all([
      input.ecommerce.listOrders(storeId, 500),
      input.ecommerce.listProducts(storeId, 100),
    ]);

    const windowOrders = orders.filter((o) => {
      const createdAt = new Date(o.createdAt);
      return createdAt >= start && createdAt < end;
    });

    const revenue = windowOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const orderCount = windowOrders.length;
    const customerRefCounts = new Map<string | null, number>();
    for (const order of windowOrders) {
      const ref = order.customerRef ?? null;
      customerRefCounts.set(ref, (customerRefCounts.get(ref) ?? 0) + 1);
    }
    const repeatCustomers = Array.from(customerRefCounts.values()).filter((c) => c > 1).length;
    const newCustomers = customerRefCounts.size - repeatCustomers;

    const outOfStockProducts = products.filter((p) => p.inventory === 0).length;
    const lowStockProducts = products.filter((p) => typeof p.inventory === "number" && p.inventory > 0 && p.inventory < 5).length;

    return {
      revenue: round(revenue),
      orders: orderCount,
      aov: round(safeDivide(revenue, orderCount)),
      newCustomers,
      repeatCustomers,
      outOfStockProducts,
      lowStockProducts,
    };
  }

  function determineDominantDriver(current: WindowStats, previous: WindowStats): "orders" | "aov" | "mix" | "availability" {
    const orderChange = percentChange(current.orders, previous.orders);
    const aovChange = percentChange(current.aov, previous.aov);

    const drivers: Array<{ name: "orders" | "aov" | "mix" | "availability"; abs: number }> = [
      { name: "orders", abs: Math.abs(orderChange) },
      { name: "aov", abs: Math.abs(aovChange) },
    ];

    if (current.outOfStockProducts > 0 || current.lowStockProducts > 0) {
      drivers.push({ name: "availability", abs: 15 + current.outOfStockProducts * 5 + current.lowStockProducts * 2 });
    }

    if (current.newCustomers !== previous.newCustomers || current.repeatCustomers !== previous.repeatCustomers) {
      const mixChange = Math.abs(percentChange(current.newCustomers + current.repeatCustomers, previous.newCustomers + previous.repeatCustomers));
      drivers.push({ name: "mix", abs: mixChange });
    }

    const dominant = drivers.sort((a, b) => b.abs - a.abs)[0];
    return dominant ? dominant.name : "orders";
  }

  async function detectNoOrders(organizationId: string, storeId: string): Promise<CommerceInsight | null> {
    const oneDayAgo = windowStart(1, now);
    let orders: Awaited<ReturnType<typeof input.ecommerce.listOrders>> = [];
    try {
      orders = await input.ecommerce.listOrders(storeId, 50);
    } catch {
      return null;
    }
    const recentOrders = orders.filter((o) => new Date(o.createdAt) >= oneDayAgo);
    if (recentOrders.length > 0) return null;

    return {
      organizationId,
      storeId,
      type: "RISK",
      severity: "HIGH",
      status: "OPEN",
      title: "No orders in the last 24 hours",
      description: "There are no recorded completed orders in the last 24 hours. Consider reviewing your store integration or marketing activity.",
      deepLink: `/stores/${storeId}/orders`,
      generatedAt: now,
    };
  }

  async function detectRevenueDecline(organizationId: string, storeId: string): Promise<CommerceInsight | null> {
    const currentStart = windowStart(7, now);
    const previousStart = windowStart(14, now);

    const [current, previous] = await Promise.all([
      computeWindowStats(storeId, currentStart, now),
      computeWindowStats(storeId, previousStart, currentStart),
    ]);

    if (current.orders === 0 && previous.orders === 0) return null;

    const changePercent = percentChange(current.revenue, previous.revenue);
    const threshold = 20;
    const hasDecline = previous.revenue === 0 ? current.revenue === 0 : changePercent <= -threshold;
    const hasRecovery = previous.revenue === 0 ? current.revenue > 0 : changePercent >= threshold;

    if (!hasDecline && !hasRecovery) return null;

    const dominantDriver = determineDominantDriver(current, previous);

    const driverText = {
      orders: hasDecline ? "driven by fewer orders" : "driven by more orders",
      aov: hasDecline ? "driven by lower AOV" : "driven by higher AOV",
      mix: hasDecline ? "driven by weaker new/repeat customer mix" : "driven by stronger new/repeat customer mix",
      availability: hasDecline ? "driven partly by out-of-stock or low-stock products" : "supported by improving product availability",
    }[dominantDriver];

    const summary = `Revenue ${hasDecline ? "declined" : "recovered"} ${Math.abs(changePercent)}% (current: ${current.revenue} from ${current.orders} orders @ AOV ${current.aov}; previous: ${previous.revenue} from ${previous.orders} orders @ AOV ${previous.aov}). New customers: ${current.newCustomers} vs ${previous.newCustomers}; repeat: ${current.repeatCustomers} vs ${previous.repeatCustomers}. Out of stock: ${current.outOfStockProducts}; low stock: ${current.lowStockProducts}. ${driverText}.`;

    const title = hasDecline
      ? `Revenue declined ${Math.abs(changePercent)}% in the last 7 days (${driverText})`
      : `Revenue recovered ${changePercent}% in the last 7 days (${driverText})`;

    return {
      organizationId,
      storeId,
      type: hasDecline ? "RISK" : "OPPORTUNITY",
      severity: Math.abs(changePercent) >= 50 ? "CRITICAL" : Math.abs(changePercent) >= 30 ? "HIGH" : "MEDIUM",
      status: "OPEN",
      title,
      description: summary,
      deepLink: `/stores/${storeId}/orders`,
      generatedAt: now,
    };
  }

  return async function detectCommerceInsights(organizationId: string, storeId: string) {
    const insights: CommerceInsight[] = [];
    const recommendations: CommerceRecommendation[] = [];

    const noOrders = await detectNoOrders(organizationId, storeId);
    if (noOrders) {
      insights.push(noOrders);
      recommendations.push({
        organizationId,
        storeId,
        type: "INVESTIGATE",
        priority: "HIGH",
        title: "Check store integration and recent marketing activity",
        description: "No orders in the last 24 hours. Verify your Shopify/Meta integration and consider a follow-up campaign.",
        deepLink: `/stores/${storeId}/integrations`,
        generatedAt: now,
      });
    }

    const revenue = await detectRevenueDecline(organizationId, storeId);
    if (revenue) {
      insights.push(revenue);
      if (revenue.type === "RISK") {
        recommendations.push({
          organizationId,
          storeId,
          type: "ACTION",
          priority: revenue.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
          title: "Review revenue drivers and run a recovery campaign",
          description: revenue.description,
          deepLink: `/stores/${storeId}/campaigns`,
          generatedAt: now,
        });
      }
    }

    for (const insight of insights) {
      await eventBus.publish(new CommerceInsightGenerated(storeId, { organizationId, storeId, insight }));
    }
    for (const recommendation of recommendations) {
      await eventBus.publish(new CommerceRecommendationGenerated(storeId, { organizationId, storeId, recommendation }));
    }

    return { insights, recommendations };
  };
}
