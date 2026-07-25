# Backlog

Ordered list of tasks. `[x]` = done, `[~]` = in progress, `[ ]` = todo.
Each links a spec. Keep in sync with `CHANGELOG.md`.

## Foundation
- [x] **TASK-000** Project governance foundation (rules, specs, tasks, changelog, architecture docs) — spec: `0000`
- [x] **TASK-001** Remote decision: kept local on VM per user (no PR) — spec: `0000`

## Phase 1 build order
- [x] **TASK-010** App scaffold: Next.js 15 + TS + Tailwind + ShadCN, Prisma schema, config/env validation, PWA, DDD module skeleton, event bus, import-boundary lint — spec: `0010`
- [x] **TASK-020** Module 1 — Authentication (NextAuth v5, JWT, RBAC, bcrypt credentials + Google-ready) — spec: `0001`
- [x] **TASK-030** Users + Organizations + Stores (multi-tenant foundation; event-driven org provisioning) — spec: `0011`
- [x] **TASK-040** Module 2 — eCommerce connector framework + Shopify + Mock providers (connect/sync/coupon) — spec: `0002`
- [x] **TASK-050** Module 3 — Meta integration (webhooks, FB Pages + IG Business; crm + conversations consumers) — spec: `0003`
- [x] **TASK-060** Module 6 — Customer Memory (CRM) — spec: `0006`
- [x] **TASK-070** Module 4 — AI Customer Assistant (per-page prompts, provider interface) — spec: `0004`
- [x] **TASK-080** Module 5 — First-time follower campaign (event-driven) — spec: `0005`
- [x] **TASK-090** Module 8 — Human takeover — spec: `0008`
- [x] **TASK-100** Module 9 — Notifications (in-app + email) — spec: `0009`
- [x] **TASK-140** UI polish, help page, and SaaS deployment setup — spec: `0000` (raw IDs/JSON removed, `/help` added, `deploy.sh` + `Dockerfile` + `fly.toml` + `docs/deployment.md` added)
- [x] **TASK-110** Meta content intelligence, analytics dashboard + reports — spec: `0007` (trending content ideas + hashtag/competitor media feed + dedicated competitor analysis page with discovery implemented; full analytics dashboard + live Meta Graph API insights todo)
- [x] **TASK-150** OAuth sign-up/login (Google, Facebook, Apple, GitHub) — spec: `0000`
- [x] **TASK-160** Viral growth & follower acceleration features — Phase A implemented — spec: `0013`
- [x] **TASK-130** Meta commerce & engagement automation (Instagram Shop sync, comment/mention automation, Lead Ads, UGC, ambassador referrals, conversational commerce) — spec: `0012` — Phase 2A/2B/2C/2D/2E implemented
- [x] **TASK-170** Executive Dashboard & workspace KPIs — spec: `0014`
- [x] **TASK-180** AI Business Brain — natural-language workspace assistant — spec: `0015`
- [ ] **TASK-190** Unified Inbox (global conversation triage) — spec: `0000`
- [ ] **TASK-200** AI CRM refinements (segments, scoring, consent) — spec: `0006`
- [ ] **TASK-210** Content Studio (calendar, composer, asset library) — spec: `0000`
- [ ] **TASK-220** Orders module (orders, refunds, fulfillment, attribution) — spec: `0000`
- [ ] **TASK-230** Campaigns beyond first-time follower (manual broadcasts, automation) — spec: `0005`
- [ ] **TASK-240** Brand Deals (pipeline, deliverables, reporting) — spec: `0000`
- [ ] **TASK-250** Affiliate Center (enrollment, codes, commissions, payouts) — spec: `0000`
- [ ] **TASK-260** Media Kit (shareable creator portfolio) — spec: `0000`
- [ ] **TASK-270** Analytics & Reports (full dashboard, scheduled reports, metric definitions) — spec: `0007`
- [ ] **TASK-280** Automation module (workflow builder, triggers, actions, run history) — spec: `0000`
- [ ] **TASK-290** Integrations catalog & health dashboard — spec: `0000`
- [ ] **TASK-300** Settings & Administration (members, roles, audit log, billing) — spec: `0000`
- [ ] **TASK-310** Mobile responsive quick actions & PWA polish — spec: `0000`
- [ ] **TASK-120** UI pages + dark/light mode (Login, Dashboard, connections, AI settings, conversations, customers, coupons, reports, analytics, notifications, account) — spec: `0000`
