---
description: Business Intelligence (Read-Only Analytics)
---

# REQ-0083: Business Intelligence (Read-Only Analytics)

- **Status:** Draft
- **Owner:** wasim
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0083-business-intelligence.md`
- **Related Tracker:** `docs/trackers/TRACKER-0083-business-intelligence.md`
- **Supersedes:** `REQ-0014-executive-dashboard.md`, `REQ-0020-store-analytics.md`
- **Last updated:** 2026-08-05

## 1. Summary

Read-only business intelligence dashboard powered by e-commerce adapter data and Meta Insights API. Six metric groups: Sales, Customers, Attribution, Meta Performance, Coupon Effectiveness, Messaging. AI-generated dynamic dashboards via DynamicDashboard React component rendering KPI cards, line/bar/pie charts, tables, and sparklines from JSON schema.

## 2. Goals

- Dashboard metrics: revenue, orders, AOV, top products, customer segments, attribution, engagement.
- DynamicDashboard React component: renders any widget layout from JSON schema.
- AI-generated dashboards via generateDashboard tool.
- Read-only: no product editing, no order management.

## 3. Non-Goals

- Real-time streaming dashboards.
- Custom SQL/query builder.
- Data export to external BI tools (Phase 4).

## 4. User Stories

- As a merchant, I want to see which posts drove the most sales this month.
- As a user, I want AI to generate custom dashboards from natural language queries.
- As a merchant, I want to track coupon effectiveness (generated vs. redeemed, revenue).

## 5. Acceptance Criteria

- [ ] DynamicDashboard component renders: kpi, line_chart, bar_chart, pie_chart, table, sparkline.
- [ ] Widget sizes: small (col-span-3), medium (col-span-6), large (col-span-9), full (col-span-12).
- [ ] AI generateDashboard tool returns valid DashboardSchema.
- [ ] Six metric groups available via queryAnalytics.
- [ ] All data read-only — no mutations via dashboard.

## 6. Scope & Dependencies

- Modules: `analytics`, `ai`
- Depends on: REQ-0078 (e-commerce data), REQ-0084 (attribution data), REQ-0080 (messaging data)
- Augmented by: REQ-0091 (all dashboard numbers come from the deterministic AnalysisEngine; the DynamicDashboard renders computed `AnalysisResult` values, never LLM-guessed figures)

## 7. Code Snippets

### DynamicDashboard Component

```tsx
// src/components/dashboard/DynamicDashboard.tsx

interface DashboardSchema {
  title: string;
  widgets: DashboardWidget[];
}

interface DashboardWidget {
  type: "kpi" | "line_chart" | "bar_chart" | "pie_chart" | "table" | "sparkline";
  title: string;
  size: "small" | "medium" | "large" | "full";
  data: KPIData | ChartData | TableData;
}

interface KPIData {
  value: string | number;
  label: string;
  change?: number;
  changeLabel?: string;
  icon?: string;
}

interface ChartData {
  labels: string[];
  datasets: Array<{ label: string; data: number[]; color?: string }>;
}

export function DynamicDashboard({ schema }: { schema: DashboardSchema }) {
  return (
    <div className="grid grid-cols-12 gap-4">
      {schema.widgets.map((widget, i) => (
        <div key={i} className={sizeToGridClass(widget.size)}>
          {widget.type === "kpi" && <KPICard data={widget.data as KPIData} />}
          {widget.type === "line_chart" && <LineChart data={widget.data as ChartData} />}
          {widget.type === "bar_chart" && <BarChart data={widget.data as ChartData} />}
          {widget.type === "pie_chart" && <PieChart data={widget.data as ChartData} />}
          {widget.type === "table" && <DataTable data={widget.data as TableData} />}
          {widget.type === "sparkline" && <Sparkline data={widget.data as ChartData} />}
        </div>
      ))}
    </div>
  );
}

function sizeToGridClass(size: string): string {
  switch (size) {
    case "small": return "col-span-3";
    case "medium": return "col-span-6";
    case "large": return "col-span-9";
    case "full": return "col-span-12";
    default: return "col-span-6";
  }
}
```

## 8. Open Questions

None.
