---
name: Testing OmniConnect AI locally
---

# Testing OmniConnect AI locally

## When to use

Use this skill before running end-to-end or integration tests against the OmniConnect AI Next.js app.

## One-time per-session setup

1. Start PostgreSQL and Redis containers:
   ```bash
   docker run -d --name omniconnect-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=omniconnect --rm postgres:16
   docker run -d --name omniconnect-redis -p 6379:6379 --rm redis:7
   ```

2. Create a `.env` file from `.env.example` in the repo root.
   - Fill in `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/omniconnect?schema=public`
   - Fill in `REDIS_URL=redis://localhost:6379`
   - Fill in `NEXTAUTH_SECRET`, `NEXTAUTH_URL=http://localhost:3000`, `APP_URL=http://localhost:3000`
   - Fill in `ENCRYPTION_KEY` with at least 32 characters.
   - Set `EMAIL_PROVIDER=console`.
   - Leave all real third-party credentials (Stripe, Meta, Shopify, OpenAI, SMTP) blank/commented out for basic smoke tests.
   - Comment out or remove `SUPER_ADMIN_EMAIL` and `SMTP_FROM` lines; empty strings fail Zod email validation.

3. Install dependencies and prepare the database:
   ```bash
   npm install
   npx prisma generate
   npx prisma migrate deploy
   ```

4. Start the dev server and worker:
   ```bash
   npm run dev
   npm run worker
   ```
   The app should be available at `http://localhost:3000`.
   - `npm run worker` runs `tsx src/jobs/worker.ts` and may not auto-load `.env` unless `tsx` is started with `--env-file=.env` or the environment is exported; for basic smoke tests the in-memory fallback is usually enough.

## Common gotchas

- `npm run lint`, `npm run typecheck`, and `npm run build` should all pass before claiming the code is healthy.
- `/analytics` is a server-side redirect to `/analytics/journeys` for authenticated users; unauthenticated requests redirect to `/login`.
- The local `.env` must comment out or remove empty optional email fields (`SUPER_ADMIN_EMAIL`, `SMTP_FROM`) so Zod validation passes.
- For PR #75+ product/coupon lifecycle tests:
  - Connect a store with blank credentials to use the built-in `MOCK` connector; sync will create 6 demo products.
  - Product and coupon deletes are soft deletes (`deletedAt` populated, status set to `DISABLED` for coupons); list queries filter them out.
  - The `/stores/[storeId]/analytics` data-quality badge reads `Partial data` when no Meta account is connected.
  - To test the AI usage guard, exhaust the workspace quota by setting `"Organization"."aiRepliesThisMonth"` to the plan limit (e.g. `50` for `FREE`) in Postgres **after** the first successful AI call has committed; also set `"aiRepliesResetAt"` to a future date in the current month so the guard does not reset the counter.
  - Product/coupon delete buttons use `window.confirm`; Playwright must accept dialogs or the bulk delete forms will not submit.
  - Staff tenant isolation: `requireStoreAccess` limits a `STAFF` user to their `storeId` and calls `notFound()` for unassigned stores. `listTrackedCompetitorsAction` uses `tenantGuard.assertStoreAccess`, so the `Competitor Benchmarks` panel renders for assigned staff. Test staff isolation by checking the assigned store is reachable and an unassigned store returns a clean 404.
- `ProductRepository.sync` now runs `upsert` and stale-deletion in a single Prisma transaction, so `syncProducts` should leave the 6 MOCK products active on a fresh store.
- `/settings/account` has separate `<AccountActions mode="export" />` and `<AccountActions mode="delete" />` cards, so selectors should target the card title (`Data export` or `Delete account`).
- Product/coupon bulk-delete success messages are owned by `ProductList`/`CouponList` (not `BulkDeleteToolbar`) and persist through `router.refresh()` and the empty-list transition; they should read `N product(s) deleted.` / `N coupon(s) deleted.` and auto-dismiss after ~3 seconds.
- Browser automation gotchas:
  - Input fields may not focus/click reliably in the headless environment; set values and submit forms via JS (`document.forms[i].requestSubmit()`).
  - Use `/api/auth/signout` to end a session reliably, then navigate to `/register?inviteToken=...&storeId=...` to test invite acceptance.
- A pre-existing circular dependency between `@/modules/ai` and `@/modules/intelligence` containers can cause `ReferenceError: Cannot access 'X' before initialization` on server actions such as `/register` and invite creation. If this happens, the smoke test can be unblocked with temporary lazy wrappers in `src/modules/ai/infrastructure/container.ts`, but the real fix is to break the circular dependency.
- The `FREE` plan has only 1 team seat (occupied by the owner), so testing the STAFF invite flow requires upgrading `"Organization".plan` to `STARTER` or `PRO` in Postgres, or creating the STAFF user directly in the DB.
- New STAFF users (via invite registration) are redirected from `/dashboard` to `/stores/{storeId}` when `role === "STAFF" && storeId` is set.

## Cross-tenant regression-test rule

For every new mutating action or repository method that touches tenant-scoped data, add a regression test row that proves the caller cannot act outside their boundary:

- **Owner / cross-tenant:** a user from organization A cannot read or write a store/organization/customer/order in organization B.
- **Staff pinning:** a `STAFF` user can only access their assigned `storeId`; other stores in the same organization are denied.
- **Super-admin boundaries:** admin-only actions reject non-`isSuperAdmin` users.

Use `createTenant` from `src/test/fixtures.ts` to create two isolated tenants in one test, and assert the guard throws `ForbiddenError` or the repository returns `null`/empty. Integration tests in `vitest.integration.config.ts` run serially (`singleFork: true`) so `resetDatabase` does not deadlock.

## Useful smoke checks

```bash
# Server health
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/

# DB check for a newly onboarded user
docker exec -e PGPASSWORD=postgres omniconnect-postgres psql -U postgres -d omniconnect -c "SELECT u.email, o.name AS org, s.name AS store FROM \"User\" u LEFT JOIN \"Organization\" o ON u.\"organizationId\" = o.id LEFT JOIN \"Store\" s ON s.\"organizationId\" = o.id WHERE u.email = '<test-email>';"
```

## Devin secrets needed

None for basic local smoke tests; a minimal `.env` with local Docker DB/Redis and a random `NEXTAUTH_SECRET`/`ENCRYPTION_KEY` is sufficient.
