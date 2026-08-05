# TASK-0083: Business Intelligence

- **Status:** In Progress
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0083-business-intelligence.md`
- **Tracker:** `docs/trackers/TRACKER-0083-business-intelligence.md`
- **Module(s):** analytics, ai
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Read-only BI dashboard with DynamicDashboard component.
- **Last updated:** 2026-08-05

## 1. Summary

Build read-only business intelligence dashboard. `DynamicDashboard` React component renders KPI cards, line/bar/pie charts, tables, sparklines from an AI-generated `DashboardSchema` JSON document. Six metric groups are provided by `queryAnalytics` and rendered through the component.

## 2. References

- Requirement: `docs/requirements/REQ-0083-business-intelligence.md`
- Related files:
  - `src/components/dashboard/DynamicDashboard.tsx` (new)
  - `src/modules/analytics/` (existing, extend)

## 3. Implementation Plan

### Batch 1 — DynamicDashboard component and widget renderers
- Build `DynamicDashboard.tsx` in `src/components/dashboard/` that maps a `DashboardSchema` to a
  12-column grid of widgets.
- Implement pure widget components (`KPICard`, `LineChartWidget`, `BarChartWidget`, `PieChartWidget`,
  `DataTableWidget`, `SparklineWidget`) using inline SVG/Tailwind so no extra chart dependency is
  required.
- Expose `sizeToGridClass` mapping `small`/`medium`/`large`/`full` to `col-span-3/6/9/12`.

### Batch 2 — queryAnalytics handler and dashboard page
- Add a server action that composes `resolveOperation`, `queryAnalytics`, and `generateDashboard`.
- Implement `PrismaDatasetFetcher` to load project-scoped data for the supported analysis operations.
- Add `/analytics/dashboard` page with an NL query input and the `DynamicDashboard` output.

### Step 1 — DynamicDashboard Component
React component that renders any widget layout from DashboardSchema JSON. Widget types: kpi, line_chart, bar_chart, pie_chart, table, sparkline. Grid layout with size classes.

### Step 2 — Widget Components
KPICard (value, change, label), LineChart, BarChart, PieChart (using inline SVG or recharts), DataTable, Sparkline.

### Step 3 — queryAnalytics Handler
Return structured data for: sales_today, sales_this_month, top_products, new_customers, returning_customers, coupon_performance, campaign_attribution, follower_growth, engagement_rate, best_posts.

### Step 4 — Dashboard Page
Marketing dashboard with default widgets. AI-generated custom dashboards via chat.

## 4. Subtasks

- [x] T-054: DynamicDashboard React component
- [x] T-054a: PieChartWidget 100% slice fix and changelog/tracker cleanup
- [ ] T-070: Brand mention monitoring — Mentions API + AI sentiment analysis (P2)
- [ ] T-072: Competitor tracking UI — add competitors, comparison dashboard (P2)
- [ ] T-074: Dashboard export (PDF, image, shareable link) — Phase 4

## 5. Acceptance Criteria

- [ ] Matches REQ-0083 acceptance criteria.
- [ ] Lint + typecheck + tests pass.
- [ ] `CHANGELOG.md` updated.

## 6. Notes / Blockers

None.
