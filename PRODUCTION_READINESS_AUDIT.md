# OmniConnect AI — Production Readiness Audit

> **Report version:** 2026-07-30 (**audit pass 2**)
> **Auditor:** Cross-functional review (Principal Engineer, Security, QA, DevOps/SRE, DBA, PM, UX, Accessibility, Performance)
> **Repository:** `Wasim-Shaikh25/omniconnect-ai`
> **Commit audited:** `06395c4` (unchanged since pass 1; `origin/main` has not moved)
> **Branch:** `claude/production-readiness-audit-mc9a3m`
> **Classification:** Internal — redact before external distribution.

**Pass history**

| Pass | Date | New Critical | New High | Outcome |
|---|---|---|---|---|
| 1 | 2026-07-29 | 2 | 8 | NO-GO |
| 2 | 2026-07-30 | 0 | **3** | NO-GO — see §1.7 stopping rules |

Pass 2 re-baselined against unchanged code and deliberately targeted areas pass 1 covered
thinly: deployment and rolling-release safety, migration reversibility, background-job
lifecycle, SSRF, injection, secret scanning, and UI failure states. It preserved all pass-1
findings, reopened none, created no duplicates, and added **3 High** + **3 Medium** + **1 Low**.

---

## 1. Executive Summary

### 1.1 Recommendation

# 🔴 CONTINUE — NO-GO

This release must not go to production in its current state. Two **Critical**, release-blocking
defects were reproduced empirically against a running build of this exact commit:

1. **Authentication is completely non-functional on the project's own documented deployment
   path** (Fly.io / Docker). NextAuth v5 rejects every auth request with `UntrustedHost`
   because `trustHost` / `AUTH_TRUST_HOST` is configured nowhere in the repository.
2. **Every domain event is processed twice on the publishing instance**, because
   `RedisEventBus.publish()` dispatches handlers locally *and* re-receives its own Redis
   Pub/Sub message. In production this means duplicate AI replies sent to real customers,
   duplicate coupons, and duplicated OpenAI spend.

Neither is a theoretical risk. Both were reproduced and are documented with exact commands and
output in §4.

Pass 2 added three further release-blocking High findings: an **authenticated SSRF** reachable from
the store-connect form (H9), **background jobs that never retry and never get pruned** (H10), and
**no graceful shutdown**, so every deploy destroys in-flight work (H11).

This is not a verdict on the codebase as a whole. The architecture is genuinely good — clean DDD
layering, a real tenant guard that **I verified holds under cross-tenant probing**, correct security
headers, a nonce-based CSP, no XSS or SQL-injection surface, clean forward-compatible migrations
with zero drift, no committed secrets, and a green lint/typecheck/test/build pipeline. The synchronous
request path is in good shape.

The weakness is concentrated and it is structural: **the asynchronous and deployment layers have no
reliability guarantees at all** (§4 pattern S1), and defensive rigour is applied inconsistently
between sibling implementations (§4 pattern S2). Individually most fixes are small — the Phase 1 list
is roughly two engineer-weeks including tests. But pass 1's estimate that this was "days of work"
was too optimistic: with 11 blockers, a systemic async-reliability gap, 11 of 21 deployment-readiness
requirements failing, and stopping-rule gate 8 unmet, the honest path to **CONDITIONAL GO** is Phase 1
plus Phase 2 plus one further verification pass (§5 Phase 0) — weeks, not days.

### 1.2 Finding count by severity

| Severity | Pass 1 | New in pass 2 | Total | Release-blocking |
|----------|--------|---------------|-------|------------------|
| 🔴 Critical | 2 | 0 | **2** | Yes — both |
| 🟠 High | 8 | **3** (H9–H11) | **11** | Yes — 9 of 11 |
| 🟡 Medium | 12 | 3 (M13–M15) | **15** | No (pre-launch recommended) |
| 🔵 Low | 6 | 1 (L7) | **7** | No |
| **Total** | 28 | **7** | **35** | **11 blockers** |

**Disposition summary**

| Disposition | Count | Findings |
|---|---|---|
| Open — Release Blocker | 11 | C1, C2, H1–H6, H9, H10, H11 |
| Open — Required Before Release | 9 | H8, M1, M2, M5, M6, M11, M12, M13, M14 |
| Needs Product Decision | 3 | H7, M3, M15 |
| Scheduled Post-Release | 11 | M4, M7, M8, M9, M10, L1–L7 (L-series) |
| Verified (previous finding, now invalid) | 1 | See §2.5 note — the pass-1-era "fresh clone fails typecheck" finding |

No pass-1 finding was reopened, reworded, or split. No finding was closed in pass 2 — the code
is byte-identical to pass 1, so every pass-1 finding remains open on unchanged evidence.

### 1.3 Major technical risks

- **Deployment-blocking auth misconfiguration** (C1) — a first-boot failure on the documented path.
- **Non-idempotent side effects across the board** (C2, H2, H6, H7) — the event bus double-fires,
  the Stripe webhook has no `event.id` dedup, the Shopify abandoned-cart event fires on every
  cart edit, and no side-effecting handler carries an idempotency key. Customer-visible
  consequences: duplicate DMs, duplicate coupons, double-counted coupon redemptions.
- **Fragile startup** (H1) — an unguarded, non-essential seeding call in `instrumentation.ts`
  means a transient database blip during a rolling deploy prevents the process from serving
  *any* request, including `/api/health`.
- **Billing state is a one-way door** (H3) — an organization pushed to `past_due` by a failed
  invoice never returns to `active`, because `invoice.payment_succeeded` is not handled.
- **Test coverage is far too thin for the risk class** (H8) — 43 tests across 9 files against 524
  source files, with **zero** tests covering authentication, the tenant guard, RBAC, billing
  fulfillment, or any webhook. Every Critical and High finding in this report is in code with no
  test coverage at all.

### 1.4 Major product risks

- The **Projects** feature (2 database models, a repository, 6 server actions, an application
  service) has **no user interface whatsoever** and its "archive" operation is a hard delete.
- **65 of 88 declared domain events have no subscriber.** Several represent advertised
  capabilities — abandoned-cart recovery is published but nothing consumes it.
- **Shopify's mandatory GDPR webhooks are absent**, which blocks Shopify App Store listing, as is
  `app/uninstalled` handling (leaving dead integrations with stale tokens).

### 1.5 Scope limitations

This audit is **static analysis plus live runtime testing of a locally built production bundle**.
It is *not* a penetration test, load test, or browser-based accessibility audit. See §2.7 for the
full list of what was and was not exercised.

### 1.6 New risks identified in pass 2

Pass 2's focus on deployment and background-job lifecycle exposed a coherent theme that pass 1
under-weighted: **the asynchronous and deployment layers have no reliability guarantees at all.**

- **Authenticated SSRF (H9).** Any STORE_OWNER can point the "WooCommerce base URL" field at
  `http://169.254.169.254/` (cloud metadata), `http://127.0.0.1:6379` (Redis), or any private
  address, and the server will issue the request. Validation is `z.string().max(255)`. This is a
  genuine new attack surface, not a variant of anything in pass 1.
- **Background jobs never retry and never get cleaned up (H10).** `queue.add(name, data)` passes
  no options, so BullMQ defaults apply: `attempts: 1` (a failed job is lost) and no
  `removeOnComplete` (completed jobs accumulate in Redis forever). Both verified empirically.
- **No graceful shutdown anywhere (H11).** `closeWorkers()` and `closeQueues()` are defined and
  never called; no `SIGTERM` handler exists. Every deploy kills in-flight jobs. The worker's
  `setInterval` heartbeat also keeps a process alive after its BullMQ connection dies, so a dead
  worker looks healthy.

Taken together with C2 and H6 from pass 1, **every asynchronous path in this system is
fire-and-forget**: events double-fire, jobs never retry, jobs are killed mid-flight on deploy, and
nothing is durable. That is a systemic pattern, recorded in §4 as a cross-cutting observation.

### 1.7 Stopping rules assessment

Evaluated against the ten release gates:

| Gate | Met | Note |
|---|---|---|
| 1. No open Critical findings | ❌ | C1, C2 open |
| 2. No release-blocking High findings | ❌ | 9 open |
| 3. Critical journeys pass end to end | ❌ | Login fails entirely on the documented deploy path (C1) |
| 4. Auth / authz / tenancy / sensitive data verified | 🟡 | Tenant isolation and admin authz **verified passing**; H4 and H9 open |
| 5. Build, tests, migrations, deploy, monitoring, backup, rollback gates pass | ❌ | Build/tests/migrations pass; deploy, backup, and rollback gates do not exist (M12) |
| 6. Product gaps implemented, deferred, or decided | ❌ | 6 open product decisions (§3.6) |
| 7. Remaining risks have documented impact and disposition | ✅ | §1.2, §6.1 |
| 8. **Two consecutive passes with no new Critical/High/systemic findings** | ❌ | **Pass 2 added 3 High and 1 systemic pattern** |
| 9. Remaining findings mainly low-risk | ❌ | 11 blockers |
| 10. Another pass unlikely to change the decision | ❌ | Pass 2 changed it materially |

**Gate 8 is the decisive one.** The purpose of requiring two clean consecutive passes is to
establish that the defect surface has stabilised. It has not: a second pass over *unchanged code*,
looking at different areas, produced three more High findings. The reasonable inference is that
further unexamined areas still hold defects of similar severity — the areas named in §6.1 as
untested (load, penetration, real integrations, restore) are the obvious candidates.

**A third pass is warranted, but not as another general audit.** Its objective is defined in §5,
Phase 0: verify the Phase 1 fixes with the named tests, then audit only the four areas pass 2
could not reach — live third-party integration behaviour, load/concurrency, restore/DR, and
machine-verified accessibility.

### 1.8 Release conditions

Ship only when all of the following hold:

1. C1, C2, H1–H6, and H9–H11 are fixed **and** each has a regression test that fails against the
   current commit before the fix.
2. A staging deployment on the real target platform completes: register → verify → connect store
   → receive webhook → AI reply → checkout → plan change, with **exactly one** of each side effect.
3. A rolling deploy is performed **with jobs in flight** and no job is lost or duplicated.
4. A rollback procedure is documented and rehearsed once, including a post-migration rollback.
5. Alerting exists on webhook failure rate, event-handler error rate, BullMQ failed-queue depth,
   Redis memory growth, and `/api/ready`.
6. One further audit pass (§5 Phase 0) reports no new Critical or High findings.

---

## 2. System and Audit Overview

### 2.1 What the product is

A multi-tenant SaaS platform connecting a merchant's eCommerce catalogue (Shopify first) and Meta
channels (Instagram/Facebook) to an AI assistant that automates DMs, comments, coupons, content
ideas, and marketing analytics. Free / Starter ($4.99) / Pro ($9.99) plans billed via Stripe.

### 2.2 Architecture

- **Runtime:** Next.js 15.5.21 App Router (standalone output), React 19, TypeScript strict.
- **Structure:** DDD — 19 domain modules, each layered
  `presentation → application → domain ← infrastructure`.
- **Data:** PostgreSQL via Prisma 6.2.1 (1,906-line schema, 40 migrations).
- **Async:** BullMQ + Redis queues; a Redis Pub/Sub event bus; a separate worker process.
- **Auth:** NextAuth v5 beta (JWT sessions) with `tokenVersion` revocation; RBAC
  `ADMIN > STORE_OWNER > STAFF`; a separate `isSuperAdmin` platform flag gated by email OTP.
- **Integrations:** OpenAI (behind a provider interface), Meta Graph API + webhooks, Shopify
  (plus WooCommerce/BigCommerce connectors), Stripe.
- **Observability:** structured JSON logger with PII redaction, Prisma `SystemLog`, Sentry,
  OpenTelemetry.

### 2.3 Trust boundaries

```
Anonymous ──► /, /login, /register, /pricing, /support, /forgot-password, /reset-password
                       │
Authenticated ─────────┼──► Organization (tenant root)
                       │        └── Store (sub-tenant; STAFF pinned to one store)
                       │
Super admin ───────────┴──► /admin/*  (isSuperAdmin flag + email OTP at login)

Unauthenticated inbound: /api/meta/webhook (HMAC-SHA256 + replay dedup)
                         /api/shopify/webhooks (HMAC-SHA256, no dedup)
                         /api/stripe/webhook (Stripe signature, no dedup)
                         /api/health, /api/ready (no auth — see M1)
```

### 2.4 Scope reviewed

| Area | Coverage |
|------|----------|
| Routes | 61 `page.tsx`, 8 `route.ts`, 2 layouts, `middleware.ts` — all enumerated |
| Server actions | 24 files, 168 exported actions — guard coverage measured on all |
| Domain modules | All 19 |
| Database | Full `schema.prisma`; all 40 migrations applied and diffed |
| Security | Auth, session, tenant guard, RBAC, CSP, headers, rate limiting, encryption, webhook signatures |
| Billing | Checkout creation, webhook fulfillment, coupon usage, plan lifecycle |
| Infrastructure | `Dockerfile`, `fly.toml`, `deploy.sh`, `.github/workflows/ci.yml`, `.env.example` |
| Docs | `AGENTS.md`, `README.md`, `docs/deployment.md`, requirements/tasks/trackers |

### 2.5 Commands executed and results

All commands run against commit `06395c4` on Node v22.22.2 / npm 10.9.7.

| # | Check | Command | Result |
|---|-------|---------|--------|
| 1 | Install | `npm ci` | ✅ Pass (0 vulnerabilities) |
| 2 | Typecheck (fresh clone) | `npx tsc --noEmit` | ✅ **Pass** — see note below |
| 3 | Lint | `npm run lint` | ✅ Pass (`--max-warnings=0`) |
| 4 | Unit tests | `npm run test` | ✅ Pass — 9 files, 43 tests, 2.06s |
| 5 | Build | `npm run build` | ✅ Pass (40 routes; incl. `build:worker`) |
| 6 | Dependency audit | `npm audit --audit-level=low` | ✅ **0 vulnerabilities** |
| 7 | Migrations | `npx prisma migrate deploy` | ✅ All 40 applied cleanly |
| 8 | Schema drift | `npx prisma migrate diff … --exit-code` | ✅ "No difference detected" |
| 9 | Runtime boot | `node .next/standalone/server.js` (NODE_ENV=production) | ⚠️ Boots, **auth 500s** → C1 |
| 10 | Health / readiness | `GET /api/health`, `/api/ready` | ✅ 200 / 200 (leaks internals → M1) |
| 11 | Security headers | `curl -D -` on `/login` | ✅ All 6 present + CSP nonce |
| 12 | Cross-tenant probe | 7 routes, tenant A → tenant B's store | ✅ **No data leak** (status wrong → M7) |
| 13 | Admin authz probe | 6 admin routes as non-admin, full + RSC | ✅ **No data leak** (status wrong → M7) |
| 14 | Login rate limit | 8 bad logins then correct password | ✅ Limiter engages |
| 15 | Event bus dedup | Isolated repro against live Redis | ❌ **1 event → 2 handler runs** → C2 |
| 16 | DB-down boot | Server start with Postgres stopped | ❌ **Total startup failure** → H1 |

**Pass 2 additions** (same commit, same environment):

| # | Check | Command | Result |
|---|-------|---------|--------|
| 17 | Secret scan | `git grep -nE '(sk_live_\|pk_live_\|AKIA[0-9A-Z]{16}\|BEGIN .*PRIVATE KEY\|xox[baprs]-\|ghp_…)'` | ✅ **Clean** — no live secrets; only `.env.example` tracked |
| 18 | Destructive migrations | `grep 'DROP TABLE\|DROP COLUMN\|RENAME' prisma/migrations/*/*.sql` | ✅ **0 occurrences** — migrations are forward-compatible |
| 19 | Index-build locking | `grep -c 'CREATE INDEX' / 'CONCURRENTLY'` | ⚠️ **130 / 0** → M13 |
| 20 | `NOT NULL` adds without default | `grep 'ADD COLUMN.*NOT NULL' \| grep -v DEFAULT` | ⚠️ **2 occurrences** → M14 |
| 21 | XSS / injection surface | `grep 'dangerouslySetInnerHTML\|$queryRawUnsafe\|eval('` | ✅ **None** (only `$queryRaw\`SELECT 1\`` and a fixed Redis Lua script) |
| 22 | SSRF — connector base URLs | Replicated `normalizeBaseUrl` against metadata/loopback/private IPs | ❌ **All pass through** → H9 |
| 23 | BullMQ job defaults | Live queue+worker: 5 completed + 1 failing job | ❌ **5 retained, 1 invocation (no retry)** → H10 |
| 24 | Graceful shutdown | `grep 'SIGTERM\|SIGINT'`; `grep 'closeWorkers'` | ❌ **No handler; `closeWorkers()` never called** → H11 |
| 25 | UI failure states | `find src/app -name 'loading.tsx' -o -name 'error.tsx'` | 🟡 Root boundaries only → L7 |
| 26 | File storage vs declared stack | `grep 'S3_BUCKET\|@aws-sdk\|presigned'` | ⚠️ Env vars only, **no implementation** → M15 |

Pass 2 re-ran checks 1–8 and reproduced identical results; they are not re-tabulated.

**Note on check #2 — a correction to the previous report.** The 2026-07-28 report stated that a
fresh clone fails `npm run typecheck` until `npx prisma generate` is run manually. **That finding
is now stale.** `@prisma/client`'s own postinstall generates the client during `npm ci`;
`node_modules/.prisma/client` was present and `tsc --noEmit` exited 0 with no manual step. No
`postinstall` script is needed.

### 2.6 Live test environment

To move beyond static review I stood up a real environment:

- PostgreSQL 16 on port 5433, all 40 migrations applied.
- Redis 7 on port 6379.
- The **production standalone bundle** (`NODE_ENV=production`) on ports 3100/3200.
- Seeded fixtures: two isolated tenants (Org A / Store A / Owner A; Org B / Store B / Owner B)
  plus a super admin, authenticated over the real NextAuth credentials endpoint with CSRF tokens.

This is what makes C1, C2, H1, and the tenant-isolation and admin-authorization *passes*
evidence-based rather than inferred.

### 2.7 Assumptions and untested areas

**Assumptions**
- Fly.io and Docker are the intended deployment targets (`fly.toml`, `Dockerfile`, `deploy.sh`,
  `docs/deployment.md`). On Vercel, C1 would not reproduce — Vercel auto-trusts its own host.
- Meta/Shopify/Stripe/OpenAI credentials in production are real and correctly scoped.

**Not tested — no confidence claimed**
- Real Meta Graph API, Shopify Admin API, Stripe, or OpenAI calls (all require live credentials).
- Load, stress, soak, or concurrency testing at scale.
- Browser-based accessibility (axe/Lighthouse), screen readers, real mobile devices. All
  accessibility findings are **static code review only**.
- Penetration testing; SSRF; prompt-injection resistance of the AI layer.
- Backup/restore and disaster recovery (no such procedure exists to test — see M12).
- The BullMQ worker process under real job load.

---

## 3. Product Completeness

Legend: ✅ Implemented · 🟡 Partial · ❌ Missing · 🚫 N/A · ❔ Unverified

### 3.1 Role-to-Capability Matrix

| Capability | Anonymous | STAFF | STORE_OWNER | ADMIN | Super Admin |
|---|---|---|---|---|---|
| Landing / pricing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Register / login | ✅ | ✅ | ✅ | ✅ | ✅ (+OTP) |
| Password reset | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dashboard | 🚫 | ✅ | ✅ | ✅ | ✅ |
| Daily marketing brief | 🚫 | ✅ | ✅ | ✅ | ✅ |
| Store CRUD | 🚫 | ❌ (read-only, own store) | ✅ | ✅ | ✅ |
| Products / catalogue | 🚫 | ✅ (own store) | ✅ | ✅ | ✅ |
| Conversations / inbox | 🚫 | ✅ (own store) | ✅ | ✅ | ✅ |
| Coupons | 🚫 | ✅ (own store) | ✅ | ✅ | ✅ |
| Analytics & reports | 🚫 | ✅ (own store) | ✅ | ✅ | ✅ |
| Billing / plan change | 🚫 | ❌ | ✅ | ✅ | ✅ |
| Invite / remove members | 🚫 | ❌ | ✅ | ✅ | ✅ |
| Role management | 🚫 | ❌ | ✅ | ✅ | ✅ |
| Audit log view | 🚫 | ❌ | ✅ | ✅ | ✅ |
| Notification preferences | 🚫 | ✅ | ✅ | ✅ | ✅ |
| Data export (GDPR) | 🚫 | ✅ | ✅ | ✅ | ✅ |
| Account deletion | 🚫 | ✅ | ✅ | ✅ | ✅ |
| Support tickets (create) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Support triage | 🚫 | ❌ | ❌ | ❌ | ✅ |
| Platform org/user admin | 🚫 | ❌ | ❌ | ❌ | ✅ |
| SaaS coupon management | 🚫 | ❌ | ❌ | ❌ | ✅ |
| System log inspection | 🚫 | ❌ | ❌ | ❌ | ✅ |
| **Projects** | 🚫 | ❌ | ❌ **(backend only, no UI)** | ❌ | ❌ |

**Observation:** `STAFF` has no dedicated landing experience — it shares `/dashboard`, which is
built around multi-store selection that a store-pinned staff member cannot use. Not a defect;
flagged as a product decision (§3.6, Q2).

### 3.2 Entity-to-Operation Matrix

| Entity | Create | Read | List | Search | Update | Delete | Archive/Restore | Export | Audit |
|---|---|---|---|---|---|---|---|---|---|
| User | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ soft (30d grace) | ✅ | ✅ | ✅ |
| Organization | ✅ auto | ✅ | ✅ (admin) | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Store | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ soft | ✅ | ❌ | ✅ |
| Product | ✅ sync | ✅ | ✅ | ✅ | ✅ | ✅ soft | 🚫 | ❌ | 🟡 |
| Order | ✅ webhook | ✅ | ✅ | 🟡 | 🚫 | 🚫 | 🚫 | ❌ | 🟡 |
| Coupon | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ disable | 🚫 | ❌ | ✅ |
| Customer | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | 🟡 | ✅ |
| Conversation | ✅ | ✅ | ✅ | 🟡 | ✅ | ❌ | ❌ | ❌ | ✅ |
| Campaign | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | 🟡 |
| Invite | ✅ | ✅ | ✅ | 🚫 | ✅ resend | ✅ revoke | 🚫 | 🚫 | ✅ |
| Support ticket | ✅ | ✅ | ✅ | 🟡 | ✅ | ❌ | ✅ close | ❌ | ✅ |
| SaaS coupon | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ deactivate | 🚫 | ❌ | ✅ |
| **Project** | 🟡 action only | 🟡 | 🟡 | ❌ | ❌ | ⚠️ **hard delete mislabelled "archive"** | ❌ | ❌ | ❌ |

### 3.3 Workflow Completeness Matrix

| Workflow | Entry | Authz | Validation | Success | Failure | Cancel | Retry | Notify | History |
|---|---|---|---|---|---|---|---|---|---|
| Register → org provisioning | ✅ | ✅ | ✅ zod | ✅ | ✅ | 🚫 | 🚫 | ✅ | ✅ |
| Login (+ super-admin OTP) | ✅ | ✅ | ✅ | ✅ | 🟡 no lockout feedback | 🚫 | 🚫 | 🚫 | ✅ |
| Password reset | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | ✅ resend | ✅ | ✅ |
| Member invite → accept | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ revoke | ✅ resend | ✅ | ✅ |
| Connect Shopify store | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 manual | ✅ | ✅ |
| Product sync | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟡 manual | ✅ | 🟡 |
| **Shopify webhook → order** | ✅ | ✅ HMAC | ✅ | ✅ | ✅ | 🚫 | 🟡 Shopify-side | 🚫 | 🟡 |
| **Meta webhook → AI reply** | ✅ | ✅ HMAC+dedup | ✅ | ⚠️ **duplicated (C2)** | 🟡 logged only | 🚫 | ❌ | ✅ | ✅ |
| **First-follower campaign** | ✅ | ✅ | ✅ | ⚠️ **race (C2)** | ✅ | ✅ toggle | ❌ | ✅ | ✅ |
| **Checkout → plan upgrade** | ✅ | ✅ sig | ✅ | ✅ | 🟡 | ✅ | ❌ **no dedup (H2)** | ❌ | 🟡 |
| **Subscription lifecycle** | ✅ | ✅ | ✅ | 🟡 | ⚠️ **past_due is terminal (H3)** | ✅ | ❌ | ❌ | 🟡 |
| **Abandoned cart recovery** | ✅ | ✅ | ✅ | ❌ **no subscriber (H7)** | 🚫 | 🚫 | 🚫 | ❌ | ❌ |
| Human takeover | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ resume | 🚫 | ✅ | ✅ |
| Support ticket | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ close | 🚫 | ✅ | ✅ |
| GDPR export / deletion | ✅ | ⚠️ **weak (H4)** | ✅ | ✅ | ✅ | 🚫 | 🚫 | ✅ | ✅ |
| **Project lifecycle** | ❌ no UI | ✅ | ✅ | ❌ | ❌ unhandled throw | 🚫 | 🚫 | ❌ | ❌ |

### 3.4 Dashboard and Reporting Matrix

| Surface | Status | Business need it serves |
|---|---|---|
| `/dashboard` | ✅ | Cross-store home; where to start today |
| `/daily-marketing` | ✅ | The product's core "what to do today" loop |
| `/stores/[id]` | ✅ | Per-store operational view |
| `/analytics` + 8 sub-views | ✅ | Content/audience/product/campaign performance |
| `/analytics/growth`, `/journeys` | ✅ | Advocacy funnel; post→order attribution |
| `/business-brain` | ✅ | Accumulated marketing memory and learning |
| `/inbox` | ✅ | Unified cross-store conversation queue |
| `/reports` | ✅ | Generated report history |
| `/settings/audit` | ✅ | Tenant-level audit trail |
| `/admin` (+5 sub-pages) | ✅ | Platform operations |
| **Usage / quota dashboard** | ❌ | A Free-plan user hits "50 AI replies/month" with no way to see consumption before being cut off. Counters exist (`add_ai_reply_counters` migration) but are not surfaced. |
| **Billing history / invoices** | ❌ | No invoice list, receipts, or payment-method management; `past_due` state is not surfaced to the user at all. |
| **Webhook / integration health** | ❌ | No operator view of webhook failure rates or stale integrations. Given H2/H6/H7, this is the surface that would have caught them. |
| **Team / seat management view** | 🟡 | Invite and remove exist; no consolidated members list with roles, last-active, and seat count against the Pro seat limit. |

### 3.5 Missing capabilities (prioritised)

| # | Capability | Evidence | Impact |
|---|---|---|---|
| 1 | Projects UI | 6 server actions, 2 models, 0 pages; `revalidatePath("/projects")` targets a route that does not exist | Dead code, or a half-shipped feature |
| 2 | Shopify GDPR webhooks | No `customers/data_request`, `customers/redact`, `shop/redact` handlers | **Blocks Shopify App Store listing**; compliance exposure |
| 3 | `app/uninstalled` handling | Not in `apply-shopify-webhook.ts` | Dead integrations retain encrypted tokens indefinitely |
| 4 | Usage/quota visibility | Counters persisted, never displayed | Users hit hard limits with no warning |
| 5 | Billing history | No invoice/receipt surface | Support burden; likely a legal requirement in some jurisdictions |
| 6 | Abandoned-cart recovery | Event published, zero subscribers | Advertised-adjacent capability that does nothing |
| 7 | Global search | No search in `AppShell` nav | Navigation cost grows with data volume |
| 8 | Backup/restore runbook | Absent from `docs/operations.md` | No tested recovery path |

### 3.6 Product Decisions Required

> These are genuine ambiguities. I did not guess at the answers.

- **Q1 — Projects:** Is this a planned feature awaiting UI, or abandoned scaffolding? *If planned*,
  H5 (hard delete) must be fixed before any UI ships. *If abandoned*, delete the models, actions,
  and repository. Leaving reachable-but-unlinked mutating server actions is the worst of both.
- **Q2 — STAFF landing page:** Should a store-pinned staff member get a store-scoped home instead
  of the multi-store `/dashboard`?
- **Q3 — `past_due` policy:** When an invoice fails, should the plan be downgraded immediately,
  after a grace period, or only on `customer.subscription.deleted`? H3 cannot be fixed correctly
  without this answer.
- **Q4 — Event delivery semantics:** Should side-effecting handlers run **once per cluster**
  (correct for sending DMs) or **once per instance** (correct for cache invalidation)? The current
  bus does neither reliably. This decision determines the shape of the C2/H6 fix.
- **Q5 — Shopify App Store:** Is public listing intended? If yes, the GDPR webhooks are mandatory
  and become release blockers.
- **Q6 — Free-plan abuse:** No CAPTCHA or email-domain restriction on registration. Acceptable?

---

## 4. Detailed Findings

---

### 🔴 C1 — NextAuth `trustHost` is unset: authentication fails completely on Fly.io/Docker

| Field | Value |
|---|---|
| **Status** | Confirmed Defect (reproduced) |
| **Severity** | **Critical** |
| **Category** | Configuration / Availability / Authentication |
| **Release-blocking** | **Yes** |
| **Affected roles** | All — every user, including super admin |

**Affected locations**
- `src/modules/auth/infrastructure/auth.ts:151-254` — `authConfig` omits `trustHost`
- `src/shared/config/env.ts:9-67` — `AUTH_TRUST_HOST` absent from the schema
- `.env.example`, `docs/deployment.md`, `fly.toml`, `Dockerfile` — absent from all

**Evidence — reproduced side by side on the same build**

Grep across the entire repository returns nothing:
```
$ grep -rn "trustHost\|AUTH_TRUST_HOST" src .env.example docs/ fly.toml Dockerfile
(no matches)
```

Instance without `AUTH_TRUST_HOST` (port 3100):
```
$ curl -s -w "\nHTTP=%{http_code}\n" http://127.0.0.1:3100/api/auth/session
{"message":"There was a problem with the server configuration. Check the server logs..."}
HTTP=500
```
Server log:
```
[auth][error] UntrustedHost: Host must be trusted. URL was: http://localhost:3100/api/auth/session.
Read more at https://errors.authjs.dev#untrustedhost
```

Same build, `AUTH_TRUST_HOST=true` (port 3200):
```
$ curl -s -w "\nHTTP=%{http_code}\n" http://127.0.0.1:3200/api/auth/session
null
HTTP=200
```

**Root cause.** NextAuth v5 requires an explicit trust signal for the incoming `Host` header
unless it detects Vercel (`VERCEL=1`). Behind Fly.io's proxy or in Docker, no such signal exists,
so `/api/auth/*` returns 500 for every request. `NEXTAUTH_URL` — which *is* set and validated —
does not satisfy this check in v5; that was v4 behaviour.

**Impact.** Nobody can log in, register, or reset a password. The application is 100% unusable on
its own documented deployment path. CI does not catch it: the smoke test only curls
`/api/health`, which is a static route requiring no auth.

**Recommended fix** — set it explicitly in code rather than relying on an env var, so it cannot be
forgotten:

```typescript
// src/modules/auth/infrastructure/auth.ts
export const authConfig: NextAuthConfig = {
  adapter: EncryptedPrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: env.NEXTAUTH_SECRET,
  // The app runs behind a reverse proxy (Fly.io/Docker/nginx) where Auth.js
  // cannot infer a trusted host. APP_URL is the canonical origin.
  trustHost: true,
  pages: { signIn: "/login" },
  // …
};
```

Because `trustHost: true` makes the app honour the incoming `Host` header, pair it with host
validation at the edge so a spoofed `Host` cannot poison callback URLs. On Fly.io, keep
`[http_service] force_https = true` (already present) and restrict to your domain.

**Deployment considerations.** Add `AUTH_TRUST_HOST=true` to `fly.toml [env]` and
`docs/deployment.md` as belt-and-braces, and add `APP_URL`-based origin validation.

**Regression risk.** Low. `trustHost: true` is the documented configuration for self-hosted
Auth.js v5 and does not change behaviour on Vercel.

**Tests to add**
- CI smoke test must hit `/api/auth/session` and assert HTTP 200, not just `/api/health`.
- An integration test asserting a full credentials sign-in returns a session.

**Verification steps**
1. `npm run build`
2. Start the standalone server with production env and **without** `AUTH_TRUST_HOST`.
3. `curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/auth/session` → expect `200`.
4. Complete a browser login end to end.

**Similar locations to inspect.** Any other place assuming Vercel-style host inference; the
`APP_URL` vs `NEXTAUTH_URL` split (two vars for one concept invites drift).

---

### 🔴 C2 — `RedisEventBus` dispatches every event twice on the publishing instance

| Field | Value |
|---|---|
| **Status** | Confirmed Defect (reproduced) |
| **Severity** | **Critical** |
| **Category** | Correctness / Data integrity / Cost / Customer trust |
| **Release-blocking** | **Yes** |
| **Affected roles** | All tenants; **end customers receive duplicate messages** |

**Affected locations**
- `src/shared/events/redis-event-bus.ts:52-75` — `publish()` and `dispatchLocal()`
- `src/shared/events/index.ts:8-16` — Redis bus is selected whenever `REDIS_URL` is set (i.e. always in production; it is in `PRODUCTION_REQUIRED`)
- Blast radius: `src/modules/ai/infrastructure/subscribers.ts:25`, `src/modules/coupons/infrastructure/subscribers.ts:20`, and 21 other subscriptions

**The defect**

```typescript
// src/shared/events/redis-event-bus.ts:52
async publish(event: DomainEvent): Promise<void> {
  await this.dispatchLocal(event);          // ← handlers run HERE (1st time)
  const publisher = this.getPublisher();
  await publisher.publish(CHANNEL, serialize(event));  // ← broadcast
}

private async ensureSubscribed(): Promise<void> {
  this.subscriber.on("message", (channel, message) => {
    void this.dispatchLocal(deserialize(message));     // ← handlers run AGAIN (2nd time)
  });
}
```

Redis Pub/Sub delivers to **every** subscriber on the channel, including the subscriber connection
owned by the publishing process. So the publisher handles its own event locally *and* again on
delivery. With *N* replicas, a single event triggers *N + 1* handler executions.

**Evidence — empirical reproduction**

I replicated `redis-event-bus.ts` verbatim against a live Redis and published one event:

```
$ node repro-eventbus.mjs
Publishing ONE NewMessage event (one inbound customer DM)...
  [handler] AI reply generated + DM sent (call #1)
  [handler] AI reply generated + DM sent (call #2)

RESULT: 1 event published -> handler ran 2 time(s)
FAIL: customer receives 2 AI replies
```

**Impact, traced through real handlers**

`NewMessage` → `onNewMessage` → `generateReply` (`src/modules/ai/application/generate-reply.ts:217`).
`generateReply` carries **no idempotency key and no dedup check**, so each invocation:

1. consumes a monthly AI-reply quota unit (`consumeAIReply`) — quota burns 2× as fast;
2. makes a billable OpenAI call — **AI spend doubles**;
3. appends an `AI` message to the conversation — corrupted transcript;
4. **sends a DM to a real customer via `metaService.sendMessage`** — the customer receives two
   replies to one message.

Duplicate automated DMs are not merely embarrassing: they risk Meta platform-policy enforcement
against the connected business account.

For `FirstTimeFollowerDetected` → `welcomeFirstFollower`, the duplicate is *partially* masked by
the `@@unique([storeId, code])` constraint on `Coupon` (schema line 966) — the losing race aborts
at coupon creation. That is accidental protection, not a design, and it is racy: both dispatches
run concurrently (`void this.dispatchLocal(...)`), so the outcome is non-deterministic and
produces error noise either way.

**Root cause.** Redis Pub/Sub is a broadcast primitive being used for exactly-once side effects.
Two compounding errors: (a) the publisher does not exclude itself from its own broadcast, and
(b) fan-out delivery is semantically wrong for handlers that send messages and spend money.

**Recommended solution.** Two layers — stop the self-echo now, then fix the semantics.

*Layer 1 — eliminate the double-dispatch (minimal, immediate):*

```typescript
// src/shared/events/redis-event-bus.ts
async publish(event: DomainEvent): Promise<void> {
  const publisher = this.getPublisher();
  try {
    await publisher.publish(CHANNEL, serialize(event));
  } catch (err) {
    logger.error("redisEventBus.publishFailed", { error: String(err), eventName: event.name });
    // Redis is unreachable: dispatch locally so the event is not silently lost.
    await this.dispatchLocal(event);
  }
}
```

Removing the eager `dispatchLocal` from `publish()` makes delivery uniform: every instance
(including the publisher) handles each event exactly once, via its Redis subscription.

*Layer 2 — correct semantics for side-effecting handlers (required before scaling past one replica):*

Fan-out still means *N* replicas each run the handler once. For handlers that send DMs or spend
money, route through the existing BullMQ queue so exactly one worker consumes each event, and add
an idempotency key:

```typescript
// Illustrative — src/modules/ai/infrastructure/subscribers.ts
const onNewMessage: EventHandler = async (event) => {
  const p = event.payload as NewMessagePayload;
  await aiQueue.add(
    "generate-reply",
    { conversationId: p.conversationId, externalUserId: p.externalUserId },
    { jobId: `reply:${p.messageId}`, attempts: 3, backoff: { type: "exponential", delay: 2000 } },
  );
};
```

BullMQ deduplicates on `jobId`, giving true once-only processing plus retries and a dead-letter
path — which also resolves H6.

**Database considerations.** Add a persisted idempotency record for externally-visible side
effects (a `ProcessedEvent` table keyed on event id, or a unique constraint on
`(conversationId, inReplyToMessageId)` for `Message`) so duplicates are impossible even if
delivery guarantees regress.

**Regression risk.** Medium — this changes delivery timing. Handlers currently observe events
synchronously within `publish()`; after the fix they run asynchronously. Anything that relied on
the eager local dispatch (for example, reading state written by a handler immediately after
`publish` returns) will break. Audit all 23 subscriptions for that assumption.

**Tests to add**
- Unit: publish one event with a subscriber registered → assert the handler runs **exactly once**
  (this is the test that would have caught this).
- Unit: Redis unavailable → assert the fallback still delivers exactly once.
- Integration: two bus instances sharing one Redis → one publish → each instance handles once.
- Integration: `generateReply` invoked twice with the same message id → one DM sent.

**Verification steps**
1. Start Redis; run the exactly-once unit test.
2. Run two app instances against one Redis; publish a `NewMessage`; assert one DM per instance
   pre-queue, and exactly one overall post-queue.
3. Trigger a real inbound Meta message in staging; assert exactly one `Message` row with
   `sender = "AI"`.

**Similar locations to inspect.** `src/shared/queue/*` for the same at-least-once assumption;
every one of the 23 `bus.subscribe(...)` registrations for non-idempotent side effects.

---

### 🟠 H1 — Unguarded `ensureSuperAdmin` in `instrumentation.ts` prevents server startup

| Field | Value |
|---|---|
| **Status** | Confirmed Defect (reproduced) |
| **Severity** | **High** |
| **Category** | Availability / Deployment safety |
| **Release-blocking** | **Yes** |
| **Affected roles** | All |

**Affected locations**
- `src/instrumentation.ts:4-14`
- `src/modules/auth/infrastructure/super-admin.ts:11-38` — no try/catch

**Evidence.** With PostgreSQL stopped, the production server fails to start entirely:

```
✓ Ready in 4.2s
Failed to prepare server Error [PrismaClientInitializationError]:
An error occurred while loading instrumentation hook:
Invalid `prisma.user.findUnique()` invocation:
Can't reach database server at `/var/tmp:5433`
    at async w.findByEmail (.next/server/chunks/4627.js:1:4011)
    at async Module.W (.next/server/instrumentation.js:9:213509)
⨯ unhandledRejection: …
```

Every request then returns 500 — **including `/api/health`**, which is a static route with no
database dependency:

```
$ curl -o /dev/null -w "health=%{http_code}\n" http://127.0.0.1:3200/api/health
health=500
```

The process kept the port bound while serving only 500s rather than exiting cleanly.

**Root cause.** `register()` awaits `ensureSuperAdmin(...)` with no error handling. Next.js treats
a throwing instrumentation hook as fatal. A convenience seeding step is therefore a hard startup
dependency on database reachability.

**Impact.** A transient database blip — failover, connection-pool exhaustion, a paused Neon/Fly
Postgres branch — during a rolling deploy means new instances never become healthy. Because
liveness also fails, orchestrators crash-loop rather than keeping the old healthy revision. This
converts a brief, recoverable dependency outage into a full outage.

**Recommended fix**

```typescript
// src/instrumentation.ts
import { validateProductionSecrets } from "@/shared/config";
import { initSentry, initTelemetry, logger } from "@/shared/observability";

export async function register() {
  initSentry();
  initTelemetry();
  validateProductionSecrets(); // must stay fatal — misconfiguration is not recoverable

  // Seeding is best-effort: it must never prevent the process from serving traffic.
  try {
    const { ensureSuperAdmin, accounts, hasher } = await import(
      "@/modules/auth/infrastructure/container"
    );
    await ensureSuperAdmin({ accounts, hasher });
  } catch (error) {
    logger.error("bootstrap.ensureSuperAdmin.failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
```

Better still, move super-admin seeding out of the request path entirely into the
`release_command` in `fly.toml`, alongside `prisma migrate deploy`, where a failure correctly
blocks the release rather than the process.

**Deployment considerations.** Keep `/api/health` (liveness) free of dependency checks and
`/api/ready` (readiness) as the dependency probe — the split is already correct in code, but H1
defeats it. Add an explicit Fly.io health check pointing at `/api/ready`.

**Regression risk.** Low. Swallowing this error is strictly safer; misconfiguration remains fatal
via `validateProductionSecrets()`.

**Tests to add**
- Integration: start with an unreachable `DATABASE_URL` → assert the process starts and
  `/api/health` returns 200 while `/api/ready` returns 503.

**Verification steps**
1. Stop PostgreSQL. 2. Start the standalone server. 3. `/api/health` → 200; `/api/ready` → 503.
4. Start PostgreSQL. 5. `/api/ready` → 200 with no restart.

**Similar locations to inspect.** Any other module-load-time I/O; `src/server/subscribers.ts` is
called from the root layout and would surface errors per-request rather than at boot.

---

### 🟠 H2 — Stripe webhook has no idempotency: retries double-count coupon redemptions

| Field | Value |
|---|---|
| **Status** | Confirmed Defect |
| **Severity** | **High** |
| **Category** | Billing integrity / Revenue |
| **Release-blocking** | **Yes** |
| **Affected roles** | STORE_OWNER, ADMIN, platform finance |

**Affected locations**
- `src/app/api/stripe/webhook/route.ts:8-32`
- `src/modules/organizations/application/billing.ts:40-142`, `146-166`

**Evidence.** After signature verification, `fulfillCheckout` switches on `event.type` and acts
immediately. `event.id` is never recorded or checked:

```
$ grep -n "event.id\|idempot\|processed" src/modules/organizations/application/billing.ts
(no matches)
```

Contrast with the Meta webhook, which *does* dedup (`src/app/api/meta/webhook/route.ts:49`):
```typescript
if (await webhookGuard.isDuplicate(rawBody)) { … return 200; }
```
Stripe and Shopify have no equivalent.

**Root cause.** Stripe guarantees *at-least-once* delivery and retries for up to 3 days on any
non-2xx response or timeout. Without an `event.id` ledger, a retry re-executes the handler.

**Impact.** `updatePlan` is naturally idempotent, so the plan itself is safe. `incrementCouponUsage`
(`billing.ts:146`) is **not**: each redelivery increments `usedCount` again. A promotional SaaS
coupon capped at 100 uses is exhausted early by retries, denying legitimate customers a discount
and corrupting campaign reporting. Any future non-idempotent fulfillment (seat provisioning,
credit grants, referral payouts) inherits the same flaw.

**Recommended fix** — a persisted event ledger, checked before fulfillment:

```prisma
// prisma/schema.prisma
model ProcessedWebhookEvent {
  id          String   @id            // provider event id, e.g. Stripe evt_…
  provider    String                  // "stripe" | "shopify" | "meta"
  type        String
  processedAt DateTime @default(now())

  @@index([provider, processedAt])
}
```

```typescript
// src/modules/organizations/application/billing.ts
async fulfillCheckout(payload, signature) {
  // … signature verification unchanged …
  const event = rawEvent as Stripe.Event;

  // At-least-once delivery: record the event id first; a duplicate insert
  // means this event was already fulfilled.
  try {
    await deps.processedEvents.create({ id: event.id, provider: "stripe", type: event.type });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      logger.info("stripe.webhook.duplicate", { eventId: event.id, type: event.type });
      return;
    }
    throw error;
  }

  switch (event.type) { /* … unchanged … */ }
}
```

**Database considerations.** Add a retention job pruning rows older than ~30 days (Stripe retries
for 3 days). The unique primary key does the deduplication — no extra index needed.

**Regression risk.** Low, but note the ordering: recording *before* processing means a crash
mid-fulfillment leaves the event marked processed. Given `updatePlan` is idempotent this is the
safer trade-off; if that changes, move the insert into the fulfillment transaction.

**Tests to add**
- Deliver the same `checkout.session.completed` twice → plan updated once, `usedCount` +1 once.
- Deliver two *different* events → both processed.
- Concurrent duplicate delivery → exactly one fulfillment.

**Verification steps**
1. `stripe trigger checkout.session.completed` against staging.
2. Resend the same event from the Stripe dashboard.
3. Assert `SaaSCoupon.usedCount` incremented exactly once.

**Similar locations to inspect.** `src/app/api/shopify/webhooks/route.ts` — same gap;
`x-shopify-webhook-id` is available and unused. Shopify retries up to 19 times over 48 hours.

---

### 🟠 H3 — `past_due` is a terminal state: recovered payments never restore an organization

| Field | Value |
|---|---|
| **Status** | Confirmed Defect |
| **Severity** | **High** |
| **Category** | Business logic / Revenue / Customer experience |
| **Release-blocking** | **Yes** |
| **Affected roles** | STORE_OWNER, ADMIN |

**Affected locations** — `src/modules/organizations/application/billing.ts:57-141`

**Evidence.** The handler switches on exactly three event types:

| Event | Handled | Line |
|---|---|---|
| `checkout.session.completed` | ✅ | 58 |
| `customer.subscription.deleted` | ✅ | 100 |
| `invoice.payment_failed` | ✅ → sets `past_due` | 117 |
| **`invoice.payment_succeeded`** | ❌ falls through to `default` | 138 |
| **`customer.subscription.updated`** | ❌ falls through to `default` | 138 |

`invoice.payment_failed` sets `subscriptionStatus: "past_due"` (line 131). Nothing anywhere sets
it back to `"active"` except a brand-new checkout.

**Root cause.** The subscription lifecycle is modelled as a set of one-way transitions rather than
a state machine driven by Stripe's authoritative status.

**Impact — two distinct failures.**

1. *Recovery is impossible.* Stripe's dunning retries a failed card and usually succeeds. Stripe
   marks the subscription `active`; OmniConnect still shows `past_due` forever. The customer is
   paying and being treated as delinquent, with no self-service path. If any gating is later
   keyed on `subscriptionStatus`, paying customers lose access.
2. *Out-of-band plan changes are lost.* Upgrades, downgrades, cancel-at-period-end, trial expiry,
   and anything done through the Stripe Customer Portal arrive as
   `customer.subscription.updated` and are silently ignored (logged as `stripe.webhook.unhandled`).
   A customer who downgrades Pro → Starter in Stripe keeps full Pro entitlements while paying less.

**Recommended fix** — treat `customer.subscription.*` as the source of truth:

```typescript
// src/modules/organizations/application/billing.ts
case "customer.subscription.created":
case "customer.subscription.updated": {
  const subscription = event.data.object as Stripe.Subscription;
  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) {
    logger.error("stripe.subscription.missingMetadata", { subscriptionId: subscription.id });
    return;
  }

  // Derive the plan from the active price, not from stale metadata.
  const priceId = subscription.items.data[0]?.price.id;
  const plan = planFromPriceId(priceId) ?? Plan.FREE;

  // Stripe's status is authoritative; entitlement follows it in both directions.
  const entitledPlan = ACTIVE_STATUSES.has(subscription.status) ? plan : Plan.FREE;

  await deps.organizations.updatePlan(organizationId, {
    plan: entitledPlan,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
  });
  logger.info("stripe.subscription.synced", {
    organizationId, plan: entitledPlan, status: subscription.status,
  });
  return;
}

case "invoice.payment_succeeded": {
  // Clears `past_due` once dunning recovers the payment.
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = resolveSubscriptionId(invoice);
  if (!subscriptionId) return;
  const org = await findOrganizationBySubscriptionId(deps.organizations, subscriptionId);
  if (!org) return;
  await deps.organizations.updatePlan(org.id, {
    plan: org.plan, subscriptionId, subscriptionStatus: "active",
  });
  return;
}
```

with

```typescript
const ACTIVE_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing"]);

function planFromPriceId(priceId: string | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === env.STRIPE_PRICE_PRO) return Plan.PRO;
  if (priceId === env.STRIPE_PRICE_STARTER) return Plan.STARTER;
  return null;
}
```

**Product decision required.** Whether `past_due` should immediately restrict access is Q3 in
§3.6. The code above preserves the current behaviour (plan retained, status recorded).

**Deployment considerations.** Enable `customer.subscription.created/updated` and
`invoice.payment_succeeded` in the Stripe webhook endpoint configuration — the code alone is not
enough. Back-fill any organizations currently stuck in `past_due`.

**Regression risk.** Medium. Deriving the plan from `price.id` rather than checkout metadata is
more correct but changes behaviour; verify `STRIPE_PRICE_*` env values match live prices exactly,
or every subscription silently resolves to `FREE`.

**Tests to add**
- `invoice.payment_failed` then `invoice.payment_succeeded` → status returns to `active`.
- `customer.subscription.updated` with the Starter price on a Pro org → downgraded.
- `customer.subscription.updated` with `status: "unpaid"` → entitlement drops to `FREE`.
- `planFromPriceId` returns `null` for an unknown price (and does not silently downgrade).

**Verification steps**
1. In Stripe test mode, use a card that fails on the first invoice.
2. Confirm the org is `past_due`. 3. Pay the invoice. 4. Assert status returns to `active`.
5. Downgrade via the Customer Portal; assert the plan follows.

**Similar locations to inspect.** `src/modules/organizations/application/usage.ts` and any plan
gating that reads `subscriptionStatus`.

---

### 🟠 H4 — `/api/export/[id]` bypasses session revocation on a full personal-data export

| Field | Value |
|---|---|
| **Status** | Confirmed Defect |
| **Severity** | **High** |
| **Category** | Authentication / Privacy (GDPR) |
| **Release-blocking** | **Yes** |
| **Affected roles** | All authenticated users |

**Affected locations** — `src/app/api/export/[id]/route.ts:9`

**Evidence.** This is the **only** place in the codebase that calls `auth()` directly instead of
the hardened `getCurrentUser()`:

```
$ grep -rn "await auth()" src --include=*.ts --include=*.tsx | grep -v "modules/auth/"
src/app/api/export/[id]/route.ts:9:  const session = await auth();
```
against **108** correct `getCurrentUser()` / `requireUser()` call sites elsewhere. This is a clear
outlier, not a house style.

```typescript
// src/app/api/export/[id]/route.ts:9
const session = await auth();
if (!session?.user?.id) {
  return new NextResponse("Unauthorized", { status: 401 });
}
```

`getCurrentUser()` (`src/modules/auth/infrastructure/session.ts:41-59`) does two things this route
skips:

```typescript
const fresh = await loadFreshUser(user.id);          // WHERE { id, deletedAt: null }
if (!fresh) return null;
if (user.tokenVersion !== fresh.tokenVersion) return null;  // revocation check
```

**Root cause.** A raw JWT is trusted without re-validating it against the canonical user record.

**Impact.** The `tokenVersion` mechanism exists precisely so password changes, role changes, and
account deletion invalidate live sessions. This route ignores it, so a JWT that is *supposed* to
be dead still authorises download of a **complete personal-data export**. Concretely: a user
changes their password after a device is stolen; every other surface correctly rejects the old
token; this one still serves the full export. It also skips `deletedAt`, so a soft-deleted account
can still export within the 30-day grace window.

**Recommended fix**

```typescript
// src/app/api/export/[id]/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth";
import { dataExportService, userRepository } from "@/modules/users";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // getCurrentUser re-reads the canonical record and enforces tokenVersion,
  // so revoked sessions cannot download personal data.
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const exportRequest = await userRepository.getExportRequest(id, user.id);
  if (!exportRequest || exportRequest.status !== "COMPLETED") {
    return new NextResponse("Export not found", { status: 404 });
  }
  if (exportRequest.expiresAt && new Date() > new Date(exportRequest.expiresAt)) {
    return new NextResponse("Export expired", { status: 410 });
  }

  const data = await dataExportService.getExport(user.id);
  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": `attachment; filename="export-${id}.json"`,
      "Cache-Control": "no-store, private",
    },
  });
}
```

Note the added `Cache-Control: no-store` — personal data should never be cached by proxies.

**Security considerations.** Ownership is correctly scoped (`getExportRequest(id, userId)`), so
this is not an IDOR. Also add rate limiting; the route is currently unthrottled.

**Regression risk.** Very low — strictly stricter.

**Tests to add**
- Valid session → 200.
- Session with a stale `tokenVersion` → 401 (this is the regression test).
- Soft-deleted user with a valid JWT → 401.
- Another user's export id → 404.

**Verification steps**
1. Authenticate; request an export; note the id.
2. Change the password (increments `tokenVersion`).
3. Re-request the export with the **old** cookie → expect 401 (currently returns 200).

**Similar locations to inspect.** Every `route.ts` under `src/app/api/`. `/api/health`,
`/api/ready`, and the three webhooks are intentionally public; `/api/stripe/checkout` should be
confirmed to use `requireUser()`.

---

### 🟠 H5 — `archiveProject` hard-deletes the project and cascades to its members

| Field | Value |
|---|---|
| **Status** | Confirmed Defect |
| **Severity** | **High** |
| **Category** | Data integrity / Irreversible data loss |
| **Release-blocking** | **Yes** (or delete the feature — see Q1) |
| **Affected roles** | STORE_OWNER, ADMIN |

**Affected locations**
- `src/modules/organizations/infrastructure/project.repository.ts:90-95`
- `src/modules/organizations/presentation/project-actions.ts:90-107`
- `prisma/schema.prisma:203-214` — `ProjectMember.project … onDelete: Cascade`

**Evidence.** The method named `archive` performs an unconditional hard delete:

```typescript
// project.repository.ts:90
async archive(id: string, organizationId: string): Promise<ProjectRecord | null> {
  const project = await prisma.project.delete({   // ← DELETE, not an archive
    where: { id, organizationId },
  });
  return project ? mapProject(project) : null;
}
```

Three distinct defects here:

1. **Naming lies about behaviour.** `archiveProjectAction` → `archiveProject` → `archive` →
   `DELETE`. Every layer says "archive"; the database row is destroyed. `Project` has no
   `deletedAt` column, unlike `Product` and `Store`, which both soft-delete correctly.
2. **Silent cascade.** `ProjectMember` declares `onDelete: Cascade`, so all membership rows are
   destroyed with no confirmation and no audit entry.
3. **Dead branch + unhandled exception.** `prisma.delete` *throws* `P2025` when no row matches; it
   never returns null, so `project ? … : null` is unreachable. `archiveProjectAction` (line 104)
   does not wrap the call, so a double-submit or a stale id produces an unhandled exception and a
   500 rather than a graceful message.

**Impact.** Irreversible loss of a project and its entire membership graph from a control the user
reasonably believes is reversible. No restore path, no audit trail. Currently latent only because
no UI reaches these actions (M3) — which is exactly why it must be fixed *before* any UI ships.

**Recommended fix** — make the behaviour match the name:

```prisma
// prisma/schema.prisma
model Project {
  id              String       @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  name            String
  description     String?
  instagramHandle String?
  integrationId   String?
  integration     Integration? @relation(fields: [integrationId], references: [id], onDelete: SetNull)
  archivedAt      DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  members ProjectMember[]

  @@unique([organizationId, name])   // also closes the race in M3
  @@index([organizationId])
  @@index([archivedAt])
}
```

```typescript
// project.repository.ts
async archive(id: string, organizationId: string): Promise<ProjectRecord | null> {
  const result = await prisma.project.updateMany({
    where: { id, organizationId, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  if (result.count === 0) return null;   // not found, wrong tenant, or already archived
  return this.findById(id, organizationId);
}

async restore(id: string, organizationId: string): Promise<ProjectRecord | null> {
  const result = await prisma.project.updateMany({
    where: { id, organizationId, archivedAt: { not: null } },
    data: { archivedAt: null },
  });
  if (result.count === 0) return null;
  return this.findById(id, organizationId);
}
```

`updateMany` also removes the unhandled-throw problem: a missing or cross-tenant id yields
`count === 0` rather than `P2025`. `listByOrganization` must then filter `archivedAt: null` by
default.

**Database considerations.** The `@@unique([organizationId, name])` addition will fail to apply if
duplicate names already exist — check before migrating. Consider a partial unique index so
archived projects do not block name reuse.

**Regression risk.** Low today (no callers). Medium once a UI exists: every read path must filter
archived rows or archived projects will reappear in lists.

**Tests to add**
- Archive sets `archivedAt` and the row still exists.
- Archived projects are excluded from `listByOrganization`.
- Members survive archiving.
- Archiving a non-existent or cross-tenant id returns null without throwing.
- Restore round-trips.

**Verification steps**
1. Create a project with two members. 2. Archive it. 3. Assert the row and both `ProjectMember`
rows still exist and `archivedAt` is set. 4. Assert it is absent from the default list.
5. Restore; assert it returns.

**Similar locations to inspect.** All 14 `onDelete: Cascade` declarations in `schema.prisma`;
`grep -rn "prisma\.\w*\.delete(" src/modules` for other hard deletes behind soft-sounding names.

---

### 🟠 H6 — Event delivery is at-most-once with no durability, retry, or dead-letter path

| Field | Value |
|---|---|
| **Status** | Confirmed Defect (design) |
| **Severity** | **High** |
| **Category** | Reliability / Architecture |
| **Release-blocking** | **Yes** |
| **Affected roles** | All |

**Affected locations** — `src/shared/events/redis-event-bus.ts:52-118`, `src/shared/events/index.ts:8-16`

**Evidence.** Three compounding gaps in `dispatchLocal`:

```typescript
private async dispatchLocal(event: DomainEvent): Promise<void> {
  const handlers = this.handlers.get(event.name) ?? [];
  try {
    await Promise.all(handlers.map((handler) => handler(event)));
  } catch (err) {
    logger.error("redisEventBus.handlerError", { … });   // logged, then dropped
  }
}
```

1. **No retry, no DLQ.** A handler failure is logged and the event is gone forever. If
   `welcomeFirstFollower` fails because Meta returns a transient 503, that follower never gets a
   welcome message and nothing records the omission.
2. **`Promise.all` fails fast.** With multiple handlers on one event, the first rejection abandons
   the settled state of the others — one bad handler can mask the outcome of its peers.
   `Promise.allSettled` is the correct primitive here.
3. **Redis Pub/Sub is fire-and-forget.** Messages published while a subscriber is disconnected —
   during a deploy, a network partition, or Fly.io's `auto_stop_machines` scale-to-zero — are
   permanently lost. There is no persistence and no replay.

The scale-to-zero interaction is concrete: `fly.toml` sets `min_machines_running = 0` with
`auto_stop_machines = "stop"`. When the app scales to zero, events published by the worker process
have no subscriber and vanish silently.

**Impact.** Silent, unattributable data loss in the campaign, coupon, notification, and
intelligence pipelines. Because failures are only logged (never surfaced as metrics or alerts),
loss is invisible until a customer reports a missing message.

**Recommended fix.** BullMQ and Redis are already dependencies; use them for delivery rather than
Pub/Sub. Persisted jobs give at-least-once delivery, retries with backoff, and a failed-job queue:

```typescript
// Illustrative — src/shared/events/queue-event-bus.ts
export class QueueEventBus implements EventBus {
  async publish(event: DomainEvent): Promise<void> {
    await this.queue.add(event.name, serialize(event), {
      jobId: event.eventId,                 // dedup key — requires a stable id on DomainEvent
      attempts: 5,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: 1_000,
      removeOnFail: false,                  // retain failures for inspection
    });
  }
}
```

As an interim hardening, switch `Promise.all` → `Promise.allSettled` and log each rejection
individually so one failing handler cannot mask another.

**Deployment considerations.** Set `min_machines_running = 1` for the app process so a subscriber
is always connected, and add alerting on failed-queue depth.

**Regression risk.** Medium — moves handlers from synchronous to asynchronous execution. Must be
done together with C2 (same subsystem, same fix).

**Tests to add**
- Handler throws → job retried per policy, then lands in the failed queue.
- Two handlers, one throws → the other still completes (`allSettled`).
- Event published while the consumer is down → processed after it returns.

**Verification steps**
1. Register a handler that throws. 2. Publish. 3. Assert N retry attempts then a failed-queue entry.
4. Stop the consumer, publish, restart → assert the event is processed.

**Similar locations to inspect.** `src/shared/queue/in-memory-queue.ts` (same at-most-once
semantics when `REDIS_URL` is unset); `src/shared/events/event-bus.ts`.

---

### 🟠 H7 — Abandoned-cart events fire on every cart edit and have no subscriber

| Field | Value |
|---|---|
| **Status** | Confirmed Defect |
| **Severity** | **High** |
| **Category** | Incomplete workflow / Correctness |
| **Release-blocking** | No |
| **Affected roles** | STORE_OWNER; end customers if a subscriber is added naively |

**Affected locations**
- `src/modules/ecommerce/application/apply-shopify-webhook.ts:57-72`
- `src/modules/ecommerce/domain/events.ts:94-105`

**Evidence.** The event is published on `checkouts/create` **and** `checkouts/update`:

```typescript
if (topic === "checkouts/create" || topic === "checkouts/update") {
  const cart = mapAbandonedCartPayload(input.payload);
  await eventBus.publish(new AbandonedCartDetected(storeId, { … }));
}
```

Nothing consumes it. A full census of the event system:

```
$ grep -rhoP 'readonly name = "\K[A-Za-z]+' src --include=*.ts | sort -u | wc -l
88          # events declared
$ grep -rhoP 'subscribe\(\s*"\K[A-Za-z]+' src --include=*.ts | sort -u | wc -l
23          # events subscribed
$ grep -rn "AbandonedCartDetected" src --include=*.ts
# → declaration, publication, and a barrel re-export only. No subscriber.
```

**Two defects.**

1. **Semantically wrong trigger.** `checkouts/update` fires every time a shopper edits their cart —
   adds an item, changes quantity, enters an email. A cart is not *abandoned* at that moment; it is
   *active*. Real abandonment requires inactivity (typically 1–24 hours) with no completed order.
2. **Dead pipeline.** 65 of 88 declared events have no subscriber. Most are plausibly
   forward-looking, but this one backs a recognised eCommerce capability that currently does nothing.

**Impact.** Today: wasted publish volume and misleading logs. If a subscriber is added without
fixing the trigger first, a shopper editing a cart ten times receives ten "you left something
behind" DMs — a Meta policy risk and a serious customer-experience failure.

**Recommended fix.** Record cart state on webhook receipt and let a scheduled job decide
abandonment:

```typescript
// Illustrative — apply-shopify-webhook.ts
if (topic === "checkouts/create" || topic === "checkouts/update") {
  const cart = mapAbandonedCartPayload(input.payload);
  // Record state only. Abandonment is a function of elapsed inactivity,
  // which a scheduled sweep evaluates — not of a cart edit.
  await deps.carts.upsert({
    storeId,
    cartToken: cart.cartToken,
    email: cart.email,
    lineItemTitles: cart.lineItemTitles,
    totalPrice: cart.totalPrice,
    currency: cart.currency,
    recoveredUrl: cart.recoveredUrl,
    lastActivityAt: new Date(),
  });
  return { ok: true };
}
```

with a worker job that emits `AbandonedCartDetected` once per cart, for carts idle beyond the
threshold with no matching order and `notifiedAt IS NULL`.

**Database considerations.** Requires a `Cart` model with `@@unique([storeId, cartToken])` and a
`notifiedAt` column to guarantee one notification per cart.

**Product decision.** If cart recovery is not on the roadmap, delete the event and its publication
rather than leaving a misleading no-op.

**Tests to add**
- Ten `checkouts/update` events for one token → one cart row, no event emitted.
- Cart idle past the threshold with no order → exactly one `AbandonedCartDetected`.
- Cart followed by a matching order → no event.
- Sweep run twice → no duplicate notification.

**Verification steps**
1. Send repeated `checkouts/update` payloads with the same token. 2. Assert a single row and zero
events. 3. Advance `lastActivityAt` past the threshold; run the sweep; assert exactly one event.

**Similar locations to inspect.** The other 64 unsubscribed events — triage each as
"pending feature", "telemetry only", or "delete".

---

### 🟠 H8 — Test coverage is far below the threshold for a multi-tenant billing SaaS

| Field | Value |
|---|---|
| **Status** | Confirmed Defect |
| **Severity** | **High** |
| **Category** | Testing / Regression safety |
| **Release-blocking** | **Yes** (for the paths behind C1–H5) |
| **Affected roles** | All |

**Evidence.** Full test inventory:

```
Test Files  9 passed (9)
     Tests  43 passed (43)
  Duration  2.06s
```

| Test file | Tests |
|---|---|
| `organizations/application/invite-member.test.ts` | 5 |
| `organizations/application/queries.test.ts` | 3 |
| `organizations/application/create-store.test.ts` | 2 |
| `intelligence/domain/objective.test.ts` | 12 |
| `intelligence/domain/daily-action.test.ts` | 7 |
| `intelligence/application/journey.test.ts` | 2 |
| `intelligence/application/daily-action.test.ts` | 4 |
| `ecommerce/…/bigcommerce.connector.test.ts` | 4 |
| `ecommerce/…/woocommerce.connector.test.ts` | 4 |

43 tests against **524 source files**. There is no coverage threshold configured in
`vitest.config.ts` and no coverage reporting in CI.

**Zero tests exist for:** authentication and session handling; `tenantGuard`; RBAC and
`roleSatisfies`; Stripe checkout or webhook fulfillment; the Meta, Shopify, or Stripe webhook
routes; the event bus; `generateReply`; `welcomeFirstFollower`; encryption; rate limiting; and
every server action.

**This is causally linked to the rest of this report.** Every Critical and High finding sits in
code with no test coverage. A single "publish one event, assert the handler ran once" test would
have caught C2. A CI smoke test hitting `/api/auth/session` would have caught C1.

**Impact.** No regression safety on the highest-risk paths. Refactoring is unsafe. Fixes shipped
for C1–H7 cannot themselves be verified as durable.

**Recommended plan** — prioritise by risk, not by coverage percentage:

*Tier 1 — must exist before release (each maps to a finding above):*
```typescript
// Illustrative — src/shared/events/redis-event-bus.test.ts
describe("RedisEventBus", () => {
  it("dispatches each published event exactly once per instance", async () => {
    const bus = new RedisEventBus(process.env.REDIS_URL!);
    const handler = vi.fn();
    bus.subscribe("TestEvent", handler);
    await waitForSubscription();

    await bus.publish(makeEvent("TestEvent"));
    await waitForDelivery();

    expect(handler).toHaveBeenCalledTimes(1);   // fails today with 2
  });
});
```
plus: tenant guard (staff/owner/cross-org), `tokenVersion` revocation across every entry point
including `/api/export/[id]`, Stripe duplicate-event delivery, `past_due` → `active` recovery, and
webhook signature rejection for all three providers.

*Tier 2 — integration:* the three core journeys named in §1.6.

*Tier 3 — CI enforcement:* add `@vitest/coverage-v8`, set thresholds (start at the current
baseline and ratchet), and fail the build on regression.

**CI gap.** `.github/workflows/ci.yml` provisions PostgreSQL but **no Redis**, while setting
`REDIS_URL: redis://localhost:6379`. Any Redis-dependent test added today would fail against a
non-existent server. Add a `redis:7-alpine` service before writing Tier 1 tests.

**Verification steps**
1. Add the Tier 1 suite. 2. Confirm each new test **fails** against current `main` (proving it
detects the defect). 3. Apply the fixes. 4. Confirm each passes.

---

### 🟠 H9 — Authenticated SSRF via the WooCommerce store URL (no host allowlist)

| Field | Value |
|---|---|
| **Classification** | Confirmed Defect |
| **Severity** | **High** |
| **Category** | Security — SSRF / Broken input validation |
| **Disposition** | **Open — Release Blocker** |
| **Release impact** | Blocks release |
| **Likelihood** | Medium — requires an authenticated STORE_OWNER, but the field is exposed in the normal store-connect UI and needs no special tooling |
| **Affected roles** | STORE_OWNER, ADMIN (any user who can connect a store); impact lands on platform infrastructure |

**Affected locations**
- `src/modules/ecommerce/infrastructure/providers/woocommerce.connector.ts:43-47` — `normalizeBaseUrl`
- `src/modules/ecommerce/infrastructure/providers/woocommerce.connector.ts:61-80` — `request()`
- `src/modules/ecommerce/application/connect-store.ts:14` — `shopDomain: z.string().max(255).optional()`
- `src/components/connect-store-form.tsx:48-52` — the user-facing "WooCommerce base URL" input
- `src/modules/ecommerce/infrastructure/provider-registry.ts:31-38` — resolves the connector

**Evidence**

The only normalisation applied to an attacker-controlled hostname:

```typescript
// woocommerce.connector.ts:43
function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed.replace(/\/$/, "");
  return `https://${trimmed}`.replace(/\/$/, "");
}
```

No allowlist, no scheme restriction (`http://` is explicitly honoured), no private-address or
DNS-rebinding check. I replicated the function and the downstream `new URL()` construction:

```
$ node -e '…replicates normalizeBaseUrl + URL(API_PREFIX + "products", base)…'
http://169.254.169.254   -> http://169.254.169.254/wp-json/wc/v3/products
http://127.0.0.1:6379    -> http://127.0.0.1:6379/wp-json/wc/v3/products
http://10.0.0.5          -> http://10.0.0.5/wp-json/wc/v3/products
localhost:5432           -> https://localhost:5432/wp-json/wc/v3/products
http://[::1]:6379        -> http://[::1]:6379/wp-json/wc/v3/products
```

Every one produces a URL the connector will `fetch()`. The path is reachable: the provider is
selectable in the UI, `provider-registry.ts:31` resolves `WOOCOMMERCE` when `shopDomain` is set,
and the application-layer schema imposes only a length limit.

**The Shopify connector in the same directory does this correctly** — which is what makes this a
defect rather than a missing feature:

```typescript
// shopify.connector.ts:47-64 — strict allowlist
const isMyShopify = parts.at(-2) === "myshopify" && parts.at(-1) === "com";
if (!isMyShopify || !/^[a-z0-9][a-z0-9-]*$/.test(parts[0] ?? "")) {
  throw new Error("Invalid Shopify shop domain: must be a *.myshopify.com hostname");
}
```

**Root cause.** WooCommerce is legitimately self-hosted on arbitrary domains, so the author could
not reuse Shopify's allowlist and instead applied no restriction at all. The correct answer for
arbitrary-host integrations is egress filtering (resolve, then reject private ranges), not an
allowlist — but neither was implemented.

**Impact**
- *Security:* server-side requests to cloud metadata endpoints. On AWS IMDSv1 this yields IAM
  credentials; on GCP/Azure equivalents, access tokens. Also internal port scanning and reaching
  admin interfaces on the private network that assume network-level trust.
- *Data:* responses are parsed as products/orders and surface in the attacker's own store UI, so
  this is a semi-blind SSRF with an exfiltration channel, not purely blind.
- *Operational:* `http://` is accepted, so WooCommerce `consumer_key`/`consumer_secret` are sent
  in a **query string over plaintext** (`request()` sets them via `url.searchParams`), exposing
  them to any network observer and to the target's access logs.

**Recommended solution.** Validate at the application boundary and enforce egress filtering in the
connector. Both layers matter: the schema stops typos and casual abuse; the resolver stops
DNS rebinding, which schema validation cannot.

```typescript
// src/shared/security/egress.ts  (new)
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_V4 = [
  /^0\./, /^10\./, /^127\./, /^169\.254\./, /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

function isBlockedAddress(addr: string): boolean {
  if (isIP(addr) === 6) {
    const a = addr.toLowerCase();
    return a === "::1" || a === "::" || a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe80");
  }
  return BLOCKED_V4.some((re) => re.test(addr));
}

/** Rejects non-HTTPS URLs and any hostname resolving into a private/link-local range. */
export async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Store URL must be a valid absolute URL");
  }
  if (url.protocol !== "https:") {
    throw new Error("Store URL must use HTTPS");
  }
  // Resolve every A/AAAA record: a single public answer is not sufficient.
  const answers = await lookup(url.hostname, { all: true });
  if (answers.length === 0 || answers.some((a) => isBlockedAddress(a.address))) {
    throw new Error("Store URL must resolve to a public address");
  }
  return url;
}
```

```typescript
// src/modules/ecommerce/application/connect-store.ts
export const connectStoreSchema = z.object({
  storeId: z.string().min(1),
  provider: z.enum(ECOMMERCE_PROVIDERS).default("SHOPIFY"),
  // Reject non-HTTPS and malformed hosts before any network call is attempted.
  shopDomain: z
    .string()
    .max(255)
    .refine((v) => !/^https?:\/\//i.test(v) || v.toLowerCase().startsWith("https://"), {
      message: "Store URL must use HTTPS",
    })
    .optional(),
  // …unchanged…
});
```

and in the connector, replace the query-string credentials with header auth:

```typescript
// woocommerce.connector.ts — credentials belong in a header, not a logged query string
const url = new URL(`${API_PREFIX}${path}`, this.baseUrl);
await assertPublicHttpsUrl(url.toString());
const basic = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString("base64");
res = await fetch(url.toString(), {
  ...init,
  signal: controller.signal,
  redirect: "error",              // a 302 to 169.254.169.254 would otherwise bypass validation
  headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
});
```

Note `redirect: "error"` — without it, a validated public host can redirect the request to a
private address, defeating the check entirely.

**Deployment considerations.** The durable mitigation is at the network layer: run outbound
integration traffic through an egress proxy with an allowlist, and disable IMDSv1 (require IMDSv2
hop-limit 1) so metadata is unreachable even if application validation regresses. Do this
regardless of the code fix.

**Database considerations.** None. Existing `Integration.shopDomain` rows should be re-validated
and any non-HTTPS or private-address entries disabled.

**Regression risk.** Medium. Legitimate self-hosted WooCommerce stores on plain HTTP, non-standard
ports, or split-horizon DNS will stop connecting. Communicate the HTTPS requirement before
enabling. `redirect: "error"` may break stores that redirect `example.com` → `www.example.com`;
resolve by asking users to enter the canonical URL.

**Tests to add**
- `assertPublicHttpsUrl` rejects `169.254.169.254`, `127.0.0.1`, `10.0.0.5`, `::1`, `fd00::1`.
- Rejects `http://` and non-URL input; accepts a public HTTPS host.
- Rejects a hostname whose DNS answers include one public **and** one private address.
- `connectStore` with `http://169.254.169.254` returns a validation error and makes no network call.
- Connector sends `Authorization: Basic`, not `consumer_key` in the query string.

**Exact verification steps**
1. As a STORE_OWNER, attempt to connect a WooCommerce store with base URL
   `http://169.254.169.254`. Expect a validation error and **no** outbound request.
2. Start a local listener (`nc -l 9000`); attempt base URL `http://127.0.0.1:9000`. Expect no
   connection recorded on the listener.
3. Connect a real HTTPS WooCommerce store; confirm sync still succeeds.
4. Capture the outbound request; confirm credentials appear in the `Authorization` header only.

**Similar locations to inspect**
- `bigcommerce.connector.ts:80` — same `fetch(url.toString())` pattern; confirm its base URL is
  derived from `storeHash` against a fixed `api.bigcommerce.com` host (it appears to be, but it
  was not verified in this pass).
- `meta.service.ts` — all 8 `fetch` calls use the fixed `GRAPH_API_BASE`; not affected.
- Any future connector: the `EcommerceConnector` interface should require a validated base URL so
  new providers cannot reintroduce this.

---

### 🟠 H10 — Background jobs never retry and completed jobs accumulate in Redis forever

| Field | Value |
|---|---|
| **Classification** | Confirmed Defect |
| **Severity** | **High** |
| **Category** | Reliability / Resource exhaustion |
| **Disposition** | **Open — Release Blocker** |
| **Release impact** | Blocks release |
| **Likelihood** | High — certain, on every job enqueued |
| **Affected roles** | All tenants (silent loss of intelligence refreshes); platform operators (Redis growth) |

**Affected locations**
- `src/shared/queue/bullmq-queue.ts:18-22` — `add()` passes no job options
- `src/modules/intelligence/presentation/actions.ts:297-298` — the two production call sites
- `src/shared/queue/worker.ts:17-42` — worker has no `stalled`/`error` handling

**Evidence**

```typescript
// src/shared/queue/bullmq-queue.ts:18
async add<T>(name: string, data: T): Promise<string> {
  const job = await this.queue.add(name, data);   // ← no attempts, backoff, removeOnComplete, or jobId
  logger.info("queue.bullmq.added", { queue: this.queue.name, jobId: job.id, jobName: name });
  return job.id ?? "";
}
```

I ran a live queue and worker against Redis, enqueuing exactly as the application does:

```
completed jobs retained in Redis: 5
failed jobs retained: 1
handler invocations for the failing job: 1 (1 = no retry)
```

BullMQ's defaults are therefore confirmed in this configuration: `attempts` is 1, and completed
jobs are retained indefinitely.

**Root cause.** The `QueueService.add` abstraction (`src/shared/queue/types.ts`) exposes no options
parameter, so no caller *can* specify retry or retention policy even if it wanted to. The
abstraction is under-specified rather than misused.

**Impact**
- *Reliability:* a transient failure — OpenAI 429, a Postgres deadlock, a Meta 503 — permanently
  loses the job. `JOB_REFRESH_READ_MODELS` and `JOB_REFRESH_PREDICTIONS` silently never complete,
  so the user's intelligence views stay stale with no error surfaced and no retry.
- *Operational:* completed jobs accumulate without bound. Redis is also the store for rate limits,
  the event bus, and webhook dedup, so this is a slow memory leak in a component whose eviction
  under `maxmemory` pressure would break rate limiting and webhook deduplication — turning a
  housekeeping omission into a security-control failure.
- *Correctness:* no `jobId` means no deduplication, so a double-clicked refresh enqueues duplicate
  work.

**Recommended solution.** Extend the port to carry options, then set sane defaults centrally.

```typescript
// src/shared/queue/types.ts
export interface JobOptions {
  /** Stable id for deduplication; BullMQ ignores a re-add with an existing jobId. */
  jobId?: string;
  attempts?: number;
  backoffMs?: number;
}

export interface QueueService {
  add<T>(name: string, data: T, options?: JobOptions): Promise<string>;
  close(): Promise<void>;
}
```

```typescript
// src/shared/queue/bullmq-queue.ts
async add<T>(name: string, data: T, options?: JobOptions): Promise<string> {
  const job = await this.queue.add(name, data, {
    jobId: options?.jobId,
    attempts: options?.attempts ?? 5,
    backoff: { type: "exponential", delay: options?.backoffMs ?? 2_000 },
    // Bound retention: Redis also holds rate limits, dedup keys, and the event bus.
    removeOnComplete: { age: 3_600, count: 1_000 },
    removeOnFail: { age: 7 * 24 * 3_600 },   // retain failures long enough to inspect
  });
  logger.info("queue.bullmq.added", { queue: this.queue.name, jobId: job.id, jobName: name });
  return job.id ?? "";
}
```

and make the call sites idempotent:

```typescript
// src/modules/intelligence/presentation/actions.ts
const day = new Date().toISOString().slice(0, 10);
const readJobId = await queue.add(
  JOB_REFRESH_READ_MODELS,
  { organizationId, storeId: id },
  { jobId: `${JOB_REFRESH_READ_MODELS}:${id}:${day}` },   // one refresh per store per day
);
```

Also add worker-level observability, which is currently absent:

```typescript
// src/shared/queue/worker.ts
worker.on("stalled", (jobId) => logger.warn("queue.bullmq.stalled", { queue: queueName, jobId }));
worker.on("error", (err) => logger.error("queue.bullmq.workerError", { queue: queueName, error: err.message }));
```

**Deployment considerations.** Existing Redis instances already carry accumulated completed jobs;
purge them once with `queue.clean(0, 0, "completed")` during a maintenance window. Add a Redis
memory alert. Set `maxmemory-policy noeviction` for this instance so pressure surfaces as errors
rather than silently evicting rate-limit and dedup keys.

**Regression risk.** Medium. Enabling retries means handlers must be idempotent — verify
`JOB_REFRESH_READ_MODELS` and `JOB_REFRESH_PREDICTIONS` can safely run twice before raising
`attempts`. If they cannot, fix idempotency first; retries on a non-idempotent handler is a
worse failure mode than no retries.

**Tests to add**
- A failing job is attempted the configured number of times, then lands in the failed set.
- Completed jobs are removed per `removeOnComplete`.
- Re-adding the same `jobId` does not enqueue a second job.
- Both intelligence handlers are idempotent when invoked twice with identical payloads.

**Exact verification steps**
1. Enqueue a deliberately failing job; assert N attempts in the worker log and one entry in the
   failed set.
2. Enqueue 2,000 succeeding jobs; assert `getCompletedCount()` stabilises at ≤ 1,000.
3. Double-click "refresh" in the UI; assert one job, not two.

**Similar locations to inspect**
- `src/shared/queue/in-memory-queue.ts` — the non-Redis fallback; confirm it does not silently
  swallow failures in development, which would hide handler bugs before production.
- H6 (event bus) is the same *class* of problem in a different subsystem (Redis Pub/Sub rather
  than BullMQ) and has a separate fix; the two should be remediated together.

---

### 🟠 H11 — No graceful shutdown: every deploy kills in-flight jobs, and dead workers look healthy

| Field | Value |
|---|---|
| **Classification** | Confirmed Defect |
| **Severity** | **High** |
| **Category** | Deployment safety / Availability |
| **Disposition** | **Open — Release Blocker** |
| **Release impact** | Blocks release |
| **Likelihood** | High — occurs on every deploy, restart, and autoscale event |
| **Affected roles** | All tenants (lost work); operators (undetectable worker death) |

**Affected locations**
- `src/jobs/worker.ts:1-19` — no signal handling; `setInterval` keeps the process alive
- `src/shared/queue/worker.ts:44-49` — `closeWorkers()` defined, never called
- `src/shared/queue/index.ts:26-32` — `closeQueues()` defined, never called
- `src/instrumentation.ts` — no shutdown hook
- `fly.toml:16` — `worker = "node worker.cjs"`, no signal configuration

**Evidence**

```
$ grep -rn "SIGTERM\|SIGINT\|beforeExit" src --include=*.ts
(no matches)

$ grep -rn "closeWorkers" src --include=*.ts
src/shared/queue/worker.ts:44:export async function closeWorkers(): Promise<void> {
   ← only the definition; no call site anywhere
```

The worker entry point in full:

```typescript
// src/jobs/worker.ts
startIntelligenceWorker();

// Keep the Node process alive. With Redis, the BullMQ worker connection already
// prevents exit; this interval is a safety net for the in-memory fallback.
setInterval(() => {
  logger.info("worker.heartbeat");
}, 60000);
```

**Root cause.** Shutdown functions were written but never wired to process signals — the
composition root has no lifecycle management. Separately, the `setInterval` decouples process
liveness from worker liveness, which is the opposite of what a heartbeat should do.

**Impact — two distinct failures.**

1. *Work is destroyed on every deploy.* Fly.io sends `SIGTERM` and `SIGKILL`s after the grace
   period. With no handler, Node exits immediately: the BullMQ worker never calls `close()`, so
   in-flight jobs are not returned to the queue. They remain `active` until the stalled check
   reclaims them — and given H10 sets `attempts: 1`, a reclaimed job that exceeds
   `maxStalledCount` is **failed permanently rather than retried**. H10 and H11 compound: deploying
   during active work silently destroys it.
2. *A dead worker is indistinguishable from a healthy one.* If the BullMQ Redis connection dies
   unrecoverably, the `setInterval` keeps the process alive and still logging `worker.heartbeat`
   every 60s. The orchestrator sees a running process, the logs show a heartbeat, and no jobs are
   processed. There is no worker health check in `fly.toml` and no queue-depth alert, so this
   state is invisible.

**Recommended solution.** Add a real shutdown path and make the heartbeat prove liveness.

```typescript
// src/jobs/worker.ts
import { startIntelligenceWorker } from "@/modules/intelligence/server";
import { closeWorkers } from "@/shared/queue/worker";
import { closeQueues } from "@/shared/queue";
import { env } from "@/shared/config";
import { logger, initSentry } from "@/shared/observability";

initSentry();
logger.info("worker.starting", { redisConfigured: Boolean(env.REDIS_URL) });

const worker = startIntelligenceWorker();

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("worker.shutdown.begin", { signal });
  clearInterval(heartbeat);
  try {
    // worker.close() waits for in-flight jobs to finish before resolving, so the
    // platform's grace period must exceed the longest expected job duration.
    await closeWorkers();
    await closeQueues();
    logger.info("worker.shutdown.complete", { signal });
    process.exit(0);
  } catch (error) {
    logger.error("worker.shutdown.failed", {
      signal,
      error: error instanceof Error ? error.message : "unknown",
    });
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// Heartbeat must reflect the worker's real state, not merely that the process exists.
const heartbeat = setInterval(() => {
  if (!worker.isRunning()) {
    logger.error("worker.notRunning");
    process.exit(1);   // let the orchestrator restart us instead of idling silently
    return;
  }
  logger.info("worker.heartbeat");
}, 60_000);
```

The web process needs the same treatment for `closeQueues()` and the Redis event-bus connections;
Next.js does not expose a shutdown hook, so register the handlers in `instrumentation.ts`.

**Deployment considerations.** Set the platform grace period above the longest job runtime — on
Fly.io, `kill_timeout` in `fly.toml` (default 5s, far too short for AI generation):

```toml
[processes]
  app = "node server.js"
  worker = "node worker.cjs"

# Allow in-flight AI jobs to finish before SIGKILL.
kill_signal = "SIGTERM"
kill_timeout = "60s"
```

Also add a worker health check and a queue-depth alert so silent death is detectable.

**Regression risk.** Low for the shutdown path. The `process.exit(1)` on `!worker.isRunning()`
carries restart-loop risk if `isRunning()` returns false transiently — verify BullMQ's semantics
and consider requiring two consecutive failed checks before exiting.

**Tests to add**
- Send `SIGTERM` to the worker with a long-running job in flight; assert the job completes and the
  process exits 0.
- Assert `closeWorkers()` and `closeQueues()` are both invoked on `SIGTERM`.
- Simulate a dead worker (`isRunning() === false`); assert the process exits non-zero.

**Exact verification steps**
1. Enqueue a job that sleeps 20s. 2. Send `SIGTERM` mid-execution. 3. Assert the job reaches
   `completed`, not `failed` or `stalled`, and the process exited 0.
4. Repeat with `kill_timeout` at its 5s default; confirm the job is lost — this demonstrates why
   the `fly.toml` change is part of the fix, not optional.
5. Perform a rolling deploy with jobs in flight; assert zero lost and zero duplicated.

**Similar locations to inspect**
- `src/shared/redis/client.ts` — the shared Redis connection is never closed.
- `src/shared/events/redis-event-bus.ts` — `publisher` and `subscriber` connections are never
  closed; both leak on restart.
- `src/shared/database/prisma.ts` — confirm `$disconnect()` on shutdown.

---

### 🟡 M1 — `/api/ready` is unauthenticated and leaks internal error details

**Status:** Confirmed Defect · **Severity:** Medium · **Category:** Information disclosure
**Location:** `src/app/api/ready/route.ts:12-47`; allow-listed at `src/modules/auth/infrastructure/auth.ts:227`

Raw exception messages are returned to any anonymous caller. Observed live:

```
$ curl -s http://127.0.0.1:3200/api/ready
{"status":"not_ready","checks":[{"name":"database","ok":true},
 {"name":"redis","ok":false,"error":"Reached the max retries per request limit (which is 3)…"}]}
```

Prisma connection errors embed the database host and port (I saw
`Can't reach database server at '/var/tmp:5433'` in the H1 logs). On a real deployment that
discloses internal hostnames to anyone who polls the endpoint during an incident — exactly when it
is most useful to an attacker.

**Fix:** return booleans publicly; log details server-side.

```typescript
const allOk = checks.every((c) => c.ok);
// Detail is for operators, not for anonymous callers.
if (!allOk) {
  logger.error("readiness.failed", { checks });
}
return NextResponse.json(
  { status: allOk ? "ready" : "not_ready", checks: checks.map((c) => ({ name: c.name, ok: c.ok })) },
  { status: allOk ? 200 : 503, headers: { "Cache-Control": "no-store" } },
);
```

Also note `createStandaloneRedis` opens a **new connection on every request**, making the endpoint
a cheap connection-exhaustion vector. Reuse `getSharedRedis()` and rate-limit the route.

---

### 🟡 M2 — OpenTelemetry falls back to `ConsoleSpanExporter` in production

**Status:** Confirmed Defect · **Severity:** Medium · **Category:** Observability / Cost
**Location:** `src/shared/observability/telemetry.ts:27-29`; `src/shared/config/env.ts:83-101`

```typescript
const exporter = env.OTEL_EXPORTER_OTLP_ENDPOINT
  ? new OTLPTraceExporter({ url: env.OTEL_EXPORTER_OTLP_ENDPOINT })
  : new ConsoleSpanExporter();     // ← production default if the var is unset
```

`OTEL_EXPORTER_OTLP_ENDPOINT` is **not** in `PRODUCTION_REQUIRED`, so a valid production deploy
dumps a full span object per request to stdout. Observed live:

```
{ resource: { attributes: { 'service.name': 'omniconnect-ai' } },
  name: 'GET /admin/tickets', traceId: '105654cbb0…', duration: 19389.941,
  attributes: { 'http.target': '/admin/tickets', 'http.status_code': 200, … } }
```

**Impact:** log-ingestion cost, drowned application logs, measurable serialisation overhead, and
`http.target` values can carry sensitive query strings.

**Fix:** no-op when unconfigured in production, and log the decision once.

```typescript
let exporter: SpanExporter;
if (env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  exporter = new OTLPTraceExporter({ url: env.OTEL_EXPORTER_OTLP_ENDPOINT });
} else if (env.NODE_ENV === "production") {
  // Console spans would flood production logs; tracing is simply disabled.
  logger.warn("telemetry.disabled", { reason: "OTEL_EXPORTER_OTLP_ENDPOINT not set" });
  return;
} else {
  exporter = new ConsoleSpanExporter();
}
```

---

### 🟡 M3 — Projects: no UI, and a check-then-insert race on names

**Status:** Confirmed Defect · **Severity:** Medium · **Category:** Dead code / Concurrency
**Locations:** `src/modules/organizations/presentation/project-actions.ts` (6 actions);
`src/modules/organizations/infrastructure/project.repository.ts:50-73`; `prisma/schema.prisma:186-214`

No `/projects` route exists, yet three actions call `revalidatePath("/projects")`:
```
$ find src/app -ipath '*project*'          # (no output)
$ grep -rn "createProjectAction\|listProjectsAction" src --include=*.tsx   # (no output)
```

Uniqueness is enforced in application code with no database constraint:
```typescript
const existing = await prisma.project.findFirst({
  where: { organizationId: input.organizationId, name: input.name },
});
if (existing) throw new Error("A project with this name already exists…");
const project = await prisma.project.create({ … });   // ← race window
```
`Project` has no `@@unique([organizationId, name])`, so two concurrent requests both pass the check
and both insert.

**Fix:** add the constraint (see the H5 schema patch) and catch `P2002` instead of pre-checking.
**Decision required:** Q1 in §3.6 — ship the UI or delete the feature.

---

### 🟡 M4 — Unified inbox loads every message for every listed conversation

**Status:** Confirmed Defect · **Severity:** Medium · **Category:** Performance / Scalability
**Locations:** `src/modules/conversations/infrastructure/message.repository.ts:66-81`;
consumed by `src/modules/conversations/application/unified-inbox.ts:71`

```typescript
async listLatestByConversationIds(conversationIds: string[]) {
  const rows = await prisma.message.findMany({
    where: { conversationId: { in: conversationIds } },
    orderBy: { createdAt: "desc" },
    // ← no `take`: fetches EVERY message for every conversation
  });
  const latest: Record<string, MessageRecord> = {};
  for (const row of rows) {
    if (!latest[row.conversationId]) latest[row.conversationId] = toRecord(row);
  }
  return latest;                       // …to keep exactly one message each
}
```

Fifty conversations averaging 200 messages transfers 10,000 rows to render 50 previews. Growth is
unbounded in conversation history, so the inbox degrades continuously in production. Most other
repositories do this correctly (`take: options.limit ?? 50`), which makes this an isolated slip
rather than a systemic pattern.

**Fix:** one row per conversation via `DISTINCT ON` (PostgreSQL):

```typescript
const rows = await prisma.$queryRaw<MessageRow[]>`
  SELECT DISTINCT ON ("conversationId") *
  FROM "Message"
  WHERE "conversationId" = ANY(${conversationIds}::text[])
  ORDER BY "conversationId", "createdAt" DESC
`;
```
Ensure a composite index on `Message(conversationId, createdAt DESC)` exists.

---

### 🟡 M5 — Shopify mandatory GDPR webhooks and `app/uninstalled` are unhandled

**Status:** Confirmed Defect · **Severity:** Medium · **Category:** Compliance / Data hygiene
**Location:** `src/modules/ecommerce/application/apply-shopify-webhook.ts:33-75`

Four topics are handled (`products/*`, `orders/*`, `checkouts/*`). Missing:

| Topic | Consequence |
|---|---|
| `customers/data_request` | **Mandatory** for Shopify App Store listing |
| `customers/redact` | **Mandatory**; legal obligation to erase customer data |
| `shop/redact` | **Mandatory**; erase shop data 48h after uninstall |
| `app/uninstalled` | Integration stays "connected" with a dead token; sync jobs fail forever |

```
$ grep -rn "customers/redact\|shop/redact\|customers/data_request\|app/uninstalled" src
(no matches)
```

Unhandled topics currently return `{ ok: true, message: "Topic ignored" }` (line 75) — Shopify
receives a 200 and believes the obligation was met.

**Fix:** implement all four; for `app/uninstalled`, mark the integration disconnected and purge
stored tokens. Verify with Shopify's automated compliance checks before submission.

---

### 🟡 M6 — Stripe API version is unpinned

**Status:** Probable Risk · **Severity:** Medium · **Category:** Integration stability
**Location:** `src/modules/organizations/infrastructure/stripe-payment-gateway.ts:23`

```typescript
this.client = new Stripe(env.STRIPE_SECRET_KEY);   // no apiVersion
```

The client then follows the Stripe **account's** default API version — a dashboard setting that can
change independently of a deploy. `billing.ts:120` reads `invoice.subscription`, which newer API
versions relocate to `invoice.parent.subscription_details.subscription`. If the account version
moves, `invoice.payment_failed` silently no-ops (the `!subscriptionId` guard returns early),
compounding H3.

**Fix:** pin explicitly, matching the installed `stripe@^17.1.0` typings:
```typescript
this.client = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-09-30.acacia",   // pin: webhook payload shapes are version-dependent
  typescript: true,
});
```
Marked *Probable Risk* rather than Confirmed because it depends on an account setting I could not
inspect.

---

### 🟡 M7 — `notFound()` and `redirect()` return HTTP 200

**Status:** Confirmed Defect · **Severity:** Medium · **Category:** HTTP correctness / Monitoring
**Locations:** `src/modules/organizations/presentation/require-store-access.ts:25`;
`src/app/admin/layout.tsx:12`

Measured live — tenant A requesting tenant B's resources, and a non-admin requesting admin pages:

| Request | Expected | Actual |
|---|---|---|
| `/stores/{tenantB}` as tenant A | 404 | **200** (not-found body) |
| `/stores/does-not-exist-xyz` | 404 | **200** |
| `/admin/organizations` as non-admin | 307 → `/dashboard` | **200** (dashboard body) |

**Important:** these are *status-code* defects, not authorization defects. I verified the bodies
contain no leaked data — see Verified Controls at the end of §4.

**Impact:** uptime monitors and synthetic checks read 200 as success and will not alert on a broken
deep link; CDNs may cache error pages as valid; crawlers index not-found pages. It also makes
automated authorization testing unreliable, since status alone cannot distinguish allow from deny.

**Root cause:** `notFound()` / `redirect()` are invoked from within `"use server"`-marked functions
and a layout during a streamed render, after headers are flushed.

**Fix:** move the guard into the page/route body rather than a `"use server"` helper, so Next.js can
emit the correct status before streaming begins. Verify with
`curl -o /dev/null -w '%{http_code}'` on each case.

---

### 🟡 M8 — Accessibility: no skip link, unnamed collapsed nav links, unmanaged drawer focus

**Status:** Confirmed Defect (static review) · **Severity:** Medium · **Category:** Accessibility
**Locations:** `src/app/layout.tsx:37-47`; `src/components/app-shell.tsx:129-162`, `220-264`

Three WCAG 2.1 AA issues:

1. **No skip link (2.4.1 Bypass Blocks, Level A).** `grep -n "sr-only\|Skip to"` across
   `layout.tsx` and `app-shell.tsx` returns nothing. Keyboard and screen-reader users traverse ~15
   navigation links on every page before reaching content.
2. **Collapsed sidebar links have no accessible name (4.1.2 / 2.4.4, Level A).** When
   `collapsed === true`, the label is not rendered:
   ```tsx
   <Icon className="h-4 w-4 shrink-0" />
   {!collapsed && <span className="truncate">{item.label}</span>}
   ```
   leaving each `<Link>` containing only an SVG. Screen readers announce "link" with no destination.
3. **Mobile drawer traps nothing (2.1.2 / 2.4.3).** The drawer renders without moving focus into
   it, without a focus trap, without Escape-to-close, and without restoring focus to the trigger on
   close.

**Fix sketch:**
```tsx
// layout.tsx — first focusable element in the body
<a href="#main-content"
   className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2">
  Skip to main content
</a>
…
<main id="main-content" tabIndex={-1}>{children}</main>
```
```tsx
// app-shell.tsx — keep the name available when collapsed
<Link href={item.href} aria-label={collapsed ? item.label : undefined} …>
  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
  {!collapsed && <span className="truncate">{item.label}</span>}
</Link>
```
For the drawer, use a focus-trapping primitive (Radix is already a dependency) and add an Escape
handler.

**Caveat:** static review only. A full axe-core / screen-reader pass is required before claiming AA
conformance — colour contrast in particular was not evaluated.

---

### 🟡 M9 — Encryption uses a bare SHA-256 of the secret, with no key rotation path

**Status:** Design Concern · **Severity:** Medium · **Category:** Cryptography
**Location:** `src/shared/security/encryption.ts:14-31`, `85-105`

```typescript
const raw = encoder.encode(`${SALT}:${secret}`);
const hash = await assertCrypto().subtle.digest("SHA-256", raw);   // ← not a KDF
return assertCrypto().subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
```

Three concerns:

1. **Not a KDF.** A single SHA-256 pass is fast by design. If `ENCRYPTION_KEY` is a human-chosen
   passphrase (the schema requires only `min(32)` characters, and `.env.example` ships
   `change-me-to-a-32-char-random-secret-key`), it is brute-forceable. HKDF or PBKDF2 is the
   correct primitive; the `SALT` is also a hard-coded constant, not a salt.
2. **No key versioning.** The `enc:` prefix carries no key id, so rotating `ENCRYPTION_KEY` renders
   every stored Meta/Shopify token permanently undecryptable. There is no rotation path.
3. **Plaintext downgrade accepted.** `decryptString` returns any value lacking the `enc:` prefix
   unchanged (lines 87-90). Reasonable as a migration aid, but it should be time-boxed and removed.

**Fix:** derive with HKDF, and version the prefix (`enc:v2:`) so two keys can be supported during
rotation — decrypt with either, encrypt with the current one.

**Note:** the key is correctly required in production (`env.ts:89`) and the AES-GCM construction
itself (random 12-byte IV per encryption, IV prepended) is sound.

---

### 🟡 M10 — Login throttling is per `email + IP`, with no global limit and no user feedback

**Status:** Probable Risk · **Severity:** Medium · **Category:** Authentication
**Location:** `src/modules/auth/infrastructure/auth.ts:35-41`

**Verified working.** Eight bad-password attempts followed by the correct password:
```
attempt 1..8 -> 302 (each)
correct password -> session: null      # blocked
$ redis-cli --scan --pattern '*credentials*'
credentials:owner-a@example.com:127.0.0.1
```

Two residual weaknesses:

1. **Key includes the client IP.** Keying on `email:ip` correctly prevents an attacker from locking
   a victim out, but it caps an attacker at 5 attempts *per IP*. A rotating proxy pool brute-forces
   without limit. There is no per-account global counter and no progressive lockout.
2. **No feedback.** `authorize` returns `null` on rate-limit exactly as it does on a wrong password,
   so a legitimate user who mistypes five times sees "invalid credentials" for 15 minutes with no
   explanation, and will likely attempt a password reset.

**Fix:** layer a global per-account counter (e.g. 20 attempts/hour across all IPs) on top of the
per-IP limit, add CAPTCHA after N failures, and return a distinguishable `RateLimitError` so the UI
can say "too many attempts — try again in 15 minutes."

Also note `clientIp()` (`rate-limit.ts:90-108`) falls back to the rightmost `x-forwarded-for` hop
when `RATE_LIMIT_IP_HEADER` is unset. That is a sound default behind a proxy, but if the app is ever
exposed directly the header is fully attacker-controlled and the limiter is bypassable.
`RATE_LIMIT_IP_HEADER` should be required in production.

---

### 🟡 M11 — Admin authorization depends solely on the layout guard

**Status:** Design Concern · **Severity:** Medium · **Category:** Authorization (defence in depth)
**Locations:** `src/app/admin/layout.tsx:11-14`; the five unguarded pages under `src/app/admin/`

Guard census:
```
0 guards | src/app/admin/page.tsx
0 guards | src/app/admin/logs/page.tsx
0 guards | src/app/admin/organizations/page.tsx
0 guards | src/app/admin/coupons/page.tsx
0 guards | src/app/admin/tickets/page.tsx
2 guards | src/app/admin/users/page.tsx        ← the only self-guarding page
```

**I attempted to exploit this and could not.** Both a full page load and a crafted RSC request with
a `Next-Router-State-Tree` header were correctly denied, with no data leaked:

```
$ curl -b nonadmin.jar -H 'RSC: 1' -H 'Next-Router-State-Tree: …' \
    http://127.0.0.1:3200/admin/organizations
HTTP=200, 2361 bytes — grep 'Org A|Org B' → no matches
```

So this is **not** a confirmed vulnerability, and I am not reporting it as one. It is a
defence-in-depth concern: all mutating admin server actions *do* call `requireSuperAdmin()`
(verified in `support/actions.ts:83,94`, `saas-coupon.actions.ts:22,74`, `users/actions.ts:154,162`),
but read-side protection for five pages rests on a single layout. Next.js documentation explicitly
advises against relying on layouts for authorization, because they do not re-render on every
navigation. `admin/users/page.tsx` already demonstrates the correct pattern.

**Fix:** call `await requireSuperAdmin()` at the top of each admin page, and keep the layout guard.

---

### 🟡 M12 — No CD pipeline, no rollback procedure, no backup strategy

**Status:** Confirmed Gap · **Severity:** Medium · **Category:** DevOps / Disaster recovery
**Locations:** `.github/workflows/ci.yml` (the only workflow); `deploy.sh`; `docs/operations.md`

| Capability | State |
|---|---|
| CI quality gates | ✅ lint, typecheck, test, migrate, build, smoke |
| Automated deployment | ❌ `deploy.sh` is manual, run from a developer machine |
| Migration on deploy | 🟡 `fly.toml` `release_command` ✅; `deploy.sh` and `Dockerfile` ✗ |
| Rollback procedure | ❌ none documented; migrations have no `down` scripts |
| Database backups | ❌ not documented or configured |
| Restore rehearsal | ❌ never performed |
| Secret scanning in CI | ❌ |
| `npm audit` in CI | ❌ (clean when run manually) |
| Staging environment | ❌ not referenced anywhere |

The `Dockerfile` runner stage copies only `public`, `.next/standalone`, and `.next/static` — the
`prisma/` directory is absent, so `prisma migrate deploy` **cannot** be run from inside the
production image. Fly.io works around this because `release_command` runs in a build-context
machine, but the Docker path documented in `README.md` and `deploy.sh` has no migration story at all.

**Fix:** add a deploy workflow gated on CI; copy `prisma/` into the runner stage; document a
rollback runbook (previous image + migration-compatibility policy); enable automated Postgres
backups with a rehearsed restore; add `npm audit` and secret scanning to CI.

---

### 🟡 M13 — 130 non-concurrent index builds lock writes during the release command

**Classification:** Confirmed Defect · **Severity:** Medium · **Disposition:** Open — Required Before Release
**Likelihood:** High once tables are large; harmless while they are small
**Location:** `prisma/migrations/*/migration.sql` (130 `CREATE INDEX`); `fly.toml:13` `release_command`

```
CREATE INDEX total: 130
CONCURRENTLY:        0
```

PostgreSQL's plain `CREATE INDEX` takes a `SHARE` lock, blocking all writes to the table until the
build completes. On an empty database (first deploy) this is instant. But several migrations add
indexes to **already-populated** tables — `20260728081303_audit_fixes_token_version_and_indexes`
and `20260728081713_audit_fixes_additional_indexes` exist precisely to index existing data. On a
`Message` or `AuditLog` table with millions of rows, that is minutes of write downtime during
`release_command`, while the old app version is still serving traffic and attempting writes.

**Fix.** `CREATE INDEX CONCURRENTLY` cannot run inside a transaction, and Prisma wraps migrations
in one, so this needs the documented escape hatch: mark the migration as unapplied-but-recorded and
run the concurrent build outside Prisma.

```sql
-- prisma/migrations/<ts>_add_message_conversation_idx/migration.sql
-- Prisma runs migrations in a transaction; CONCURRENTLY cannot. Apply this index
-- out-of-band (see docs/operations.md) and record the migration as applied.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Message_conversationId_createdAt_idx"
  ON "Message" ("conversationId", "createdAt" DESC);
```

Run it via `psql` during a low-traffic window, then
`prisma migrate resolve --applied <migration_name>`. Document the procedure in
`docs/operations.md`. For future index additions on large tables, make this the default path.

**Regression risk.** Low, but `CREATE INDEX CONCURRENTLY` can leave an `INVALID` index if it fails
midway; the runbook must include detecting and dropping invalid indexes before retrying.

**Verification:** on a table seeded with ~1M rows, apply the migration and confirm concurrent
`INSERT`s succeed throughout (`pg_stat_activity` shows no `ShareLock` waits).

---

### 🟡 M14 — `ADD COLUMN … NOT NULL` without a default breaks expand/contract and rolling deploys

**Classification:** Confirmed Defect · **Severity:** Medium · **Disposition:** Open — Required Before Release
**Likelihood:** Low for the two historical occurrences (tables were empty); High for the pattern recurring
**Location:** `prisma/migrations/20260725100603_notifications/migration.sql:12,14`

```sql
ALTER TABLE "Notification" ADD COLUMN "body" TEXT NOT NULL,
ADD COLUMN "title" TEXT NOT NULL,
```

Two of the 15 `ADD COLUMN … NOT NULL` statements omit a `DEFAULT` (the other 13 include one). Two
consequences:

1. On a **populated** table, this statement fails outright — so the migration is not safely
   re-appliable to an environment that already has `Notification` rows.
2. During a **rolling deploy**, the new column exists before the old application version is
   drained. The old version's `INSERT` omits `title`/`body`, and with `NOT NULL` and no default
   those inserts fail — so notifications break for the duration of the rollout.

This is the expand/contract discipline the new-version/old-version coexistence requirement depends
on. The prior migration also drops a foreign key (`Notification_userId_fkey`, line 9) and
re-adds it, which briefly leaves referential integrity unenforced.

**Fix (pattern, for future migrations).** Three phases across two releases:

```sql
-- Release N: expand — nullable, or NOT NULL with a default
ALTER TABLE "Notification" ADD COLUMN "title" TEXT;

-- Release N: backfill (batched, outside the migration transaction for large tables)
UPDATE "Notification" SET "title" = '' WHERE "title" IS NULL;

-- Release N+1, only after the old version is fully drained: contract
ALTER TABLE "Notification" ALTER COLUMN "title" SET NOT NULL;
```

**Not retroactively fixable** — the two statements are in an applied migration and rewriting
migration history is worse than the defect. The actionable output is a documented migration policy
plus a CI check.

```yaml
# .github/workflows/ci.yml — fail the build on a rolling-deploy-unsafe migration
- name: Check migration safety
  run: |
    if grep -rn "ADD COLUMN.*NOT NULL" prisma/migrations/*/migration.sql | grep -v DEFAULT; then
      echo "::error::ADD COLUMN NOT NULL without DEFAULT is unsafe for rolling deploys"
      exit 1
    fi
```

Note this check will flag the two existing occurrences; allowlist those specific lines so the gate
protects new migrations without requiring history rewrites.

**Verification:** apply the full migration chain to a database seeded with `Notification` rows and
confirm it either succeeds or fails loudly in CI rather than in production.

---

### 🟡 M15 — Media relies on expiring Instagram CDN URLs; declared S3 storage is unimplemented

**Classification:** Confirmed Missing Requirement + specification conflict · **Severity:** Medium
**Disposition:** **Needs Product Decision** · **Likelihood:** High — CDN URL expiry is certain, not probabilistic
**Locations:** `prisma/schema.prisma` `UgcAsset.mediaUrl`; `AGENTS.md:112`; `src/shared/config/env.ts:39-42`

**The specification conflict.** `AGENTS.md` §2 declares the tech stack as authoritative and lists:

| Concern | Choice |
|---|---|
| Storage | AWS S3-compatible |

and `env.ts` defines `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. But
there is no implementation at all:

```
$ grep -rn "S3_BUCKET\|@aws-sdk\|aws-sdk\|putObject\|presigned\|multipart/form-data" src package.json
src/shared/config/env.ts:40:  S3_BUCKET: z.string().optional(),
```

No SDK dependency, no upload route, no storage port. Per the core rules I am documenting the
conflict rather than choosing an interpretation: either the declared stack is aspirational and
`AGENTS.md` should be corrected, or a required capability was never built.

**The functional consequence, independent of the conflict.** `UgcAsset` stores only `mediaUrl`, and
`SocialMention`/media records follow the same pattern. Instagram and Facebook CDN URLs are
**time-limited signed URLs** — they expire within days. So the UGC gallery, the ambassador
programme, and the "ready-made media kit" advertised in `README.md:31` will progressively render
broken images for any asset older than the expiry window. Rights approval (`rightsStatus`,
`approvedBy`, `approvedAt`) is recorded against an asset the platform cannot actually still show —
which undermines the audit trail those columns exist to provide.

**Proposed behaviour.** On `UgcAssetCollected`, enqueue a job that fetches the media once and
mirrors it to S3-compatible storage, storing a durable key alongside the original URL:

```prisma
model UgcAsset {
  // …existing fields…
  mediaUrl     String?   // original CDN URL, retained for provenance
  storageKey   String?   // durable object key; authoritative for display
  mirroredAt   DateTime?
}
```

**Acceptance criteria (proposed, pending the decision below)**
- A collected UGC asset remains displayable ≥ 12 months after collection.
- Mirroring failures are retried and surfaced, not silent.
- Media is served via time-limited presigned URLs, never a public bucket.
- Rights revocation deletes the mirrored object, not just the database row.
- Uploaded/mirrored content is content-type and size validated before storage.

**Questions for the product owner**
1. Is durable media retention required, or is the product content to show only recent media?
2. Is *user upload* required anywhere (media kit assets, brand-deal collateral, ticket
   attachments), or is mirroring remote media the only need? This determines whether an upload
   surface — with its own validation, virus-scanning, and quota concerns — is in scope.
3. If neither is required, should `AGENTS.md` and the `S3_*` env vars be removed to eliminate the
   misleading signal?

**Release-blocking recommendation:** not a blocker. It degrades over time rather than failing at
launch, and it needs a product decision before any implementation. It should not ship silently,
though — if deferred, record it as an accepted risk with the expiry behaviour documented.

---

### 🔵 Low-severity findings

| ID | Finding | Location | Note |
|---|---|---|---|
| **L7** | Only root-level `loading.tsx` / `error.tsx`; no segment boundaries | `src/app/loading.tsx`, `src/app/error.tsx` | All four boundary files (`loading`, `error`, `not-found`, `global-error`) exist **only at the app root**. Next.js cascades them, so every route *is* covered — this is not a missing-states defect. But the granularity is coarse: any failure inside `/stores/[id]/analytics` blanks the entire page rather than the failing panel, and every navigation replaces the whole shell with the root loading UI. Add segment-level `error.tsx`/`loading.tsx` for the analytics and inbox subtrees, where partial failure is most likely and most tolerable. |
| **L1** | 65 of 88 domain events have no subscriber | repo-wide | Mostly forward-looking, but obscures real gaps like H7. Triage each. |
| **L2** | `/support` and `/analytics/journeys` are unreachable from the nav | `app-shell.tsx:79-123` | `/support` is public and linked pre-auth, but authenticated users cannot find it. Two nav entries also both point to `/stores` ("Stores" and "Campaigns"), so both highlight as active simultaneously. |
| **L3** | Admin nav injected via array index | `app-shell.tsx:126` | `sections[5]!.items.push(…)` breaks silently if sections are reordered; the `!` assertion also sits awkwardly beside the `AGENTS.md` no-`any` rule. Look the section up by label. |
| **L4** | `logger.debug` is never gated | `observability/logger.ts:53-58` | Debug output is emitted at all levels in production. Gate on `NODE_ENV` or a `LOG_LEVEL` var. |
| **L5** | Scale-to-zero conflicts with webhook delivery | `fly.toml:20-23` | `min_machines_running = 0` + `auto_stop_machines = "stop"` means cold starts on webhook delivery (Meta expects a fast ack) and no Pub/Sub subscriber while stopped (compounds H6). The 512 MB shared-CPU VM is also modest for Next.js SSR plus AI orchestration. |
| **L6** | No bot protection on registration | `auth/presentation/actions.ts` | No CAPTCHA, no email-domain restriction, no verification-before-provisioning. Free-tier abuse costs real OpenAI spend. See Q6. |

---

### 🔎 Cross-cutting review — systemic patterns

Per the final cross-cutting pass, two systemic patterns emerge that are larger than any individual
finding and should drive remediation sequencing.

**S1 — The entire asynchronous layer is fire-and-forget.** Five findings across three subsystems
share one root cause: no delivery or execution guarantees were designed anywhere.

| Subsystem | Finding | Failure mode |
|---|---|---|
| Redis Pub/Sub event bus | C2 | Events double-fire on the publisher |
| Redis Pub/Sub event bus | H6 | No retry, no DLQ, lost while disconnected |
| BullMQ queue | H10 | `attempts: 1` — failed jobs lost; completed jobs never pruned |
| Process lifecycle | H11 | In-flight jobs destroyed on every deploy |
| Handlers | C2, H7 | No idempotency keys on side-effecting handlers |

Fixing these individually will produce five partial solutions. The coherent fix is a single
decision (§3.6 Q4) followed by one implementation: persist events transactionally (outbox), deliver
via BullMQ with `jobId` deduplication and bounded retention, and give every side-effecting handler
an idempotency key. C2's minimal patch is worth shipping immediately as a stop-gap, but it should
not be mistaken for the fix.

**S2 — Defensive rigour is inconsistent between sibling implementations.** Repeatedly, one
implementation is careful and its neighbour is not — which means the knowledge existed and simply
was not applied uniformly. This is the most reliable predictor of where further defects remain.

| Careful implementation | Careless sibling | Finding |
|---|---|---|
| `shopify.connector.ts` — strict `*.myshopify.com` allowlist, path-traversal guard | `woocommerce.connector.ts` — accepts any host, `http://` included | H9 |
| Meta webhook — signature **and** replay dedup | Stripe + Shopify webhooks — signature only | H2 |
| 108 call sites use `getCurrentUser()` (revocation-checked) | `/api/export/[id]` uses raw `auth()` | H4 |
| `Product`, `Store`, `User` — soft delete | `Project` — hard delete named "archive" | H5 |
| `admin/users/page.tsx` — self-guards | 5 other admin pages — rely on the layout only | M11 |
| 13 of 15 `ADD COLUMN NOT NULL` carry a `DEFAULT` | 2 do not | M14 |
| Most repositories bound queries with `take:` | `listLatestByConversationIds` — unbounded | M4 |

The remediation implication: for each of these, fixing the one instance is necessary but
insufficient. The pattern should become a lint rule, a CI check, or a code-review checklist item —
otherwise the next connector, webhook, route, or migration reintroduces it. Concrete candidates:
an ESLint rule banning `auth()` outside `src/modules/auth/`, the migration-safety grep in M14, and
requiring the `EcommerceConnector` interface to accept a pre-validated base URL (H9).

---

### ✅ Verified controls (tested and passing)

Recording these explicitly so remediation does not disturb working behaviour.

| Control | Evidence |
|---|---|
| **Tenant isolation (read)** | Tenant A probed 6 of tenant B's routes (`/stores/{B}`, `…/products`, `…/analytics`, `…/conversations`, `…/coupons`, `…/settings`). **Zero data leaked** — `grep 'Store B'` → 0 matches on every response. `tenantGuard.assertStoreAccess` holds. |
| **Admin authorization** | Non-admin probed all 6 admin routes, full-page and via crafted RSC request. **No admin data leaked**; `/admin/organizations` returned dashboard content. Super-admin login additionally requires an email OTP. |
| **Session revocation** | `getCurrentUser()` re-reads the canonical row and compares `tokenVersion` on 108 call sites (the sole exception is H4). |
| **Login rate limiting** | Verified engaging after 5 attempts; Redis-backed via an atomic Lua `INCR`/`PEXPIRE` script, so it is correct across replicas. |
| **Security headers** | All six present on live responses, plus a per-request nonce CSP with `strict-dynamic`, `frame-ancestors 'none'`, `object-src 'none'`. |
| **Webhook signatures** | Meta HMAC-SHA256 + replay dedup; Shopify HMAC-SHA256 with `timingSafeEqual`; Stripe signature verification — all applied **before** any side effect. |
| **Migrations** | All 40 apply cleanly to an empty database; `prisma migrate diff` reports **no drift**. |
| **Dependencies** | `npm audit` → **0 vulnerabilities**; no floating version ranges. |
| **Quality gates** | `lint` (`--max-warnings=0`), `typecheck`, `test`, `build` all pass from a clean `npm ci`. |
| **PII redaction** | `logger.redactValue` masks tokens, passwords, secrets, cookies, emails, and phone numbers recursively. |
| **RBAC on mutations** | Every mutating admin action calls `requireSuperAdmin()`; tenant actions call `requireRole("STORE_OWNER")`. |
| **Soft deletes** | `Product`, `Store`, and `User` all soft-delete correctly (`User` with a 30-day restore window). `Project` is the sole exception — H5. |
| **No XSS sink** | Zero `dangerouslySetInnerHTML` in 524 files; React's default escaping is relied on throughout. |
| **No SQL injection surface** | Only one raw query in the codebase — `prisma.$queryRaw\`SELECT 1\`` (a literal). No `$queryRawUnsafe` / `$executeRawUnsafe`. The Redis Lua script is a fixed constant with arguments passed via `KEYS`/`ARGV`. |
| **No dynamic code execution** | No `eval()` or `new Function()`. |
| **Secrets hygiene** | Pattern scan for Stripe live keys, AWS access keys, PEM private keys, Slack and GitHub tokens across all tracked files → **0 matches**. Only `.env.example` is tracked, and it contains placeholders. |
| **Migration forward-compatibility** | Across 40 migrations: **0** `DROP TABLE`, **0** `DROP COLUMN`, **0** `RENAME`. The 7 `ALTER COLUMN` statements are constraint *relaxations* (`DROP NOT NULL`), which are safe for old-version coexistence. |
| **Connector request timeouts** | All three eCommerce connectors and every Meta Graph call set an abort timeout (`AbortSignal.timeout` or an `AbortController`), so a hung upstream cannot exhaust the request pool. |
| **Shopify SSRF hardening** | `*.myshopify.com` allowlist plus `..`/`//` path-traversal rejection — the correct pattern, and the direct contrast that makes H9 a defect. |

---

## 4A. Deployment and Release Readiness

Assessed against the 21 release-readiness requirements and the 11 failure scenarios.

### 4A.1 Requirement assessment

| # | Requirement | Status | Evidence / gap |
|---|---|---|---|
| 1 | Production build succeeds from a clean environment | ✅ Pass | `npm ci` → `npm run build` exit 0, no manual steps |
| 2 | Artifacts versioned and traceable to a commit | ❌ Fail | No image tagging, no build metadata, no commit SHA embedded; `deploy.sh` builds from whatever is in the working tree |
| 3 | CI runs build, lint, type, test, migration checks | ✅ Pass | All present in `ci.yml` |
| 4 | CI runs security checks | ❌ Fail | No `npm audit`, no secret scanning, no SAST (M12) |
| 5 | Failed gates block deployment | ❌ Fail | CI is not wired to deployment at all; `deploy.sh` is run manually and gated on nothing |
| 6 | Dev/test/staging/prod configs separated | 🟡 Partial | Three env templates documented; **no staging environment exists** |
| 7 | Secrets stored securely, never exposed to client or logs | ✅ Pass | Server-only access via validated `env`; logger redacts token/secret/password/cookie keys; no `NEXT_PUBLIC_` secret leakage found |
| 8 | Required env vars documented and validated at startup | ✅ Pass | `validateProductionSecrets()` covers 17 vars + SMTP; **but** `AUTH_TRUST_HOST` is missing from it (C1) and `OTEL_EXPORTER_OTLP_ENDPOINT` is absent (M2) |
| 9 | Infrastructure config version-controlled | ✅ Pass | `fly.toml`, `Dockerfile`, `ci.yml` all tracked |
| 10 | Deployment permissions least-privilege | ⬜ Not Tested | No access to the Fly.io/Vercel org |
| 11 | Migrations tested and backward-compatible | 🟡 Partial | 40/40 apply cleanly, zero drift, no destructive ops — **but** M13 (locking) and M14 (NOT NULL) are rolling-deploy hazards |
| 12 | Old and new versions can safely coexist | ❌ Fail | M14 — a `NOT NULL` column added ahead of the old version being drained breaks its inserts. No expand/contract policy |
| 13 | Multiple instances avoid unsafe local state | ✅ Pass | Rate limits, event bus, queues, and webhook dedup all Redis-backed; `REDIS_URL` is required in production, and `getQueue()` throws without it |
| 14 | Sessions, queues, jobs, caches safe during deployment | ❌ Fail | **H11** — no `SIGTERM` handling; in-flight jobs destroyed. Sessions are stateless JWTs and are safe |
| 15 | Health, readiness, liveness reflect real state | 🟡 Partial | The `/api/health` vs `/api/ready` split is correct in principle, but **H1** makes liveness fail on a DB outage, and no health check is configured in `fly.toml` at all |
| 16 | New instances receive traffic only when ready | ❌ Fail | `fly.toml [http_service]` defines no `[[http_service.checks]]`, so Fly routes traffic as soon as the port binds — before readiness |
| 17 | Feature flags separate deploy from release | ❌ Fail | No feature-flag mechanism anywhere in the codebase |
| 18 | Failed deployments can be rolled back | ❌ Fail | No documented procedure; no migration-rollback policy (M12) |
| 19 | Post-deployment smoke tests cover critical workflows | ❌ Fail | CI smoke test hits only `/api/health` — a static route. It would pass while **all authentication is broken** (C1), which is precisely how C1 reached this state |
| 20 | Monitoring and alerts detect deployment regressions | ❌ Fail | Sentry is initialised; **no alerts, no dashboards, no SLOs** defined anywhere |
| 21 | Backup and restore validated | ❌ Fail | Not configured, not documented, never exercised (M12) |

### 4A.2 Failure-scenario walkthrough

| Scenario | Predicted outcome | Basis |
|---|---|---|
| Clean deployment | ⚠️ **Fails on Fly.io/Docker** — auth 500s on every request | C1, reproduced |
| Upgrade from current version | ⚠️ Succeeds only if `AUTH_TRUST_HOST` is set manually | C1 |
| Rolling deploy with active users | 🟡 Sessions survive (stateless JWT); in-flight requests drop without connection draining | Finding 14 |
| **Deploy while jobs are running** | ❌ **In-flight jobs destroyed and not retried** | H11 + H10, both verified |
| Migration failure | ⚠️ `release_command` fails → Fly aborts the release (correct), but no rollback runbook for a partially applied migration | M12 |
| Startup / health-check failure | ❌ Process binds the port and serves 500s without exiting; no readiness gate means traffic is routed to it | H1 + finding 16 |
| Partial deployment | 🟡 Fly handles machine-level rollout; app has no version negotiation, so M14-class schema changes break the old version | M14 |
| Missing configuration or secrets | ✅ **Handled well** — `validateProductionSecrets()` fails fast with an explicit list of missing vars |
| External dependency outage (Redis) | 🟡 `getQueue()` throws in production; rate limiting and dedup fail; `/api/ready` correctly reports 503 |
| External dependency outage (Postgres at boot) | ❌ **Total startup failure**, including `/api/health` | H1, reproduced |
| Rollback after migration | ❌ No down-migrations, no policy, never rehearsed | M12 |
| Feature-flag rollback | 🚫 Not applicable — no feature flags exist |

**Assessment.** Deployment readiness is the weakest area of the system: **11 of 21 requirements
fail** and 3 are partial. The single most alarming item is #19 — the existing smoke test passes on a
build whose authentication is entirely broken. A smoke test that cannot detect a total auth outage
provides false assurance, which is worse than having none.

---

## 5. Remediation Plan

### Phase 0 — Verification objective for audit pass 3

Per the stopping rules, pass 3 must have a defined objective rather than being another general
audit. Its scope is exactly:

1. **Verify Phase 1 fixes** — for each of C1, C2, H1–H6, H9–H11, confirm the named regression test
   fails against `06395c4` and passes after the fix. Code changing is not verification.
2. **Audit only the four areas pass 2 could not reach:** live third-party integration behaviour
   (Meta/Shopify/Stripe/OpenAI sandbox credentials required), load and concurrency at ≥10× expected
   peak, backup/restore and DR rehearsal, and machine-verified accessibility (axe-core + screen
   reader + contrast).
3. **Re-run the S2 sibling-inconsistency sweep** (§4 cross-cutting) after fixes land, to confirm no
   new instance of the pattern was introduced.

Pass 3 should *not* re-review architecture, product completeness, or the schema — those are covered
and stable across two passes.

### Phase 1 — Immediate release blockers

| # | Finding | Effort | Owner |
|---|---|---|---|
| 1 | **C1** — set `trustHost: true`; add `/api/auth/session` to the CI smoke test | ~1 h | Backend |
| 2 | **C2** — remove the eager `dispatchLocal` from `publish()`; add the exactly-once test | ~4 h | Backend |
| 3 | **H1** — wrap `ensureSuperAdmin` in try/catch, or move it to `release_command` | ~1 h | Backend |
| 4 | **H4** — swap `auth()` for `getCurrentUser()` in the export route | ~30 m | Backend |
| 5 | **H2** — add the `ProcessedWebhookEvent` ledger for Stripe (and Shopify) | ~4 h | Backend |
| 6 | **H3** — handle `customer.subscription.updated` and `invoice.payment_succeeded` | ~6 h | Backend |
| 7 | **H5** — soft-delete `Project`, add the unique constraint (or delete the feature) | ~3 h | Backend |
| 8 | **H9** — egress validation + HTTPS enforcement + header auth for WooCommerce | ~4 h | Backend/Security |
| 9 | **H10** — job options: `attempts`, `backoff`, bounded retention, `jobId` dedup | ~3 h | Backend |
| 10 | **H11** — `SIGTERM` shutdown for worker and web; `kill_timeout` in `fly.toml` | ~4 h | Backend/SRE |
| 11 | **H8 Tier 1** — regression tests for every fix above | ~3 d | All |

**Dependencies and sequencing.** These are not independent:

- **H10 depends on handler idempotency.** Do not raise `attempts` above 1 until
  `JOB_REFRESH_READ_MODELS` and `JOB_REFRESH_PREDICTIONS` are verified safe to run twice. Retries
  on a non-idempotent handler is a worse failure mode than no retries.
- **H11 depends on H10's retention change** to be meaningful, and on the `fly.toml`
  `kill_timeout` increase to be effective. Shipping the signal handler alone, with the 5s default
  grace period, does not fix the problem.
- **C2 and H6 are one subsystem.** Ship C2's minimal patch first (it is small and stops active
  customer harm), but schedule H6 in the same cycle — and settle §3.6 Q4 before starting H6, since
  the answer determines the design.
- **H3 is blocked on §3.6 Q3.** The handler can be written now; the entitlement policy cannot be
  chosen without a product decision.
- **H9's code fix should not be the only mitigation.** Disable IMDSv1 at the infrastructure layer
  in parallel — it is independent, faster, and protects against regression.

**Exit criterion:** each new test fails against `06395c4` and passes after the fix. Plus one
manual gate: a rolling deploy performed with jobs in flight, losing and duplicating zero jobs.

### Phase 2 — Required pre-release

| # | Finding | Effort |
|---|---|---|
| 9 | **H6** — move event delivery to BullMQ with retries and a DLQ | ~3 d |
| 10 | **H7** — cart state model + scheduled abandonment sweep, or remove the event | ~2 d |
| 11 | **M1** — stop leaking internals from `/api/ready`; reuse the shared Redis client | ~1 h |
| 12 | **M2** — disable console span export in production | ~30 m |
| 13 | **M5** — implement the Shopify GDPR webhooks + `app/uninstalled` | ~1 d |
| 14 | **M6** — pin the Stripe `apiVersion` | ~15 m |
| 15 | **M11** — add `requireSuperAdmin()` to all five admin pages | ~1 h |
| 16 | **M12** — CD workflow, rollback runbook, automated backups + one restore drill | ~3 d |
| 17 | **M10** — global per-account login throttle + rate-limit feedback | ~1 d |
| 18 | Add a `redis:7-alpine` service to CI | ~15 m |
| 19 | **M13** — out-of-band `CREATE INDEX CONCURRENTLY` runbook for large tables | ~4 h |
| 20 | **M14** — migration-safety CI gate + documented expand/contract policy | ~3 h |
| 21 | **Fix the smoke test** — assert `/api/auth/session` returns 200, plus a real login round-trip. A smoke test that passes while auth is entirely broken (§4A.1 #19) is the reason C1 shipped undetected | ~2 h |
| 22 | **Add Fly.io health checks** — `[[http_service.checks]]` against `/api/ready` so traffic is withheld until dependencies are reachable (§4A.1 #16) | ~1 h |
| 23 | **Build traceability** — embed the commit SHA in the image and surface it at `/api/health` (§4A.1 #2) | ~2 h |
| 24 | **Alerting** — webhook failure rate, event-handler errors, BullMQ failed-queue depth, Redis memory, `/api/ready` (§4A.1 #20) | ~1 d |

### Phase 3 — Short-term improvements

- **M4** — `DISTINCT ON` for inbox previews plus the supporting index.
- **M7** — correct 404/307 status codes from the guards.
- **M8** — skip link, accessible names when collapsed, drawer focus management; then run axe-core.
- **M9** — HKDF derivation and a versioned key prefix supporting rotation.
- **M3 / Q1** — decide Projects: ship the UI or remove it.
- **L2 / L3** — nav reachability and the index-based admin injection.
- Usage/quota dashboard and billing history (§3.4) — both are support-cost reducers.
- Coverage reporting in CI with a ratcheting threshold.

### Phase 4 — Long-term architecture

- **Extract the worker.** AI generation and webhook processing share a process with SSR; a
  CPU-heavy generation currently starves the UI thread. `fly.toml` already declares a `worker`
  process — route all side-effecting handlers to it.
- **Formalise the outbox pattern.** Persist domain events in the same transaction as the state
  change, then relay them. This eliminates the C2/H6 class of defect permanently.
- **Second LLM provider.** The provider interface exists but only `OpenAIProvider` implements it;
  there is no fallback for an outage or a price change.
- **Per-tenant quotas and cost attribution.** AI spend is currently unbounded per tenant beyond the
  reply counter.
- **Read replicas / caching** for the analytics surfaces before scale demands it.

---

## 6. Residual Risks and Final Checklist

### 6.1 Residual risks after full remediation

| Risk | Why it persists | Mitigation |
|---|---|---|
| Third-party API behaviour untested | No live Meta/Shopify/Stripe/OpenAI credentials available | Full staging run against sandbox accounts |
| Load and concurrency profile unknown | No load test performed | k6/Artillery run at 10× expected peak |
| Accessibility conformance unproven | Static review only; no axe-core or screen-reader pass | Automated + manual a11y audit |
| Prompt injection via customer DMs | AI consumes untrusted customer text; not tested | Adversarial prompt-injection test suite |
| Restore has never been exercised | No backup configuration exists to test | Rehearsed restore drill |
| Cross-tenant *write* isolation | I verified read isolation; writes were not exhaustively probed | Add tenant-guard tests for every mutating action |
| Multi-replica correctness | All runtime testing used a single instance | Two-replica staging soak |
| BigCommerce connector SSRF | H9 was confirmed for WooCommerce; BigCommerce appears to build from `storeHash` against a fixed host but was **not verified** | Apply the same egress validation and confirm by inspection |
| Deployment permissions | No access to the Fly.io/Vercel organisation | Review IAM/deploy-token scope for least privilege |
| DNS-rebinding against H9's fix | The proposed `assertPublicHttpsUrl` resolves once; a TOCTOU window remains between validation and connect | Pin the resolved IP, or route egress through an allowlisting proxy |
| Prompt injection via customer DMs | Untrusted customer text reaches the LLM with product and coupon context | Adversarial test suite; treat LLM output as untrusted before it drives actions |
| Historical migrations M14 | The two unsafe statements are already applied; not retroactively fixable | CI gate prevents recurrence; document as accepted |

### 6.2 Final readiness checklist

| Area | Status | Evidence |
|---|---|---|
| Build & compile | ✅ **Pass** | `npm run build` exit 0; 40 routes; worker bundled |
| Type safety | ✅ **Pass** | `tsc --noEmit` exit 0 from a clean install |
| Lint | ✅ **Pass** | `eslint . --max-warnings=0` exit 0 |
| Dependency vulnerabilities | ✅ **Pass** | `npm audit` → 0 vulnerabilities |
| Database migrations | ✅ **Pass** | 40/40 applied; zero drift |
| Security headers & CSP | ✅ **Pass** | Verified on live responses |
| Webhook signature verification | ✅ **Pass** | All three providers verify before side effects |
| Tenant isolation (read) | ✅ **Pass** | 6 cross-tenant probes, no leak |
| Admin authorization | ✅ **Pass** | 6 routes, full + RSC, no leak |
| Session revocation | 🟡 **Partial** | Correct on 108 sites; H4 is the exception |
| Rate limiting | 🟡 **Partial** | Works; no global per-account limit (M10) |
| XSS / injection / dynamic execution | ✅ **Pass** | 0 `dangerouslySetInnerHTML`; 1 literal raw query; no `eval` |
| Secret hygiene | ✅ **Pass** | Pattern scan clean; only `.env.example` tracked |
| Migration forward-compatibility | ✅ **Pass** | 0 destructive ops; `ALTER COLUMN`s are relaxations |
| Outbound request timeouts | ✅ **Pass** | All connectors and Meta calls set abort timeouts |
| **SSRF / egress control** | ❌ **Fail** | **H9 — authenticated SSRF to metadata and private ranges, demonstrated** |
| **Background job reliability** | ❌ **Fail** | **H10 — no retries; unbounded Redis retention, both measured** |
| **Graceful shutdown / deploy safety** | ❌ **Fail** | **H11 — no `SIGTERM` handling; in-flight jobs destroyed** |
| **Rolling-deploy / version coexistence** | ❌ **Fail** | M14 (`NOT NULL` ahead of drain); M13 (index locking); no expand/contract policy |
| **Readiness gating of traffic** | ❌ **Fail** | No `[[http_service.checks]]` in `fly.toml`; traffic routed on port bind |
| **Post-deploy smoke coverage** | ❌ **Fail** | Smoke test passes while all authentication is broken (§4A.1 #19) |
| Feature flags | 🚫 **Not Applicable** | No flag mechanism exists; noted as a gap for deploy/release separation |
| Artifact traceability | ❌ **Fail** | No image tagging or commit SHA in the build |
| **Authentication (deployed)** | ❌ **Fail** | **C1 — total failure on Fly.io/Docker** |
| **Event delivery correctness** | ❌ **Fail** | **C2 — reproduced double-dispatch** |
| **Startup resilience** | ❌ **Fail** | **H1 — DB blip prevents boot** |
| **Billing lifecycle** | ❌ **Fail** | **H2, H3 — no idempotency; `past_due` terminal** |
| **Data integrity (Projects)** | ❌ **Fail** | **H5 — hard delete labelled "archive"** |
| Test coverage | ❌ **Fail** | 43 tests / 524 files; zero on critical paths |
| Backups & rollback | ❌ **Fail** | None configured or documented |
| CD & release automation | ❌ **Fail** | CI only; manual deploy script |
| Observability in production | 🟡 **Partial** | Good logging + Sentry; M2 floods logs; no alerting |
| Accessibility | 🟡 **Partial** | Good semantics and ARIA; M8 gaps; not machine-tested |
| Performance & scalability | 🟡 **Partial** | Mostly bounded queries; M4 unbounded; no load test |
| Product completeness | 🟡 **Partial** | Core journeys complete; §3.5 gaps; Projects orphaned |
| Load / stress testing | ⬜ **Not Tested** | Out of scope |
| Penetration testing | ⬜ **Not Tested** | Out of scope |
| Disaster recovery | ⬜ **Not Tested** | Nothing to test |
| Third-party integrations (live) | ⬜ **Not Tested** | No credentials |

---

## 7. Statement of Limitations

This audit reflects commit `06395c4` as reviewed across two passes (2026-07-29 and 2026-07-30),
under the conditions described in §2. Findings marked **Confirmed** are supported by reproducible
evidence captured in this report. Findings marked **Probable Risk**, **Design Concern**, or
**Needs Product Decision** are reasoned from code and are explicitly labelled as not empirically
proven.

**On the value of pass 2.** The code did not change between passes; only the areas examined did.
That a second pass over identical code produced three further High findings is itself the most
important result in this report — it means the defect surface has not been characterised, not that
the code degraded. Any confidence estimate should account for the areas still unexamined (§6.1)
rather than treating this report as complete coverage.

**No claim is made that this application is bug-free or secure.** Absence of a finding is not
evidence of correctness — particularly in the areas listed as Not Tested in §6.2, where no
assessment was possible. Readiness is stated only within the reviewed scope, the tested conditions,
the available evidence, and the residual risks recorded above.

The two Critical findings were reproduced against a running production build. They are not
speculative, and neither is caught by the existing CI pipeline.
