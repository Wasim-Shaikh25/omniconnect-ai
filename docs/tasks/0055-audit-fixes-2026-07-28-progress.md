# Task 0055: Production Readiness Audit Fixes (2026-07-28)

- **Status:** In Progress
- **Spec:** `docs/specs/0055-audit-fixes-2026-07-28.md`
- **Module(s):** shared, auth, organizations, commerce, meta, conversations, intelligence, notifications, users
- **Owner:** Devin
- **Changelog entry:** Resolves critical and high findings from 2026-07-28 production-readiness audit.

## Description

Implement the remediation plan from the 2026-07-28 production-readiness audit. The audit found **17 confirmed issues**: 6 critical, 5 high, 4 medium, and 2 low. Residual untested areas (live integrations, load testing, accessibility tooling, backup/DR) are tracked separately and are not part of this task.

## Subtasks

### Critical

- [x] **C1** — Replace in-memory event bus, rate limiter, and webhook dedup with Redis-backed implementations (or fail fast in production). Added `src/shared/redis/client.ts`, `RedisEventBus`, `RedisRateLimitStore`, Redis-backed Meta webhook guard, and `getQueue()` production fail-fast. `next.config.ts` aliases `ioredis` to `false` in client/edge chunks to prevent the Node-only Redis client from being bundled for the browser.
- [x] **C2** — Wire `npm run worker` into `fly.toml` / `deploy.sh` / production runbook. (`npm run build` now emits `.next/standalone/worker.cjs`; `fly.toml` has `app` and `worker` process groups.)
- [x] **C3** — Add RBAC and target-user validation to project management actions. (`teamSeats` enforcement deferred; it requires an organization invite/add-member flow.)
- [x] **C4** — Standardize store-scoped authorization: use `tenantGuard.assertStoreAccess` across all store-scoped server actions and components. (Applied to commerce, conversations, and intelligence actions; `resolveStoreScope` helper enforces staff store scoping and replaces manual `getOrganizationOverview` store checks.)
- [x] **C5** — Add pagination to admin list endpoints (organizations, users, coupons, tickets). Added `PaginationInput`/`PaginatedResult` to the shared kernel, updated repositories, actions, and admin pages.
- [x] **C6** — Require `REDIS_URL` and a non-console `EMAIL_PROVIDER` in production.

### High

- [x] **H1** — Add `subscriptionId` index and optimize Stripe billing lookup.
- [x] **H2** — Enforce staff store scoping in intelligence daily-action and context actions. `resolveStoreScope` restricts staff to `user.storeId` and validates non-staff access via `tenantGuard.assertStoreAccess`.
- [x] **H3** — Restrict `connect-src` CSP directive to `'self'`.
- [x] **H4** — Harden in-memory queue fallback (Redis required in production; in-memory only for dev/tests).
- [x] **H5** — Narrow middleware public-API allowlist from `/api/*` to explicit public prefixes.

### Medium

- [x] **M1** — Use UTC month boundaries for `aiRepliesThisMonth` reset.
- [ ] **M2** — Surface structured server validation errors per-field in forms.
- [x] **M3** — Verify new Prisma indexes with `EXPLAIN ANALYZE` and add missing ones. Verified `Organization.subscriptionId`, `Conversation.storeId/customerId`, `Integration.externalId`, and `Message.conversationId` indexes are used; no missing indexes added.
- [x] **M4** — Remove password reset code from URL query string. Email link now only includes `email`; code is entered manually from the email body.

### Low

- [x] **L1** — Migrate from `next lint` to ESLint CLI. `npm run lint` now runs `eslint . --max-warnings=0`; `eslint.config.mjs` ignores `.d.ts` files and `scripts/`.
- [x] **L2** — Resolve Vitest CJS deprecation warning. `package.json` now declares `"type": "module"` so Vitest loads Vite's ESM API.

## Acceptance Criteria

- [ ] All critical and high subtasks above are implemented or explicitly deferred with user approval.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
- [x] `npx prisma generate` succeeds and generated client is in sync.
- [x] `CHANGELOG.md` updated.

## Notes / Blockers

- Some fixes (C1, C2) require a Redis instance in production/staging to verify.
- UI pagination for admin lists (C5) may need small shadcn/ui table changes.
- `teamSeats` enforcement needs an organization invite/add-member flow to be meaningful; `addProjectMemberAction` now validates that the target user already belongs to the organization.
- Redis-backed runtime state (event bus, rate limiter, webhook dedup) was blocked by `ioredis` being pulled into the client bundle. `package.json` now declares `sideEffects: ["*.css"]`, enabling tree-shaking of server-only modules; re-land after validation.
- The `next-themes` script `script-src` violation was fixed by passing the CSP `nonce` from `layout.tsx` through `providers.tsx` to `ThemeProvider`.
- The CSP `style-src` violation from `next-themes` color-scheme inline styles was fixed by setting `enableColorScheme={false}` in `app/providers.tsx`; `style-src` now allows `'unsafe-inline'` for Next.js runtime inline style attributes (route announcer, dev overlay).
- The `bcryptjs` `crypto` webpack warning in `npm run dev` was fixed by adding an Edge-only `crypto` fallback in `next.config.ts`.
