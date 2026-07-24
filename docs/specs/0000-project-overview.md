# Spec 0000: Project Overview

- **Module(s):** all
- **Status:** Approved
- **Owner:** wasim
- **Related task(s):** docs/tasks/backlog.md
- **Related ADR(s):** docs/decisions/0001-record-architecture-decisions.md
- **Last updated:** 2026-07-24

## 1. Summary
**OmniConnect AI** is a production-ready SaaS that bridges Meta platforms (Instagram &
Facebook) with eCommerce platforms (Shopify first, provider-agnostic by design). It monitors
messages/comments/interactions, responds with a configurable AI assistant, onboards first-time
followers with personalized discount codes, manages coupons/products via a universal eCommerce
connector, and surfaces AI-driven marketing insights and reports.

The goal of Phase 1 is engagement, conversion, automated onboarding, automatic personalized
discount distribution, and AI marketing suggestions/reports — **not** full Meta Ads automation.

## 2. Goals
- Modular, scalable, mobile-first SaaS with clean DDD architecture and loose coupling.
- Extensible connector framework (add providers by implementing an interface only).
- Configurable AI assistant per connected page.
- Event-driven automation (e.g. new follower → personalized coupon → welcome message).
- Multi-tenant: Organizations own Stores and Integrations; RBAC (Admin/Store Owner/Staff).

## 3. Non-Goals (Phase 1)
- WhatsApp integration, Meta Ads insights/automation (Phase 2).
- WooCommerce/BigCommerce/Magento/Wix connectors (framework ready, not built).
- AI sales funnel builder, lead qualification, multi-language agent (Phase 3).

## 4. Modules
`auth`, `users`, `organizations`, `ecommerce`, `meta`, `ai`, `coupons`, `crm`,
`conversations`, `analytics`, `reports`, `notifications`. Each is loosely coupled and
communicates via public application services or domain events only.

## 5. Architecture
DDD (Presentation / Application / Domain / Infrastructure) + Repository Pattern +
Event-Driven Architecture. See `docs/architecture/`. Domain layer is pure; dependencies
point inward; no cross-module internal imports; no circular dependencies.

## 6. Tech Stack
Next.js 15 + TypeScript + TailwindCSS + ShadCN (mobile-first, PWA), PostgreSQL + Prisma,
BullMQ + Redis, OpenAI (multi-model-ready), NextAuth, AWS S3-compatible storage,
Sentry + OpenTelemetry. Changes require an ADR.

## 7. Core Data Model
`Users`, `Organizations`, `Stores`, `Integrations`, `Products`, `Customers`, `Coupons`,
`CouponUsage`, `Conversations`, `Messages`, `Campaigns`, `Reports`, `Notifications`,
`Followers`, `AIConfigurations`. Field-level detail lives in per-module specs.

## 8. UI Pages
Login, Dashboard, Meta Connections, Shopify Connections, AI Settings, Conversations,
Customers, Coupons, Reports, Analytics, Notifications, Account Settings. Dark + light mode,
responsive, mobile-first.

## 9. Delivery Order
See `CHANGELOG.md` → `[Unreleased] → Next`. Each item ships spec-first with a task.

## 10. Acceptance Criteria
- [ ] Governance foundation in place (rules, specs, tasks, changelog, architecture docs). ← this PR
- [ ] App scaffold builds, lints, typechecks, runs.
- [ ] Each Phase 1 module delivered per its spec with tests and updated changelog.
