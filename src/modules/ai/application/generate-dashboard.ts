import type { AnalysisResult } from "@/modules/analytics/pure";
import type { QueryAnalyticsResult } from "./query-analytics";
import { z } from "zod";

export interface KPIData {
  value: string | number;
  label: string;
  change?: number;
  changeLabel?: string;
  icon?: string;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{ label: string; data: number[]; color?: string }>;
}

export interface TableRow {
  [key: string]: string | number | null;
}

export interface TableData {
  headers: string[];
  rows: TableRow[];
}

export type DashboardWidgetData = KPIData | ChartData | TableData;

export interface DashboardWidget {
  type: "kpi" | "line_chart" | "bar_chart" | "pie_chart" | "table" | "sparkline";
  title: string;
  size: "small" | "medium" | "large" | "full";
  data: DashboardWidgetData;
}

export interface DashboardSchema {
  title: string;
  widgets: DashboardWidget[];
}

export type GenerateDashboardResult =
  | { schema: DashboardSchema; result: AnalysisResult }
  | { unsupported: true; reason: string };

function toKPIWidget(key: string, value: number): DashboardWidget {
  return {
    type: "kpi",
    title: key,
    size: "small",
    data: { value, label: key },
  };
}

function toChartWidget(title: string, series: { label: string; data: number[] }): DashboardWidget {
  const labels = series.data.map((_, i) => String(i + 1));
  return {
    type: "line_chart",
    title,
    size: "medium",
    data: { labels, datasets: [{ label: series.label, data: series.data }] },
  };
}

function toEvidenceTable(evidence: string[]): DashboardWidget {
  return {
    type: "table",
    title: "Evidence",
    size: "full",
    data: {
      headers: ["Observation"],
      rows: evidence.map((text) => ({ Observation: text })),
    },
  };
}

export function generateDashboard(
  queryResult: QueryAnalyticsResult
): GenerateDashboardResult {
  if ("unsupported" in queryResult) {
    return { unsupported: true, reason: queryResult.reason };
  }

  const { result } = queryResult;
  const widgets: DashboardWidget[] = [];

  for (const [key, value] of Object.entries(result.values)) {
    if (typeof value === "number") {
      widgets.push(toKPIWidget(key, value));
    }
  }

  if (result.series && result.series.length > 0) {
    for (const series of result.series) {
      widgets.push(toChartWidget(series.label, series));
    }
  }

  if (result.evidence.length > 0) {
    widgets.push(toEvidenceTable(result.evidence));
  }

  return {
    schema: {
      title: `Dashboard: ${result.operation}`,
      widgets,
    },
    result,
  };
}

const kpiDataSchema = z.object({
  value: z.union([z.string(), z.number()]),
  label: z.string(),
  change: z.number().optional(),
  changeLabel: z.string().optional(),
  icon: z.string().optional(),
});

const chartDataSchema = z.object({
  labels: z.array(z.string()),
  datasets: z.array(
    z.object({
      label: z.string(),
      data: z.array(z.number()),
      color: z.string().optional(),
    }),
  ),
});

const tableDataSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.record(z.union([z.string(), z.number(), z.null()]))),
});

const widgetTitleSchema = z.string().min(1);
const widgetSizeSchema = z.enum(["small", "medium", "large", "full"]);

const dashboardWidgetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("kpi"), title: widgetTitleSchema, size: widgetSizeSchema, data: kpiDataSchema }),
  z.object({ type: z.literal("line_chart"), title: widgetTitleSchema, size: widgetSizeSchema, data: chartDataSchema }),
  z.object({ type: z.literal("bar_chart"), title: widgetTitleSchema, size: widgetSizeSchema, data: chartDataSchema }),
  z.object({ type: z.literal("pie_chart"), title: widgetTitleSchema, size: widgetSizeSchema, data: chartDataSchema }),
  z.object({ type: z.literal("table"), title: widgetTitleSchema, size: widgetSizeSchema, data: tableDataSchema }),
  z.object({ type: z.literal("sparkline"), title: widgetTitleSchema, size: widgetSizeSchema, data: chartDataSchema }),
]);

export const dashboardSchema = z.object({
  title: z.string().min(1),
  widgets: z.array(dashboardWidgetSchema),
});
