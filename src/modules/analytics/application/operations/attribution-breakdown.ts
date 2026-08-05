import { topN } from "./stats";
import type { AnalysisResult } from "../../domain/analysis";

export interface AttributionRecord {
  key: string;
  revenue: number;
  orders: number;
}

export interface AttributionBreakdownDataset {
  records: AttributionRecord[];
}

export function attributionBreakdown(dataset: AttributionBreakdownDataset): AnalysisResult {
  const records = dataset.records;

  if (records.length === 0) {
    return {
      operation: "attribution_breakdown",
      values: {},
      evidence: ["No attribution records available."],
      confidence: "low",
      dataQuality: "insufficient",
    };
  }

  const totalRevenue = records.reduce((sum, r) => sum + r.revenue, 0);
  const totalOrders = records.reduce((sum, r) => sum + r.orders, 0);
  const averageRevenue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const averageOrderValue = records.length > 0 ? totalRevenue / records.length : 0;

  const sorted = topN(records, (r) => r.revenue, records.length);
  const top = sorted[0];

  const revenueShares = records.map((r) => (totalRevenue > 0 ? (r.revenue / totalRevenue) : 0));

  return {
    operation: "attribution_breakdown",
    values: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      averageRevenue: Math.round(averageRevenue * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      uniqueKeys: records.length,
      topRevenue: top ? Math.round(top.revenue * 100) / 100 : 0,
      topOrders: top ? top.orders : 0,
      topRevenueShare: top && totalRevenue > 0 ? Math.round((top.revenue / totalRevenue) * 1000) / 1000 : 0,
    },
    series: [
      { label: "revenue", data: records.map((r) => r.revenue) },
      { label: "orders", data: records.map((r) => r.orders) },
      { label: "revenueShare", data: revenueShares },
    ],
    evidence: sorted.slice(0, 3).map((r, i) =>
      `Rank ${i + 1}: ${r.key} — revenue ${r.revenue.toFixed(2)}, orders ${r.orders}`
    ),
    confidence: records.length >= 10 ? "high" : records.length >= 3 ? "medium" : "low",
    dataQuality: records.length >= 3 ? "live" : "insufficient",
  };
}
