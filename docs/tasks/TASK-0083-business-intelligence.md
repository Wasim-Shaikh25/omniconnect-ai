# TASK-0083: Business Intelligence

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0083-business-intelligence.md`
- **Tracker:** `docs/trackers/TRACKER-0083-business-intelligence.md`
- **Module(s):** analytics, ai
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Read-only BI dashboard with DynamicDashboard component.
- **Last updated:** 2026-08-05

## 1. Summary

Build read-only business intelligence dashboard. DynamicDashboard React component renders KPI cards, line/bar/pie charts, tables, sparklines from AI-generated JSON schema. Six metric groups.

## 2. References

- Requirement: `docs/requirements/REQ-0083-business-intelligence.md`
- Related files:
  - `src/components/dashboard/DynamicDashboard.tsx` (new)
  - `src/modules/analytics/` (existing, extend)

## 3. Implementation Plan

### Step 1 — DynamicDashboard Component
React component that renders any widget layout from DashboardSchema JSON. Widget types: kpi, line_chart, bar_chart, pie_chart, table, sparkline. Grid layout with size classes.

### Step 2 — Widget Components
KPICard (value, change, label), LineChart, BarChart, PieChart (using recharts or similar), DataTable, Sparkline.

### Step 3 — queryAnalytics Handler
Return structured data for: sales_today, sales_this_month, top_products, new_customers, returning_customers, coupon_performance, campaign_attribution, follower_growth, engagement_rate, best_posts.

### Step 4 — Dashboard Page
Marketing dashboard with default widgets. AI-generated custom dashboards via chat.

## 4. Subtasks

- [ ] T-054: DynamicDashboard React component
- [ ] T-074: Dashboard export (PDF, image, shareable link) — Phase 4

## 5. Acceptance Criteria

- [ ] Matches REQ-0083 acceptance criteria.
- [ ] Lint + typecheck + tests pass.
- [ ] `CHANGELOG.md` updated.

## 6. Notes / Blockers

None.
