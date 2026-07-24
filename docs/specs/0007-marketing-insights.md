# Spec 0007: Marketing Insights Dashboard

- **Module(s):** analytics, reports
- **Status:** Draft
- **Owner:** wasim
- **Related task(s):** docs/tasks/backlog.md
- **Related ADR(s):** —
- **Last updated:** 2026-07-24

## 1. Summary
AI-powered marketing analytics and recommendations: engagement analysis, growth trends, best-performing posts, sentiment, product-interest trends, conversion suggestions. Generates weekly/monthly reports plus caption/content/hashtag/audience recommendations. Dashboard widgets for the key KPIs.

## 2. Goals
- Analytics: engagement, growth trends, best posts, sentiment, product interest, conversion suggestions
- AI-generated weekly/monthly reports, growth recommendations, campaign/caption/content/hashtag/audience ideas
- Dashboard widgets: Followers Growth, Messages Received, Coupon Usage, AI Conversations, Sales Influenced, Top Products

## 3. Non-Goals
- Anything listed under Phase 2/3 in the Future Roadmap (see `docs/specs/0000-project-overview.md`).

## 4. Public Contract (loose coupling)
- `AnalyticsService` port: `getMetrics(range, filters)`.
- `ReportsService` port: `generateReport(period)` (uses `ai` provider).
- Reads data via other modules' read ports/events; never their internals.

> Other modules interact ONLY through the contract above (application service / port /
> domain events). No module imports this module's internals. No circular dependencies.

## 5. Data / Persistence
`Reports`, plus read models aggregated from `Followers`, `Messages`, `CouponUsage`, `Conversations`, `Products`. Ownership: `analytics` (read models) + `reports` (generated docs).
All schema changes via Prisma migrations.

## 6. Notes
Analytics builds CQRS-style read models from domain events to stay decoupled from write side.

## 7. Acceptance Criteria (Definition of Done)
- [ ] Domain modeled (entities, events) with pure unit tests.
- [ ] Application services/ports implemented and exposed via the module's public barrel.
- [ ] Infrastructure adapters/repositories implemented (Prisma, external APIs).
- [ ] Presentation (routes/UI) wired where applicable, with RBAC.
- [ ] Lint + typecheck + tests pass; `CHANGELOG.md` updated.

> This is an initial stub. Expand using `_TEMPLATE.md` before implementation begins.
