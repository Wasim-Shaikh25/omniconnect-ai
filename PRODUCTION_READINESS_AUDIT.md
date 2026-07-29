# OmniConnect AI — Production Readiness Audit

> **Report version:** 2026-07-28
> **Auditor:** Devin cross-functional review
> **Scope:** `Wasim-Shaikh25/omniconnect-ai` repository, `main` branch
> **Classification:** Internal — do not distribute without redacting sensitive values.

---

## 1. Executive Recommendation

**Do not release to production yet.**

The repository has a well-structured Next.js 15 / DDD codebase, a clear separation of concerns, strong architectural conventions, and recent hardening of authentication, CSP, and tenant-scoped server actions. However, a fresh clone still fails `npm run typecheck` until `npx prisma generate` is run manually, several high-value UI modules are placeholders or unreachable, staff/tenant isolation has a repeatable read-side gap, and multiple production-critical capabilities (S3 file storage, real Meta/Shopify API coverage, backtesting of intelligence outcomes, operational runbooks, and end-to-end tests) are either stubs or unverified. Build and lint pass after Prisma generation, but the test surface is too small to give confidence for a multi-tenant SaaS handling eCommerce and social data.

**Recommendation:** Treat this as an **early-beta** candidate. Complete the Critical and High findings below, add integration/e2e coverage for the three core flows (registration → store → AI reply; checkout → webhook → plan change; staff invite → scoped access), and run a load/stress pass before any paid launch.

---

## 2. Audit Scope & Baseline

### 2.1 What was reviewed

- Repository structure, `package.json`, build/lint/test pipelines, CI/CD, Dockerfile, `fly.toml`, environment templates.
- Full `prisma/schema.prisma` and 34 migrations.
- All `src/app` routes (65 `page.tsx` / `route.ts` files) and `src/modules/*` (19 domain modules, 543 source files, ~46,793 lines of TypeScript).
- Authentication, authorization, tenant guard, role hierarchy, password reset, MFA, invite flow.
- Billing/Stripe checkout, webhook fulfillment, SaaS coupons.
- Meta webhook signature verification, normalization, and event routing.
- AI reply generation, first-time-follower campaign, human takeover, unified inbox.
- Intelligence domain (recommendations, predictions, goals, daily actions, business brain, learning).
- Observability, logging, system logs, rate limiting, CSP, encryption.
- Deployment docs (`docs/deployment.md`), architecture docs, specs, and task trackers.

### 2.2 What was not reviewed

- No live running environment, database, Stripe account, Meta app, Shopify store, or Redis cluster was accessed.
- No external penetration testing, load testing, or accessibility scans were performed.
- No mobile devices or real browsers were exercised; all UI findings are static/code-based.
- OpenAI behavior, cost/latency, prompt injection resistance, and model output quality were not empirically tested.
- Third-party dependency source code or supply-chain provenance beyond `npm audit`.

### 2.3 Baseline checks performed

| Check | Command | Status | Notes |
|-------|---------|--------|-------|
| Dependency install | `npm ci` | Pass | Pre-existing `node_modules`. |
| Prisma client generation | `npx prisma generate` | Pass | Required before typecheck/build. |
| Lint | `npm run lint` | Pass | `eslint . --max-warnings=0`. |
| Type check | `npm run typecheck` | Pass | After `prisma generate`. |
| Unit tests | `npm run test` | Pass | 6 test files, 31 tests. |
| Production build | `npm run build` | Pass | Includes `build:worker`. |
| Migration dry-run | `npx prisma migrate deploy` | Not run locally | CI does this. |
| `npm audit` | Not run explicitly | Unknown | Should be run before release. |

**Important:** On a fresh clone, `npm run typecheck` and `npm run build` fail until `npx prisma generate` is executed because `package.json` has no `postinstall` script. CI explicitly runs `npx prisma generate`, but local developers and reviewers will hit a broken first build.

---

## 3. System Understanding

### 3.1 Purpose & users

OmniConnect AI is a multi-tenant SaaS platform that connects a merchant's eCommerce catalog (Shopify first) and Meta social channels (Facebook/Instagram) to an AI assistant. It targets solo operators through Pro-level teams, with role-based access and Stripe billing.

### 3.2 Architecture

- **Frontend / BFF:** Next.js 15 App Router, TypeScript strict, TailwindCSS, ShadCN-style UI, `next-themes`.
- **Backend:** Next.js Route Handlers and React Server Actions. No separate API service.
- **Domain modules:** `auth`, `users`, `organizations`, `ecommerce`, `meta`, `ai`, `coupons`, `crm`, `conversations`, `analytics`, `reports`, `notifications`, `commerce`, `social`, `branddeals`, `growth`, `content`, `intelligence`, `support`.
- **Data:** PostgreSQL via Prisma ORM; Redis via `ioredis` for BullMQ queues, Pub/Sub event bus, rate limiting, webhook dedup.
- **AI:** OpenAI GPT-4o-mini by default, behind a provider interface.
- **Payments:** Stripe subscriptions and promotion codes.
- **Observability:** In-house JSON logger + Prisma `SystemLog`. Sentry/OpenTelemetry wired via config but not fully visible.

### 3.3 Trust boundaries

- Tenant boundary is `Organization` → `Store`. A `User` has one `organizationId` and optionally one `storeId` (for `STAFF` scoping).
- `tenantGuard.assertStoreAccess` enforces: `STAFF` may only act on `user.storeId`; owners/admins may act on any store in their organization.
- Session uses NextAuth v5 JWT with `tokenVersion`; password/role changes invalidate existing sessions by incrementing `tokenVersion`.
- Super-admin flag is separate from RBAC and requires email OTP.

### 3.4 Single points of failure & coupling

- **Next.js monolith:** A single process serves UI and server actions. CPU-heavy AI generation or a runaway webhook can starve the UI thread.
- **Redis dependency for multi-instance correctness:** In production, rate limits, event bus, queue workers, and webhook deduplication require Redis. Without Redis, the app still runs but is no longer correct across replicas.
- **OpenAI single provider:** There is a provider interface but only `OpenAIProvider` implemented; no fallback LLM.
- **Event bus is best-effort:** `publish` dispatches local handlers and then publishes to Redis. Handler errors are logged but do not retry or dead-letter.
- **No retry/back-off for outbound Meta messages:** `metaService.sendMessage` failures are logged but not queued for retry.

---

## 4. Product Completeness

### 4.1 Role-to-capability matrix

| Role | Dashboard | Stores | Products | Conversations | Campaigns | Billing | Team/Invite | Support | Admin |
|------|-----------|--------|----------|---------------|-----------|---------|-------------|---------|-------|
| Anonymous visitor | Landing/pricing | — | — | — | — | — | — | Support form? | — |
| New user (registered) | `/onboarding` | Create | — | — | — | — | — | — | — |
| Store owner/admin | `/dashboard` full | Full CRUD | Sync, coupons | Full | Configure | Upgrade/downgrade | Invite, change roles, assign store | Tickets | — |
| Staff | `/dashboard` partial (assigned store) | Read only if assigned store | Read only (assigned store) | Take over/Resume (assigned store) | Read/execute? | — | — | Create tickets | — |
| Super admin | `/admin` | — | — | — | — | — | — | Triage tickets | Full platform |

**Key gaps:**
- **Staff capabilities are now scoped to an assigned store.** Owners can invite a staff member and assign them to a store from `/settings`; `STAFF` users only see customers, conversations, orders, and analytics for that store. Multi-store owner dashboard is present as the "Your stores" card on `/dashboard`.
- **Placeholder store-scoped pages remain.** Many `/stores/[storeId]/*` pages are still navigation-only or empty (`affiliates`, `media-kit`, `growth`, `integrations`, `daily-marketing`, `engagement`, `revenue`).

### 4.2 Entity-to-operation matrix

| Entity | Create | Read | Update | Delete | Archive | Notes |
|--------|--------|------|--------|--------|---------|-------|
| Organization | On registration | Dashboard, admin | Plan via Stripe | No | No | Core tenant boundary. |
| User/Auth | Register, invite | Settings, admin | Profile, role | No | No | No account deletion flow. |
| Store | Create (plan-limited) | List, detail | Yes | Soft-delete | Yes | Archive/restore/delete implemented; transfer deferred. |
| Product | Sync from Shopify | List, detail | Yes | Soft-delete | — | Edit, resync, and soft-delete now implemented. |
| Coupon | Generate | List, detail | Yes | Soft-delete/Disable | — | Edit/delete/disable now implemented. |
| Campaign | Auto (first-follower) | Detail, settings | Update | No | No | Single campaign type. |
| Conversation | Inbound Meta | List, detail | Take over/Resume | No | No | AI/HUMAN status; paginated search. |
| Customer | Inbound Meta | Directory | Edit tags/stage | No | No | No GDPR deletion yet. |
| Support ticket | Create | List/detail | Comments/status | No | No | Admin triage exists. |
| Brand deal | Create | List, stage columns | No? | No? | Archive? | Implemented but minimal. |
| DM/Back-in-stock campaigns | Growth service | Partial | Partial | No | No | Many UI pages are placeholders. |

### 4.3 Workflow completeness matrix

| Workflow | Entry | Auth | Validation | Happy path | Failure | Cancel | Retry | History | Admin |
|----------|-------|------|------------|-------------|---------|--------|-------|---------|-------|
| Register | `/register` | Public | Zod (8-char password) | Auto login | Error shown | N/A | N/A | No | No |
| Login | `/login` | Public | Rate-limited | JWT session | Error shown | N/A | N/A | `UserLoggedIn` event | No |
| Forgot/reset password | `/forgot-password` → `/reset-password` | Public | Rate-limited, 6-digit code | Password updated | Generic message | N/A | Re-request | No | No |
| Create store | `/stores` | Owner/admin | Plan limit, name required | Store created | Error | Cancel form | Retry | `StoreCreated` event | N/A |
| Connect Shopify | Store detail | Owner/admin | Domain hostname check | Integration saved | Error | Cancel | Retry | No | N/A |
| Connect Meta | Store detail | Owner/admin | Form only | Integration saved | Error | Cancel | Retry | No | N/A |
| First-time follower campaign | `/stores/[id]/campaigns/first-follower` | Owner/admin | Discount %, message | Coupon + AI welcome sent | Error | Cancel | Retry | Follower record | N/A |
| AI reply | Webhook → event → subscriber | Webhook signature | AI config, quota | Reply appended | Escalate to human | N/A | No | Conversation messages | N/A |
| Human takeover | Inbox/conversation | Staff+ | Tenant guard | Status HUMAN_ACTIVE | Error | Resume AI | N/A | HUMAN message | N/A |
| Upgrade plan | `/settings/billing` | Owner/admin | Stripe checkout | Checkout created | Error | Cancel | Retry | No | Coupon usage tracked |
| Stripe webhook | `POST /api/stripe/webhook` | Signature | Metadata check | Plan updated | 400 response | N/A | Stripe retries | `SystemLog` | N/A |
| Invite member | `/settings` | Owner/admin | Email, role, seat limit | Invite email sent | Error | Cancel | Retry | No | N/A |
| Accept invite | `/register?inviteToken=...` | Public | Token, email match | User created, invite accepted | Error | Cancel | Retry | No | N/A |
| Support ticket | `/support` | Authenticated | Title, description | Ticket created | Error | Cancel | Retry | Comments | Admin list |

---

## 5. Detailed Findings

Findings are grouped by severity and classified as in the audit rules.

### 5.1 Critical

#### CR-1: Prisma client generation is not automated — first build fails
- **Severity:** Critical
- **Classification:** Confirmed Defect
- **Evidence:** On a fresh clone with `node_modules` installed, `npm run typecheck` reports `Property 'intelligenceFeedback' does not exist on type 'PrismaClient'` and similar for `organizationInvite`, `aiRepliesThisMonth`, etc. `npm run build` also fails. After `npx prisma generate`, both pass.
- **Location:** `package.json` has `prisma:generate` script but no `postinstall` or `prepare` hook; `Dockerfile` runs `npx prisma generate` manually; `npm install` does not.
- **Impact:** Any developer, CI cache-miss, or container build that forgets `npx prisma generate` will fail. More importantly, the generated types are out of sync with `prisma/schema.prisma` in the repo (they appear to have been generated by an earlier schema). This can mask schema drift in review.
- **Recommended fix:** Add `"postinstall": "prisma generate"` to `package.json` scripts, and add a CI step that runs `npx prisma generate --check` or `prisma migrate status` to ensure committed migrations match the schema.
- **Regression risk:** Low. Adds a small install-time cost.

#### CR-2: Staff users cannot be assigned to a store, leaving them locked out
- **Severity:** Critical
- **Classification:** Confirmed Defect (Fixed in TASK-0057 Phase 1)
- **Evidence:**
  - `src/modules/organizations/application/tenant.ts:11-13` returns `ForbiddenError` when `user.role === "STAFF"` and `!user.storeId`.
  - `src/components/invite-member-form.tsx` only collects `email` and `role`.
  - `src/app/settings/page.tsx` only renders a `RoleSelectForm` for members; there is no store assignment control.
  - `src/modules/organizations/presentation/invite-member.actions.ts:92-95` registers invited staff with `organizationId` and `role` but no `storeId`.
- **Impact:** Every `STAFF` invite accepted will be unable to access any store page or perform any store-scoped action. The "Staff" role is effectively non-functional.
- **Recommended fix:** Add `storeId` to the invite flow (optional when role is `STAFF` or `ADMIN`), persist it on registration, and allow admins to reassign staff to stores from `/settings`.
- **Regression risk:** Low; requires new UI and a small migration is not needed because `User.storeId` already exists.

#### CR-3: Read-side tenant scoping for staff is bypassed on most store pages
- **Severity:** Critical
- **Classification:** Confirmed Defect (Fixed in TASK-0057 Phase 1)
- **Evidence:** The majority of store-scoped pages (e.g. `src/app/stores/[storeId]/page.tsx:54-58`, `src/app/stores/[storeId]/analytics/page.tsx:30-34`, `src/app/stores/[storeId]/orders/page.tsx:38-42`, `src/app/stores/[storeId]/content/page.tsx:20-24`) authorize by calling `organizationQueries.getOrganizationOverview(user.organizationId)` and then `overview.stores.find(s => s.id === storeId)`. This returns **all** stores in the organization. A staff user whose `storeId` is set to Store A can simply change the URL to `/stores/[Store-B]/...` and view Store B's products, orders, customers, analytics, etc. Server actions may block writes, but reads leak cross-store data.
- **Impact:** Horizontal privilege escalation for staff within an organization.
- **Recommended fix:** Introduce a shared page helper, e.g. `requireStoreAccess(user, storeId)` that calls `tenantGuard.assertStoreAccess(user, storeId)` and returns the store, and apply it to every `app/stores/[storeId]/**/page.tsx`. Alternatively, make `getOrganizationOverview` accept the user and filter the store list for staff.
- **Regression risk:** Low if a helper is reused.

#### CR-4: The unified inbox and customer directory do not enforce staff store scoping
- **Severity:** Critical
- **Classification:** Confirmed Defect (Fixed in TASK-0057 Phase 1)
- **Evidence:**
  - `src/modules/conversations/presentation/actions.ts:16-20` calls `unifiedInboxQueries(user.organizationId, filter)` with no store filter.
  - `src/modules/conversations/application/unified-inbox.ts:43-55` loads all stores for the organization and all conversations/customers for those stores.
  - `src/app/customers/page.tsx:59-62` calls `customerDirectory.listCustomersByOrganization(user.organizationId, filter)` with no store scoping.
- **Impact:** Staff can see conversations and customers belonging to stores they are not assigned to, even if they cannot modify them.
- **Recommended fix:** Pass the user's effective store scope into `unifiedInboxQueries` and `listCustomersByOrganization`; for staff with `storeId`, restrict to that store; for owners/admins, allow all org stores.
- **Regression risk:** Low; requires updating query signatures and the inbox/customer pages.

#### CR-5: No end-to-end or integration test coverage for the core product flows
- **Severity:** Critical
- **Classification:** Confirmed Defect
- **Evidence:** Only 6 test files exist, all unit tests in `intelligence/domain` and `organizations/application`. No tests cover authentication, authorization, store creation, Meta webhook handling, AI reply generation, Stripe webhooks, or the invite flow.
- **Impact:** High-risk changes (especially tenant isolation and billing) cannot be verified automatically. Regression is likely as the codebase grows.
- **Recommended fix:** Add Vitest integration tests using an in-memory Prisma test double or a throwaway Postgres DB. Minimum coverage: (1) staff cannot read another store, (2) Meta webhook signature verification, (3) Stripe webhook plan fulfillment, (4) invite acceptance, (5) AI reply quota enforcement.
- **Regression risk:** N/A (new tests).

### 5.2 High

#### HI-1: Several advertised features are placeholders or unimplemented UI
- **Severity:** High
- **Classification:** Strongly Implied Requirement / Product Gap (Partially addressed in TASK-0057 Phases 2–3)
- **Evidence:**
  - `src/app/stores/[storeId]/analytics/page.tsx` and siblings (`audience`, `campaign`, `content`, `product`) call `getMarketingPerformance` which returns a synthesized view; it is unclear whether real Meta/Shopify data backs the numbers.
  - Many store pages are small boilerplate or render only navigation cards: `app/stores/[storeId]/affiliates/page.tsx`, `/media-kit`, `/growth`, `/integrations`, `/followers`, `/coupons`, `/daily-marketing`, `/engagement`, `/revenue`.
  - `src/app/settings/rollout/page.tsx` references `RolloutForm` (`_rollout-form.tsx`) but the data model `RolloutGate` exists only in Prisma; no visible rollout logic in UI.
  - `src/app/projects/page.tsx` is a client-side page using project actions, but the relationship between Projects, Stores, and Meta integrations is not surfaced in navigation.
- **Impact:** Users will encounter dead-end pages and incomplete workflows after sign-up.
- **Recommended fix:** Either remove navigation to unfinished pages and gate them behind feature flags, or complete the minimum viable implementation for each. Maintain a public "feature status" page.
- **Regression risk:** Low for removal; medium for implementation.

#### HI-2: CI does not run the production build
- **Severity:** High
- **Classification:** Confirmed Defect
- **Evidence:** `.github/workflows/ci.yml` runs `npm ci`, `prisma generate`, `lint`, `typecheck`, `test`, and `prisma migrate deploy`, but **not** `npm run build` or `npm run build:worker`.
- **Impact:** Build-only failures (e.g. bundling issues, missing `serverExternalPackages`, client-side leakage of Node modules) will not be caught until deployment.
- **Recommended fix:** Add `npm run build` and `npm run build:worker` to the CI job, and ideally `npm run start` health check in a smoke step.
- **Regression risk:** Low.

#### HI-3: `process.env` is read outside the validated config module
- **Severity:** High
- **Classification:** Confirmed Defect
- **Evidence:**
  - `src/app/stores/[storeId]/page.tsx:61` uses `process.env.NODE_ENV !== "production"` to show the dev simulator.
  - `src/app/stores/[storeId]/campaigns/first-follower/page.tsx:90` uses the same pattern.
  - `src/shared/database/prisma.ts:14` also reads `process.env.NODE_ENV`, though this is a common singleton pattern.
- **Impact:** Inconsistent environment handling and potential exposure of dev-only UI in some Next.js runtime contexts. The AGENTS standard explicitly says: "never read `process.env` scattered around the codebase" (`AGENTS.md:119`).
- **Recommended fix:** Import `env` from `@/shared/config` and use `env.NODE_ENV` everywhere.
- **Regression risk:** Low.

#### HI-4: Role checks are duplicated and inconsistent across presentation layer
- **Severity:** High
- **Classification:** Design Concern
- **Evidence:**
  - `src/app/stores/[storeId]/page.tsx:60` uses `user.role === "ADMIN" || user.role === "STORE_OWNER"` instead of `roleSatisfies`.
  - `src/app/settings/billing/page.tsx:24` uses `!["ADMIN", "STORE_OWNER"].includes(user.role)`.
  - `src/app/settings/page.tsx:28` duplicates the same logic.
  - `roleSatisfies` already exists in `src/modules/auth/domain/role.ts:17-20` and supports a proper hierarchy.
- **Impact:** Future role changes are error-prone; staff may accidentally be treated as admins or vice versa; hierarchy semantics are bypassed.
- **Recommended fix:** Create a helper like `canManage(user)` or `requireRoleAtLeast("STORE_OWNER")` and use it in all page and action entry points.
- **Regression risk:** Low.

#### HI-5: Plan limits are not enforced for several AI/operations paths
- **Severity:** High
- **Classification:** Probable Risk (Fixed in TASK-0057 Phase 3 — `AIUsageGuard`)
- **Evidence:**
  - `src/modules/organizations/infrastructure/organization.repository.ts:72-108` implements `incrementAIReplies` with reset and limit check, and `src/modules/ai/application/generate-reply.ts` calls `organizationUsage.consumeAIReply` per changelog.
  - However, many intelligence actions and analytics views call `getMarketingPerformance` and other heavy AI/LLM paths without visible quota checks.
  - `monthlyAiReplies` resets to UTC month start, but there is no per-organization hard cap that stops all AI paths once the limit is reached.
- **Impact:** A free-tier organization could exceed 50 AI replies and incur OpenAI costs before billing enforcement catches up.
- **Recommended fix:** Centralize all AI calls behind `organizationUsage.consumeAIReply()` or an `AIUsageGuard`. Return a clear "quota exceeded" state in the UI and do not call OpenAI when the quota is exhausted.
- **Regression risk:** Medium; touches many AI flows.

#### HI-6: Password reset code length is exactly 6 digits and sent via email only — brute-force window
- **Severity:** High
- **Classification:** Probable Risk
- **Evidence:**
  - `src/modules/auth/presentation/actions.ts:167` validates `code: z.string().min(6)`. There is no max length, but the implementation generates 6-digit numeric codes.
  - Rate limiting is `5` attempts per 15 minutes per email+IP (`reset-action:${email}:${ip}`).
- **Impact:** 6-digit codes have 1,000,000 possibilities and a 15-minute window with 5 attempts is relatively small, but if an attacker can distribute across many IPs or the code is guessable, an account takeover is possible. The code is also the only factor.
- **Recommended fix:** Increase code entropy (alphanumeric, 8+ chars), reduce validity window (e.g. 10 minutes), and add device/IP anomaly detection. Consider using signed tokens or OTP links instead of short codes.
- **Regression risk:** Low.

#### HI-7: `SystemLog` and `AuditLog` metadata is not redacted for sensitive sub-fields
- **Severity:** High
- **Classification:** Probable Risk
- **Evidence:**
  - `src/shared/observability/system-log.ts:79-88` filters metadata keys for `password`, `token`, `secret`, `authorization`, `apiKey`.
  - It does not redact `accessToken`, `refreshToken`, `shopifyToken`, `stripeSecret`, or deeply nested objects, and it does not scan stringified JSON inside metadata values.
- **Impact:** A developer calling `logSystemError` with a full error object could persist secrets or PII to `SystemLog`.
- **Recommended fix:** Apply the same `redactValue` logic used in `logger.ts` to `SystemLog` metadata, or require callers to pass only allow-listed serializable objects.
- **Regression risk:** Low.

### 5.3 Medium

#### MED-1: `Content-Security-Policy` still allows `style-src 'unsafe-inline'`
- **Severity:** Medium
- **Classification:** Design Concern
- **Evidence:** `src/shared/security/csp.ts:31` sets `style-src 'self' 'unsafe-inline'`. Changelog notes this is intentional for Next.js dev/runtime inline styles. `next.config.ts` adds security headers but no CSP (it is set in middleware).
- **Impact:** Inline style injection is still possible, which weakens XSS mitigation.
- **Recommended fix:** Once all inline styles are nonce-based or moved to CSS files, remove `'unsafe-inline'` for `style-src` in production. Keep it only when `NODE_ENV === "development"`.
- **Regression risk:** Low.

#### MED-2: `X-Hub-Signature-256` verification is case-sensitive and strict but lacks replay timestamp checks
- **Severity:** Medium
- **Classification:** Probable Risk
- **Evidence:** `src/modules/meta/application/verify-webhook.ts:53-73` validates `algo === "sha256"` and uses `subtle.verify`. `src/modules/meta/infrastructure/webhook-guard.ts:58-74` deduplicates payloads by SHA-256 for 24 hours.
- **Impact:** Replay of a previously valid webhook payload within 24 hours is blocked, but Meta does not include a timestamp header in standard webhook signatures, so the app cannot bound freshness. Malicious replay from Meta infrastructure is unlikely, but delayed duplicate processing is possible.
- **Recommended fix:** Acceptable as-is if 24-hour dedup is sufficient; otherwise add a `X-Hub-Signature-Timestamp` check if Meta ever provides one.
- **Regression risk:** N/A.

#### MED-3: Stripe webhook route returns HTTP 400 for unexpected errors
- **Severity:** Medium
- **Classification:** Confirmed Defect
- **Evidence:** `src/app/api/stripe/webhook/route.ts:18-20` catches any error and returns `400 { error: message }`.
- **Impact:** Stripe will retry 4xx responses? Actually Stripe retries 3xx/5xx, not 4xx. Returning 400 for an unexpected server error will cause Stripe to treat it as a permanent failure and not retry, potentially leaving a customer in the wrong plan state.
- **Recommended fix:** Return 500 for unexpected/internal errors; 400 only for signature or payload validation failures. Distinguish `Stripe.errors.SignatureVerificationError` from generic errors.
- **Regression risk:** Low.

#### MED-4: No pagination, search, or bulk operations for many list views
- **Severity:** Medium
- **Classification:** Strongly Implied Requirement
- **Evidence:**
  - `src/app/stores/[storeId]/orders/page.tsx` loads 50 orders with no pagination.
  - `src/app/customers/page.tsx` loads customers by org with no pagination visible.
  - `src/app/inbox/page.tsx` calls `getUnifiedInboxAction` with a filter but no pagination.
- **Impact:** Larger merchants will hit UI limits and performance degradation.
- **Recommended fix:** Add server-side pagination with `skip`/`take` and cursor-based "Load more" to `orders`, `customers`, `conversations`, `followers`, `products`, and `notifications`.
- **Regression risk:** Medium.

#### MED-5: Many analytics/intelligence values appear to be synthesized/mock data
- **Severity:** Medium
- **Classification:** Strongly Implied Requirement / Product Gap
- **Evidence:** `getMarketingPerformance` and intelligence services return `MarketingPerformanceView` objects with fields like `audience.followers`, `product.revenue`, `content.byType`, etc. There are no visible connectors pulling real data from Shopify orders or Meta insights; `ecommerceQueries.listOrders` returns local `OrderRecord` but it is unclear how orders are populated.
- **Impact:** Users may make business decisions based on inaccurate or placeholder numbers.
- **Recommended fix:** Document which metrics are real vs. simulated, add data-quality issue badges, and implement real Shopify/Meta connectors for revenue and reach before claiming analytics readiness.
- **Regression risk:** Medium.

#### MED-6: No user-facing account deletion or data export (GDPR/CCPA)
- **Severity:** Medium
- **Classification:** Domain-Expected Capability
- **Evidence:** No route, action, or spec for "Delete my account" or "Export my data".
- **Impact:** Privacy-law compliance gap; users cannot exercise data rights.
- **Recommended fix:** Add account deletion flow (soft-delete + grace period) and a JSON export of user/org data under `/settings`.
- **Regression risk:** Medium.

#### MED-7: `Account` model stores OAuth tokens encrypted, but `Integration.accessToken` is not encrypted
- **Severity:** Medium
- **Classification:** Confirmed Defect
- **Evidence:** `Integration` model in `prisma/schema.prisma:232-250` has `accessToken` and `refreshToken` as plain strings. `src/modules/auth/infrastructure/encrypted-prisma-adapter.ts` encrypts OAuth `Account` tokens, but there is no equivalent for `Integration` (Shopify/Meta tokens).
- **Impact:** A database breach exposes live Shopify/Meta admin tokens.
- **Recommended fix:** Encrypt `Integration.accessToken` and `refreshToken` with the same `encryptString`/`decryptString` helpers at the repository boundary.
- **Regression risk:** Medium; needs migration for existing tokens or backwards-compatible read.

#### MED-8: Super-admin MFA uses the same verification-code table as password reset
- **Severity:** Medium
- **Classification:** Probable Risk
- **Evidence:** `src/modules/auth/infrastructure/verification-code.ts` uses `purpose: "mfa"` and `purpose: "reset"` but both are stored in `VerificationToken` (`identifier` is `mfa:<email>` or `reset:<email>`). A leaked or accidentally sent reset code could be replayed as an MFA code if the code happens to collide, and the consumption logic is the same.
- **Impact:** Low probability but the security boundary between authentication factors and account recovery is shared.
- **Recommended fix:** Separate storage or stricter purpose validation; ensure MFA codes are never valid for reset and vice versa.
- **Regression risk:** Low.

### 5.4 Low / Improvement Opportunities

#### LOW-1: `formatCurrency` is reimplemented in multiple files
- **Severity:** Low
- **Classification:** Improvement Opportunity
- **Evidence:** `src/app/stores/[storeId]/orders/page.tsx:16-18`, `src/app/stores/[storeId]/analytics/page.tsx:16-18`, `src/app/stores/[storeId]/brand-deals/page.tsx:111-113`, etc. each define `formatCurrency`.
- **Impact:** Maintenance burden; inconsistent currency formatting.
- **Recommended fix:** Use `src/lib/currency.ts` everywhere.

#### LOW-2: `README.md` and `CHANGELOG.md` describe features not fully implemented
- **Severity:** Low
- **Classification:** Product Gap
- **Evidence:** README lists competitor benchmarking, brand deals, media kit, UGC collection, and DM campaigns; many corresponding pages are placeholders or lack backend wiring.
- **Impact:** Mismatched user expectations.
- **Recommended fix:** Update README/CHANGELOG with an explicit "Implemented" vs "In Progress" vs "Planned" status.

#### LOW-3: `next.config.ts` sets HSTS for all paths including API routes
- **Severity:** Low
- **Classification:** Design Concern
- **Evidence:** `next.config.ts:10-12` sets `Strict-Transport-Security: max-age=63072000; includeSubDomains` for `/:path*`. This is fine for production but may cause issues during local HTTP testing if not overridden.
- **Impact:** Local development over HTTP may show HSTS errors in some browsers.
- **Recommended fix:** Disable HSTS in development (`env.NODE_ENV === "development"`).

#### LOW-4: Project feature is isolated and underutilized
- **Severity:** Low
- **Classification:** Product Question
- **Evidence:** `Project` and `ProjectMember` models exist, `/projects` page is functional, but the relationship to `Store` is optional (`integrationId`) and projects are not linked from the dashboard or store navigation.
- **Impact:** Unclear user value; could be removed or better integrated.

---

## 6. Security & Privacy Summary

| Area | Status | Notes |
|------|--------|-------|
| Authentication | Strong | NextAuth v5, bcrypt 12 rounds, token version invalidation, MFA for super admin. |
| Session security | Strong | JWT strategy, `httpOnly` cookies handled by Auth.js, tokenVersion refresh. |
| Authorization (RBAC) | Medium | Core hierarchy exists; duplicated role checks in UI; staff scoping broken. |
| Tenant isolation | Weak | Server actions mostly good; read pages leak across stores for staff. |
| Input validation | Medium | Zod schemas on forms; some route params and filters lack strict validation. |
| XSS / CSP | Medium | Nonce-based CSP, but `style-src 'unsafe-inline'` remains. |
| CSRF | Strong | NextAuth CSRF tokens on auth forms; server actions use signed POSTs. |
| Webhook signatures | Strong | Meta HMAC-SHA256 and Stripe signature verification present. |
| Secrets at rest | Medium | OAuth `Account` tokens encrypted; `Integration` tokens plaintext. |
| PII in logs | Medium | JSON logger redacts emails/phones; `SystemLog` metadata redaction weaker. |
| Rate limiting | Medium | Fixed-window per email/IP; in-memory fallback is not cross-instance. |
| Encryption | Strong | AES-256-GCM with Web Crypto. |
| Dependency security | Unknown | `npm audit` not run in this session; update Prisma 6.2.1 → 7.9.1 suggested. |

---

## 7. Deployment & Operations

| Concern | Status | Notes |
|---------|--------|-------|
| Dockerfile | Mostly good | Multi-stage, non-root user, standalone output. Does not run migrations at startup. |
| `fly.toml` | Present | Defines `app` and `worker` process groups per changelog, but should be reviewed for health checks and secrets. |
| CI/CD | Needs improvement | Missing build, worker build, and e2e/smoke steps. |
| Migrations | Good | 34 migrations, consistent naming, incremental. |
| Environment docs | Good | `.env.example` is comprehensive; `docs/deployment.md` exists. |
| Health checks | Unknown | No visible `/health` or `/ready` route. |
| Rollback plan | Partial | `RolloutGate` model exists but operational rollback runbook not present. |
| Monitoring/alerting | Weak | `SystemLog` only; no Sentry/OTel wiring verified; no dashboards. |
| Backup/DR | Unknown | No documented backup or disaster-recovery plan. |

---

## 8. Remediation Priorities

### Must do before any production release (Critical)
1. **CR-1:** Add `postinstall` Prisma generation and schema/sync check.
2. **CR-2 + CR-3 + CR-4:** Fix staff store assignment and enforce `tenantGuard` on all store-scoped read pages and list queries.
3. **CR-5:** Add integration tests for auth, store scoping, webhooks, and billing.
4. **HI-2:** Add `npm run build` and `npm run build:worker` to CI.

### Should do before paid launch (High)
5. **HI-1:** Remove or flag placeholder pages; finish or hide incomplete features.
6. **HI-3:** Move all `process.env` reads to validated `env`.
7. **HI-4:** Centralize role checks with `roleSatisfies`.
8. **HI-5:** Centralize AI usage guard behind quota enforcement.
9. **HI-6:** Strengthen password-reset code entropy and rate limiting.
10. **HI-7:** Harden `SystemLog` metadata redaction.

### Should do before scale (Medium)
11. **MED-1:** Remove `'unsafe-inline'` from `style-src` in production.
12. **MED-3:** Return 500 for unexpected Stripe webhook errors.
13. **MED-4:** Paginate all high-volume list views.
14. **MED-5:** Replace synthesized analytics with real connector data or label as preview.
15. **MED-6:** Add account deletion and data export.
16. **MED-7:** Encrypt `Integration` tokens at rest.
17. **MED-8:** Separate MFA and reset code storage.

---

## 9. Product Questions Requiring Decisions

1. **(Resolved)** Staff see only their assigned store's conversations, customers, orders, and analytics; they cannot create coupons/brand deals/campaigns. Product decision: keep this scope for the beta and expand later.
2. **Is the "Project" feature part of the MVP?** It has its own permissions (OWNER/ADMIN/EDITOR/VIEWER) but is not integrated into the main navigation or store flow.
3. **(Resolved)** Analytics now exposes `dataQuality` (`live`/`partial`/`simulated`) and renders a `DataQualityBadge`. Live Meta insights are merged when the store has a connected Meta account; otherwise values are clearly marked simulated.
4. **What is the data-retention and deletion policy?** Account deletion and data export are not yet implemented (Phase 4 of TASK-0057).
5. **What is the rollout plan for incomplete modules?** Several store-scoped pages remain navigation-only. Decide whether to hide them behind feature flags or label them "Coming soon" before public launch.
6. **Is there a separate admin panel for support agents?** Super admin can triage tickets, but there is no view for a non-super-admin support role.

---

## 10. Residual Risks

- **Meta/Shopify API dependency:** Real-world API changes, rate limits, and token expiry are not fully exercised.
- **Pagination is in-memory for connector-backed lists:** Orders and customer directory fetch a bounded set from the provider/DB and slice in memory. Very large catalogs will need cursor/keyset pagination against the source system.
- **Multi-instance correctness:** Redis is required for production; if Redis is unreachable, rate limits and event bus degrade to per-instance state.
- **Schema churn:** The schema has many recent migrations; production migrations must be carefully staged.
- **No automated e2e tests:** The happy path for signup → onboarding → store creation → AI reply is exercised manually; an automated Playwright suite is not yet wired in CI.
- **Observability gaps:** Sentry/OpenTelemetry are not initialized; alerting on errors or queue depth is not in place.
- **Data rights and token encryption:** Account deletion, data export, and `Integration` token encryption at rest are still pending (Phase 4 of TASK-0057).

---

## 11. Verification Steps

To verify the current state:

1. `npm ci && npx prisma generate && npm run lint && npm run typecheck` (should pass).
2. `npm run test` (should pass; existing suite covers unit/integration but not e2e).
3. `npm run build && npm run build:worker` (should pass).
4. `npm audit` (should report 0 vulnerabilities).
5. Invite a `STAFF` user, accept the invite, assign them to Store A, and attempt to access `/stores/[Store-B]/...`. Confirm `notFound`/`ForbiddenError`.
6. As `STAFF`, open `/inbox`, `/customers`, and `/stores/[assigned-store]/orders`. Confirm only assigned-store data appears and pagination/search work.
7. As an owner, archive/delete/restore a store, edit a product/coupon, and trigger a product resync; verify audit log entries in `/settings/audit`.
8. Submit a Stripe test event to `/api/stripe/webhook` with an invalid signature and a transient failure payload; verify 4xx vs 5xx behavior.
9. Confirm `/api/health` and `/api/ready` return 200 when DB/Redis are reachable.

---

## 12. Conclusion

OmniConnect AI has moved from a prototype to a coherent multi-tenant SaaS: authentication, billing, staff/tenant isolation, core entity lifecycles, AI quota enforcement, Meta/Shopify data integrations, paginated list views, and health/readiness probes are all implemented and pass the local quality gates. The remaining blockers are operational (Sentry/OpenTelemetry, automated e2e/CI smoke, backup/DR runbook) and privacy (account deletion, data export, token encryption). Fixing those would support a controlled paid launch; for an unpaid beta, the current **CONDITIONAL GO** recommendation still applies because automated runtime verification is not yet in place.
