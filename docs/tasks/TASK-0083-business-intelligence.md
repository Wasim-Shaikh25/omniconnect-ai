# TASK-0083: Business Intelligence

- **Status:** In Progress
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0083-business-intelligence.md`
- **Tracker:** `docs/trackers/TRACKER-0083-business-intelligence.md`
- **Module(s):** analytics, ai
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Read-only BI dashboard with DynamicDashboard component.
- **Last updated:** 2026-08-05
- **Active branch:** `devin/bi-brand-mentions-1785953983`

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
- [x] T-055: queryAnalytics server action and PrismaDatasetFetcher
- [x] T-055a: Devin Review fixes — top_n limit, compare window, today inclusion, typed adapters, infra injection
- [x] T-056: /analytics/dashboard page with NL query input and DynamicDashboard
- [x] T-072: Competitor comparison dashboard (project-scoped)
- [x] T-072a: Link competitor page from analytics hub.
- [x] T-070: Brand mention monitoring — Mentions API + AI sentiment analysis (P2)
  - [x] T-070a: `MentionSentimentAnalyzer` and `BrandMentionSource` ports with `HeuristicMentionSentimentAnalyzer` and `MockBrandMentionSource` adapters.
  - [x] T-070b: `OpenRouterMentionSentimentAnalyzer` AI adapter with heuristic fallback.
  - [x] T-070c: `mentionService` with `syncMentions` and `listMentionsWithSentiment`.
  - [x] T-070d: `syncMentionsAction` and `listMentionsWithSentimentAction`.
  - [x] T-070e: `/stores/[projectId]/analytics/mentions` page and nav link.
- [x] T-074: Dashboard export (PDF, image, shareable link) — Phase 4
  - [x] T-074a: Add `DashboardShare` Prisma model and `createDashboardShareAction` / `getDashboardShareByTokenAction`.
  - [x] T-074b: Add client-side export buttons (image and PDF) to `/analytics/dashboard` using `html-to-image` and `jspdf`.
  - [x] T-074c: Add read-only share page `/share/d/[token]` that renders a stored `DashboardSchema`.
  - [x] T-074d: Update requirement/tracker and run quality gates.

## 5. Acceptance Criteria

- [x] Matches REQ-0083 acceptance criteria.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.

## 6. Notes / Blockers

None.
