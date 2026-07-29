# OmniConnect AI — Current State and Architecture

- **Status:** Living document
- **Owner:** Devin
- **Last updated:** 2026-07-28
- **Changelog:** `CHANGELOG.md`
- **Product charter:** `docs/requirements/REQ-0061-product-charter.md`

> This document is the single source of truth for how the application works today. Update it whenever the architecture, public contracts, or critical flows change.

---

## 1. Product Goal

OmniConnect AI is a **universal Meta-first growth platform** for creators and merchants. It connects any major e-commerce store (Shopify first; WooCommerce, BigCommerce, Magento planned) and Meta (Instagram/Facebook) accounts to an AI assistant that helps users:

1. Create better Instagram/Facebook content from real trends.
2. Engage followers with AI replies and coupon campaigns.
3. Analyze which posts/reels/videos drive new customers, leads, and revenue.
4. Run automated Meta campaigns using real product and coupon data.

It is **not** a customer-facing storefront, a Shopify/e-commerce admin replacement, or a vendor portal.

---

## 2. Target Users and Roles

| Role | Description |
|------|-------------|
| `ANONYMOUS` | Visitor on landing/pricing pages. |
| `USER` / `STORE_OWNER` | Owns the organization; can connect stores, invite team, manage billing, view analytics. |
| `ADMIN` | Same as owner except billing ownership may differ. |
| `STAFF` | Scoped to one assigned store; can view inbox, followers, analytics, and take over AI conversations. |
| `SUPER_ADMIN` | Platform-level support; can triage tickets, manage organizations, view system logs. |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 15 App Router + React Server Actions (BFF)          │
│  TailwindCSS + ShadCN UI + next-themes (dark/light)          │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  DDD Modules (Presentation → Application → Domain ← Infra)  │
│  auth, users, organizations, ecommerce, meta, ai, coupons,  │
│  crm, conversations, analytics, reports, notifications,   │
│  commerce, social, growth, branddeals, content,           │
│  intelligence, support                                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  PostgreSQL (Prisma ORM) + Redis (BullMQ, Pub/Sub, rate       │
│  limits, webhook dedup) + S3-compatible storage (future)      │
└─────────────────────────────────────────────────────────────┘
```

### Key architectural rules

- **Loose coupling:** Modules communicate via public application ports or domain events. No deep imports of another module's internals.
- **DDD layering per module:**
  - `presentation/` — Next.js pages, route handlers, server actions.
  - `application/` — use cases, command/query handlers, ports.
  - `domain/` — entities, value objects, domain events, pure business rules (no Prisma/fetch/env).
  - `infrastructure/` — Prisma repositories, external API clients, queue adapters.
- **Repository pattern** for persistence.
- **Event-driven** across module boundaries via the shared event bus (Redis-backed in production, in-memory in dev).
- **Provider/connector extensibility:** e-commerce (`EcommerceConnector`) and AI (`AIProvider`) providers sit behind interfaces. Adding a provider requires only implementing the interface and registering it.

---

## 4. Tech Stack

| Concern | Choice |
|---------|--------|
| Frontend | Next.js 15 App Router, React 19, TypeScript strict, TailwindCSS, ShadCN UI, next-themes |
| Backend | Next.js route handlers + React Server Actions |
| Database | PostgreSQL (Prisma ORM) |
| Cache / Queue / Pub-Sub | Redis (BullMQ, ioredis) |
| Auth | NextAuth.js v5 (Auth.js), JWT sessions, bcrypt, token version invalidation |
| AI | OpenAI GPT-4o-mini via `AIProvider` interface |
| Payments | Stripe subscriptions + promotion codes |
| E-commerce | Shopify Admin REST API (live) + Mock connector (dev) |
| Meta | Meta Graph API + Instagram webhooks (HMAC-SHA256 verified) |
| Observability | JSON logger, `SystemLog`, Sentry, OpenTelemetry |
| Deployment | Docker multi-stage, standalone Next.js output, Fly.io (`app` + `worker` groups) |

---

## 5. Modules and Responsibilities

| Module | Owns |
|--------|------|
| `auth` | User credentials, sessions, password reset, MFA, super-admin OTP, role checks. |
| `users` | User profile, organization membership, role changes, store assignment, GDPR export/delete. |
| `organizations` | Organization lifecycle, stores, tenant guard, plan limits, team invites. |
| `ecommerce` | `EcommerceConnector` framework, Shopify/Mock connectors, product/order/customer sync, coupons. |
| `meta` | Meta Graph API client, inbound webhook verification, outbound messaging. |
| `ai` | `AIProvider` interface, OpenAI adapter, content/trend/competitor generation, `AIUsageGuard`. |
| `coupons` | First-follower and DM campaign coupon orchestration. |
| `crm` | Customer and follower records, `CustomerMemory`, tags/stages. |
| `conversations` | Unified inbox, messages, human takeover/resume. |
| `analytics` | `getMarketingPerformance`, workspace KPIs, competitor tracking, growth dashboard. |
| `reports` | AI-generated weekly/on-demand reports. |
| `notifications` | In-app and email notifications, preference toggles. |
| `support` | Support tickets, admin triage, system logs. |

---

## 6. Data Model (Summary)

Core tables (see `prisma/schema.prisma` for full model):

- `User` — authentication, RBAC role, `organizationId`, optional `storeId` for staff, `deletedAt`, `tokenVersion`.
- `Organization` — tenant boundary, plan/subscription, AI quota counters, `aiRepliesThisMonth`, `aiRepliesResetAt`.
- `Store` — a connected e-commerce or Meta source; `archivedAt`/`deletedAt` for soft lifecycle.
- `Integration` — OAuth/API tokens for Shopify/Meta; `accessToken`/`refreshToken` encrypted at rest.
- `Product` / `Order` / `Customer` / `Coupon` — synced from e-commerce connectors; `externalId` + `storeId` uniqueness.
- `Conversation` / `Message` — DM/comment threads; status `AI_ACTIVE` or `HUMAN_ACTIVE`.
- `Follower` / `Campaign` — first-follower campaign tracking.
- `Notification` / `NotificationPreference` — in-app notifications and per-user/channel settings.
- `SystemLog` / `AuditLog` — structured operational and security-relevant logs.
- `ExportRequest` — GDPR data-export jobs.

---

## 7. Authentication and Authorization

- **NextAuth v5 JWT strategy** with `tokenVersion` invalidation.
- `getCurrentUser()` loads the canonical DB record and verifies `tokenVersion`; password/role/super-admin changes invalidate existing sessions.
- `tenantGuard.assertStoreAccess(user, storeId)` enforces: staff only access `user.storeId`; owners/admins access any store in their organization.
- `requireRole()` / `requireSuperAdmin()` helpers for pages and actions.
- Super admin requires email-based OTP in addition to login.

---

## 8. Key User Flows

### 8.1 Registration and Onboarding
1. `/register` → `registerUserAction` → `UserRegistered` event.
2. `organizations` module auto-creates `Organization` and links owner.
3. `/onboarding` prompts user to create a store (or connect existing source).
4. `completeOnboardingAction` updates the session with new `organizationId`/`tokenVersion`.

### 8.2 Connect E-commerce Store
1. Owner/admin visits `/stores` or `/stores/[storeId]`.
2. Chooses provider and enters credentials.
3. `connectStoreAction` validates hostname/domain and persists encrypted `Integration`.
4. `syncProductsAction` calls `EcommerceConnector.getProducts()` and upserts `Product` records.

### 8.3 Connect Meta
1. Store detail Meta connection form.
2. `connectMetaAction` persists `Integration` with page/IG ID and access token.
3. `/api/meta/webhook` receives verified `MetaMessageReceived`/`MetaFollowReceived`/`MetaCommentReceived` events.

### 8.4 First-Follower Campaign
1. Meta webhook → `crm` records follower and emits `FirstTimeFollowerDetected`.
2. `coupons` module generates a coupon via `ecommerce.generateCoupon` (or local if no live connector).
3. `ai` composes welcome message.
4. `metaService.sendMessage` sends DM with coupon code.
5. `conversations` records the AI message.

### 8.5 AI Reply in Inbox
1. Customer DM/comment → `MetaMessageReceived` event.
2. `conversations` appends customer message.
3. Subscriber calls `ai.generateReply` if conversation status is `AI_ACTIVE` and `AIUsageGuard` allows.
4. AI reply appended; `metaService.sendMessage` attempted.
5. Staff can `takeOver` to set `HUMAN_ACTIVE`; `resumeAI` flips back.

### 8.6 Analytics
1. `getMarketingPerformance(storeId)` fetches live Meta page/media/audience insights and Shopify orders.
2. `attributeOrdersToMedia` attributes orders to the most recent media within a 7-day window.
3. Returns `MarketingPerformanceView` with `dataQuality` (`live`/`partial`/`simulated`) badge.

---

## 9. External Integrations

### E-commerce
- `EcommerceConnector` interface: `fetchStoreInfo`, `getProducts`, `getOrders`, `getCustomers`, `fetchDiscounts`, `generateCoupon`, `disableCoupon`.
- Implemented: `ShopifyConnector` (Admin REST API v2024-01) and `MockConnector` (deterministic dev data).
- Planned: WooCommerce REST API v3, BigCommerce v3/v2, Magento 2 REST V1.

### Meta
- Webhook verification: HMAC-SHA256, constant-time compare, 24-hour payload dedup.
- Graph API: page/account media, per-media insights, audience demographics, outbound messaging.
- Permissions: `instagram_business_basic`, `instagram_business_manage_insights`, `pages_read_engagement`; optional `ads_management`/`ads_read` for ad insights.
- Rate limits: ~200 calls/hour/user; cache aggressively; mark `dataQuality` `partial` on failure.

### OpenAI
- `OpenAIProvider` implements `AIProvider`.
- All AI calls route through `AIUsageGuard` which enforces plan quota.
- Model allowlist, user-message delimiters, output PII redaction.

### Stripe
- Checkout sessions for plan upgrades; webhook fulfillment updates `Organization` subscription.
- SaaS promotion codes (`SaaSCoupon`) validated at checkout.

---

## 10. Deployment and Operations

- **Dockerfile:** multi-stage, non-root, standalone output.
- **Fly.io:** `app` web process + `worker` BullMQ process.
- **Health checks:** `/api/health` (liveness) and `/api/ready` (DB + Redis).
- **Backups:** PostgreSQL `pg_dump`, Redis `BGSAVE`; restore and rollback runbook in `docs/operations.md`.
- **Observability:** Sentry + OpenTelemetry initialized in app and worker; spans around AI, Meta, and Shopify calls.
- **Secrets:** all tokens encrypted at rest; no secrets in logs; `env.ts` validates required production variables.

---

## 11. Current Limitations and Known Gaps

- Only **Shopify** e-commerce connector is live; WooCommerce/BigCommerce/Magento are planned (REQ-0062).
- Analytics `couponsUsed` and strict coupon-to-order attribution are not yet implemented (TASK-0062).
- Out-of-scope UI routes (projects, affiliates, media-kit, brand-deals, UGC growth, revenue, daily-marketing, engagement, orders) have been removed. The remaining navigation is grouped in a collapsible sidebar (Home / Connect / Create / Engage / Analyze / Account).
- Direct Meta content publishing/scheduling is out of scope for MVP.
- Real load/accessibility/penetration testing has not been performed.

---

## 12. Where Work Is Tracked

- **Product charter:** `docs/requirements/REQ-0061-product-charter.md`
- **Implementation specs:** `docs/requirements/REQ-0062-universal-ecommerce-meta-analytics.md`
- **Requirements:** `docs/requirements/REQ-*.md`
- **Tasks:** `docs/tasks/TASK-*.md` (code snippets + references)
- **Trackers:** `docs/trackers/TRACKER-*.md` (progress)
- **Status checker:** `scripts/task-status.ts`
- **Changelog:** `CHANGELOG.md`

---

## 13. Editing This Document

Update this file when:
- A new module, provider, or integration is added.
- A public contract or data model changes.
- A critical user flow changes.
- Deployment, security, or observability behavior changes.

Always pair updates with an entry in `CHANGELOG.md`.
