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
   - Leave all real third-party credentials (Razorpay, Meta, Shopify, OpenAI, SMTP) blank/commented out for basic smoke tests.
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

- Do not run `npm run build` while `npm run dev` is serving; the production build artifacts can overwrite the dev cache and cause `Cannot find module './<chunk>.js'` runtime errors. Run the build gate first, then `rm -rf .next && npm run dev` to restart the dev server cleanly.
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
  - Phase 1 V2 (`Workspace`/`Project` model): after a normal owner registers, `/onboarding` may render with a blank main area because `getCurrentUser()` returns `userId` from the session instead of the persisted `User.userId`, causing the onboarding redirect to fire before the workspace form is shown.
  - Phase 1 V2 store route: a normal `USER` role owner will get a 404 on `/stores/{projectId}` because `tenantGuard.assertStoreAccess` requires `user.projectId` to match. The session carries `projectId` as `null` for owners (only staff get a `projectId`), so the owner cannot view their own store. To verify the route/MOCK connector itself, temporarily promote the test user to `SUPER_ADMIN` in Postgres and re-authenticate.
- A pre-existing circular dependency between `@/modules/ai` and `@/modules/intelligence` containers can cause `ReferenceError: Cannot access 'X' before initialization` on server actions such as `/register` and invite creation. If this happens, the smoke test can be unblocked with temporary lazy wrappers in `src/modules/ai/infrastructure/container.ts`, but the real fix is to break the circular dependency.
- The `FREE` plan has only 1 team seat (occupied by the owner), so testing the STAFF invite flow requires upgrading `"User".plan` to `STARTER` or `PRO` in Postgres (V2 stores the plan on `User`), or creating the STAFF user directly in the DB.
- New STAFF users (via invite registration) are redirected from `/dashboard` to `/stores/{projectId}` when `role === "USER" && projectId` is set.
- PR #127 V2 owner/staff tenant mapping gotchas:
  - `/stores` lists stores by `userId`, which is the owner id for both owners and staff. It is not filtered by `projectId`, so a staff user may see all owner stores plus the **Add a store** card.
  - `/dashboard` only redirects a staff user when `role === "USER" && projectId`; a staff with `projectId: null` falls through and sees the owner dashboard.
  - `/settings` does not list staff members because `UserRepository.listByOrganization` filters `where: { id: userId }` instead of the workspace/organization relation, so the **Update store** assignment flow cannot be exercised from the UI.
  - `getCurrentUser()` now reloads canonical `User.userId`/`projectId` from the DB and checks `tokenVersion`, so updating `User.projectId` in Postgres is reflected on the next request without re-authenticating as long as `tokenVersion` is unchanged.
- The `/settings` **Invite member** form is resilient to email-provider failures: `sendInviteEmail` catches SMTP/console errors, logs them, and the action returns success so the invite record is created. If `EMAIL_PROVIDER=smtp` and the server is unreachable, the form still shows "Invite sent" but the email is not delivered.
- Browser automation can attach CDP to the wrong window when multiple Chrome windows/tabs are open. Use a single incognito window and close other browser windows before relying on `browser_console`.
- File upload inputs in headless Chrome can be driven by constructing a `DataTransfer` and assigning it to `input.files`, then dispatching a `change` event:
  ```js
  const input = document.getElementById('knowledgeFiles');
  const dt = new DataTransfer();
  dt.items.add(new File(['content'], 'kb-test.txt', { type: 'text/plain' }));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  ```
- PR #155 knowledge-base upload gotchas:
  - `.txt` and `.md` extraction works through the `extractKnowledgeBaseFiles` server action.
  - PDF extraction uses `pdfjs-dist/legacy/build/pdf.mjs`; the worker path must resolve to an absolute file path on disk. `createRequire(import.meta.url).resolve` inside a Next.js RSC/server action can return a webpack internal module id such as `(rsc)/./node_modules/...`, producing an invalid `file://(rsc)/...` URL. A reliable fix is to derive `__dirname` from `fileURLToPath(import.meta.url)` and use `path.resolve(__dirname, "../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")`.
  - Product sync dispatches `ProductsSynced` through the in-memory queue when `REDIS_URL` is unset; `AIConfiguration.productKnowledge` is populated by the `onProductsSynced` subscriber.
  - `/settings/billing` renders the Free plan, plan limits, and a "Payments not configured" alert when Razorpay keys are absent; the **Manage subscription** button is disabled.
  - For headless Chrome file uploads, `fetch` to a local CORS server may be blocked. A reliable workaround is to place test files in `public/` temporarily, read them with a synchronous `XMLHttpRequest` using `overrideMimeType('text/plain; charset=x-user-defined')` to keep raw bytes, then build a `File` and assign it via `DataTransfer`:
  ```js
  function fetchFile(url, name, type) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.overrideMimeType('text/plain; charset=x-user-defined');
    xhr.send();
    const raw = xhr.response;
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i) & 0xff;
    return new File([bytes], name, { type });
  }
  const input = document.querySelector('input[type="file"]');
  const dt = new DataTransfer();
  dt.items.add(fetchFile('/kb-test.pdf', 'kb-test.pdf', 'application/pdf'));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  ```
  Remove the test files from `public/` after the test.
- After submitting `/onboarding` the session may briefly land on `/login` with an empty main area because `unstable_update` does not refresh the JWT `tokenVersion` immediately. Navigating to `/login` or refreshing usually resolves it.
- REQ-0087 super admin panel gotchas:
  - Super admin login requires an MFA code. With `EMAIL_PROVIDER=console` the code is redacted in logs; insert a known code directly into the `MfaCode` table and pass it in the credentials form.
  - The `/api/auth/session` endpoint does **not** check `suspendedAt`/`banned`; it only refreshes role/userId/projectId from the DB. Suspended/banned users' existing sessions stay valid for client-side and middleware checks until the JWT expires, even though `getCurrentUser`-based server components block them.
  - `suspendUserAction`/`banUserAction` may fail to update the UI after the first toggle because the client form's hidden `suspended`/`banned` values may not re-render correctly with `useActionState`, and the `revalidatePath("/admin/users")` call does not revalidate `/admin/users/[id]` detail pages.
  - The status actions call `auditCommands.create`, but if the audit write fails (or is skipped) no `AuditLog` row appears; verify `AuditLog` directly when testing status toggles.
  - For headless Chrome, `browser_console` may not connect; use `Ctrl+L` to focus the address bar and type URLs directly, or POST to `/api/auth/callback/credentials` with CSRF and credentials.
- PR #184 adapter wizard gotchas:
  - The wizard lives at `/stores/[projectId]/integrations/adapter`. It requires a `USER`/`SUPER_ADMIN` role and a valid store; the seed must set `User.userId` to the user's own id for owner access.
  - `OpenRouterAdapterGenerator` needs a real `OPENROUTER_API_KEY` or a runtime `global.fetch` shim (`NODE_OPTIONS='--import /tmp/mock-openrouter.mjs'`) to return a valid `AdapterConfigMapping`.
  - The mock e-commerce server can run on any free port; if `9876` is occupied by the session harness, use `9877` and update the shim's `baseUrl` to match.
  - `<input type="text">` fields may not accept native `type` events in headless Chrome; use `browser_console` to set `.value`, dispatch `input`/`change`, and call `form.requestSubmit()` for the `Generate adapter` form. `<textarea>` fields accept native typing.
  - The `Credentials JSON` textarea parses with `JSON.parse`; invalid JSON disables `Test connection` and `Save and connect`, and re-generating resets the textarea to `{}` and re-enables the buttons.
  - `npm run build` with `.env` `NODE_ENV=development` can fail during static generation with `<Html> should not be imported outside of pages/_document`; run `NODE_ENV=production npm run build` instead.

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

## Razorpay billing smoke test notes

- The local `.env` should leave all `RAZORPAY_*` keys blank to test the "gateway disabled" path; `/api/razorpay/checkout` then returns `503` with `{"error":"Razorpay is not configured"}` and the UI shows a "Payments not configured" alert.
- To verify the webhook signature check, temporarily set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` to any non-empty strings (no real Razorpay account needed). `POST /api/razorpay/webhook` with no `x-razorpay-signature` returns `400 { error: "Missing signature" }`; with an invalid signature it returns `400 { error: "Invalid Razorpay signature" }`. Revert the `.env` afterwards and restart the server to keep the default unconfigured state.
- To test `/admin/payments` and `/admin/coupons` without going through super-admin MFA, register a normal user, update `User.isSuperAdmin = true` (keep `role = 'USER'`) in Postgres *before* completing `/onboarding`, and submit the workspace form. `completeOnboardingAction` calls `unstable_update`, which refreshes the JWT with `isSuperAdmin: true`, so the `/admin` middleware guard passes without re-authenticating.
- Source grep for `Stripe`/`STRIPE_`/`stripe_` should return no matches in `src` when the migration is complete.

## Production-build smoke testing workaround

If `npm run dev` fails with `UnhandledSchemeError: Reading from "node:https" is not handled by plugins` (caused by `import https from "node:https"` in `src/instrumentation.ts`), and a plain `npm run start` fails because required production environment variables are unset, use the already-built output with:

```bash
NODE_ENV=development npm run start
```

This skips `validateProductionSecrets()` while still serving the production build, so local smoke tests can run with blank third-party credentials.

## Devin secrets needed

None for basic local smoke tests; a minimal `.env` with local Docker DB/Redis and a random `NEXTAUTH_SECRET`/`ENCRYPTION_KEY` is sufficient.
