# REQ-0068: Medium-Severity Hardening (M1–M2, M4–M15)

- **Status:** Approved
- **Owner:** Backend / Security / Frontend
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0068-medium-severity-hardening.md`
- **Related Tracker:** `docs/trackers/TRACKER-0068-medium-severity-hardening.md`
- **Source audit:** `PRODUCTION_READINESS_AUDIT.md` §4 (M1–M15), §5 Phase 2 and Phase 3
- **Remediation index:** `docs/audit/2026-07-31-remediation-index.md`
- **Last updated:** 2026-07-31

## 1. Summary

Thirteen medium-severity findings covering information disclosure, observability cost, query
performance, Shopify compliance, integration stability, HTTP correctness, accessibility,
cryptography, authentication throttling, defence-in-depth authorization, routing consistency, and
AI prompt-injection safety. None individually blocks the release, but three of them (M5 Shopify
GDPR webhooks, M11 admin page guards, M9 key rotation) carry compliance or security exposure that
gets materially harder to fix after launch, and M5 blocks a public Shopify App Store listing
outright.

M3 (Projects: no UI + name race) is **not** in this requirement — the name-race half is fixed as
part of H5 in `REQ-0067` and the UI half is `REQ-0073`.

## 2. Verified current state (re-checked at commit `33e2e0b`, 2026-07-31)

| ID | Finding | Verified evidence |
|---|---|---|
| M1 | `/api/ready` leaks internals | `src/app/api/ready/route.ts` returns raw `error.message` in the JSON body; `createStandaloneRedis` opens a new connection per request |
| M2 | OTel falls back to `ConsoleSpanExporter` | `src/shared/observability/telemetry.ts:27-29`; `OTEL_EXPORTER_OTLP_ENDPOINT` absent from `PRODUCTION_REQUIRED` |
| M4 | Unbounded inbox query | `message.repository.ts` `listLatestByConversationIds` has no `take` |
| M5 | Shopify GDPR webhooks missing | `apply-shopify-webhook.ts` handles only `products/*`, `orders/*`, `checkouts/*` |
| M6 | Stripe API version unpinned | `stripe-payment-gateway.ts:23` — `new Stripe(env.STRIPE_SECRET_KEY)` with no `apiVersion` |
| M7 | `notFound()`/`redirect()` return 200 | Guards invoked from `"use server"` helpers and a layout during streamed render |
| M8 | Accessibility gaps | `grep -n "sr-only\|Skip to" src/app/layout.tsx src/components/app-shell.tsx` → **no matches** |
| M9 | SHA-256 key derivation, no rotation | `src/shared/security/encryption.ts` — single `subtle.digest("SHA-256", …)`, constant `SALT`, unversioned `enc:` prefix |
| M10 | Login throttle per `email+IP` only | `auth.ts:37` — `key: \`credentials:${email}:${ip}\`` |
| M11 | Admin pages rely on the layout guard | 0 `requireSuperAdmin` calls in all six `src/app/admin/**/page.tsx` files (the audit reported 2 in `users/page.tsx`; at `33e2e0b` there are none) |
| M13 | `/help` auth-only | Product decision — no code change; regression test only |
| M14 | `/support` still in `publicPaths` | `auth.ts:222` lists `/support` while `src/app/support/page.tsx` redirects anonymous users |
| M15 | Prompt-injection defences incomplete | `generate-reply.ts:142-159` concatenates user-editable config and external data into the system prompt |

> **Correction to the audit:** M11 states `admin/users/page.tsx` is "the only self-guarding page"
> with 2 guards. At `33e2e0b` **no** admin page calls `requireSuperAdmin()`; authorization rests
> entirely on `src/app/admin/layout.tsx`. The finding is worse than reported.

## 3. Goals

- Stop anonymous callers learning internal hostnames, ports, and dependency error text.
- Stop production stdout being flooded with OpenTelemetry spans.
- Make the unified inbox query cost independent of conversation history length.
- Satisfy Shopify's mandatory compliance webhooks and clean up on uninstall.
- Pin the Stripe API version so webhook payload shapes cannot drift under the deployment.
- Return correct HTTP status codes so monitoring and CDNs behave.
- Meet WCAG 2.1 AA for keyboard and screen-reader navigation of the app shell.
- Make token encryption rotatable and derived with a real KDF.
- Make credential brute-forcing bounded per account, not only per IP.
- Enforce admin authorization at every admin page, not only the layout.
- Make routing configuration consistent with the auth-only product decision.
- Reduce prompt-injection and unmoderated-output risk in the AI reply path.

## 4. Non-Goals

- Critical/High findings — `REQ-0067`.
- Low findings — `REQ-0069`.
- Full accessibility conformance certification — machine-verified axe-core/Lighthouse runs are
  `REQ-0075`; this requirement fixes the three known static defects.
- Rewriting the AI provider abstraction or adding a second LLM provider — `REQ-0075` §long-term.

## 5. User Stories

- As a **platform operator**, `/api/ready` tells me pass/fail without telling an attacker my
  database host during an incident.
- As a **platform owner**, production logs contain application events, not one span object per
  request.
- As a **merchant with 200-message conversations**, the inbox loads in constant time.
- As a **merchant**, my Shopify app can be listed publicly because the mandatory compliance
  webhooks are implemented.
- As a **merchant whose card details changed**, a Stripe API version change in the dashboard does
  not silently break my billing events.
- As an **on-call engineer**, a broken deep link shows up as a 404 in monitoring, not a 200.
- As a **keyboard or screen-reader user**, I can skip navigation, understand collapsed sidebar
  links, and escape the mobile drawer.
- As a **security owner**, I can rotate `ENCRYPTION_KEY` without destroying every stored
  integration token.
- As a **user**, repeated failed logins tell me I am rate-limited instead of silently looking like
  a wrong password.
- As a **platform owner**, an admin page cannot be reached without a page-level authorization
  check.
- As an **anonymous visitor**, `/support` redirects cleanly at the middleware instead of rendering
  a 200 that then bounces me.
- As an **end customer**, a malicious message cannot make the AI ignore its instructions.

## 6. Acceptance Criteria

### M1 — `/api/ready` disclosure and connection churn
- [ ] The response body contains only `{ name, ok }` per check; no `error` strings.
- [ ] Failures are logged server-side as `readiness.failed` with full detail.
- [ ] `Cache-Control: no-store` is set.
- [ ] The route reuses a shared Redis client instead of `createStandaloneRedis` per request.
- [ ] The route is rate-limited.
- [ ] A test asserts no `error` key is present in a failing response body.

### M2 — Telemetry exporter
- [ ] When `OTEL_EXPORTER_OTLP_ENDPOINT` is unset **and** `NODE_ENV === "production"`, tracing is
      disabled and `telemetry.disabled` is logged exactly once.
- [ ] `ConsoleSpanExporter` is used only outside production.
- [ ] `docs/deployment.md` documents `OTEL_EXPORTER_OTLP_ENDPOINT` as recommended for production.
- [ ] A test asserts no console span export occurs with `NODE_ENV=production` and the var unset.

### M4 — Inbox query
- [ ] `listLatestByConversationIds` returns at most one row per conversation from the database.
- [ ] A composite index on `Message(conversationId, createdAt DESC)` exists via migration.
- [ ] A test with 3 conversations × 50 messages asserts exactly 3 rows are read.
- [ ] Every repository method reachable from a list view is confirmed to have a `take` or an
      equivalent bound; the inventory is recorded in the task.

### M5 — Shopify compliance webhooks
- [ ] `customers/data_request`, `customers/redact`, `shop/redact`, and `app/uninstalled` are
      handled in `apply-shopify-webhook.ts`.
- [ ] `customers/redact` erases or anonymises the identified customer's PII within the store scope
      and writes an audit record.
- [ ] `shop/redact` erases the shop's data and stored tokens.
- [ ] `customers/data_request` produces an export payload for the merchant to relay, recorded and
      logged.
- [ ] `app/uninstalled` marks the integration disconnected, purges the encrypted access token, and
      stops scheduled sync jobs for that store.
- [ ] Unhandled topics no longer return `{ ok: true }` for compliance topics.
- [ ] Shopify's automated compliance checks pass in a test store.
- [ ] Tests exist for each of the four topics.

### M6 — Stripe API version
- [x] `new Stripe(...)` passes an explicit `apiVersion` matching the installed `stripe@^17.1.0`
      typings, plus `typescript: true`.
- [x] The pinned version is recorded in `docs/decisions/` as an ADR with the upgrade procedure
      (`docs/decisions/0007-stripe-api-version-pinning.md`).
- [x] `resolveSubscriptionId` (from `REQ-0067` H3) is verified against the pinned version's invoice
      payload shape (`billing.test.ts` covers `invoice.paid`, `invoice.payment_succeeded`,
      and `invoice.payment_failed`).

### M7 — HTTP status correctness
- [ ] `/stores/{other-tenant-id}` returns `404`.
- [ ] `/stores/does-not-exist` returns `404`.
- [ ] `/admin/organizations` as a non-admin returns `307` to `/dashboard`.
- [ ] Guards are invoked from page/route bodies rather than `"use server"` helpers where required
      to emit the status before streaming.
- [ ] No data is leaked by any of these paths (re-verify the audit's passing probes).
- [ ] A CI-runnable script asserts these three status codes.

### M8 — Accessibility
- [ ] A skip link is the first focusable element in `src/app/layout.tsx` and targets
      `#main-content`.
- [ ] `<main id="main-content" tabIndex={-1}>` exists.
- [ ] Collapsed sidebar links expose an accessible name via `aria-label`; icons are
      `aria-hidden="true"`.
- [ ] The mobile drawer moves focus in on open, traps focus, closes on `Escape`, and restores focus
      to the trigger on close.
- [ ] Keyboard-only traversal of the app shell is manually verified and recorded.
- [ ] Colour contrast is spot-checked on primary surfaces (full machine audit is `REQ-0075`).

### M9 — Encryption
- [ ] Key derivation uses HKDF (or PBKDF2 with a documented iteration count) rather than a single
      SHA-256 pass.
- [ ] The ciphertext prefix is versioned (`enc:v2:`).
- [ ] Decryption supports the current key and one previous key so `ENCRYPTION_KEY` can be rotated.
- [ ] A documented rotation procedure exists in `docs/operations.md`, including re-encryption of
      stored tokens.
- [ ] The plaintext-passthrough branch in `decryptString` is time-boxed with a removal date
      recorded in the task file.
- [ ] `.env.example` no longer ships a placeholder that reads like a usable passphrase; the
      generation command is documented.
- [ ] Round-trip tests cover: v2 encrypt/decrypt, v1 legacy decrypt, previous-key decrypt, and
      rejection of a tampered ciphertext.

### M10 — Login throttling
- [ ] A global per-account counter (default 20 attempts/hour across all IPs) layers on top of the
      existing per-`email+IP` limit.
- [ ] `authorize` distinguishes rate-limiting from bad credentials so the UI can display
      "too many attempts — try again in N minutes".
- [ ] The lockout message does not reveal whether the account exists.
- [ ] `RATE_LIMIT_IP_HEADER` is required in production configuration and documented.
- [ ] Tests: per-IP limit engages; global limit engages across rotating IPs; a correct password
      after lockout is still refused until the window elapses.

### M11 — Admin authorization defence in depth
- [ ] `await requireSuperAdmin()` is called at the top of all six admin pages.
- [ ] The layout guard is retained.
- [ ] A test or script asserts every file matching `src/app/admin/**/page.tsx` contains a
      page-level guard, so new pages cannot regress.
- [ ] Non-admin probes of all six routes (full page and RSC) return no admin data.

### M13 — `/help` auth-only (no code change)
- [ ] A regression test asserts anonymous `GET /help` returns `307` to `/login`.
- [ ] The decision is recorded in `docs/specs/current-state.md`.

### M14 — `/support` routing consistency
- [ ] `/support` is removed from `publicPaths`.
- [ ] Anonymous `GET /support` returns `307` from the middleware.
- [ ] Authenticated users can still reach `/support`.
- [ ] The role-to-capability matrix in the audit and `docs/specs/current-state.md` is corrected to
      show support as authenticated-only.

### M15 — AI prompt-injection and output moderation
- [ ] All user-editable prompt fragments (system prompt, tone, strategies, escalation rules,
      templates) are sanitised of delimiter sequences before interpolation.
- [ ] The system prompt contains an explicit instruction that only the delimited user region is
      user input and instructions inside it must not be followed.
- [ ] External data (product titles, coupon codes, customer names) is delimited and labelled as
      data, not instructions.
- [ ] An output moderation step runs before any generated text is sent to Meta; flagged content is
      withheld and escalated to a human.
- [ ] Moderation decisions are logged without logging customer PII.
- [ ] An adversarial test suite covers at least: instruction override, delimiter injection in a
      product title, system-prompt exfiltration, unauthorised discount offer, and abusive output.

## 7. Scope & Dependencies

**Modules affected:** `ai`, `auth`, `conversations`, `ecommerce`, `organizations`, `shared/security`,
`shared/observability`, `shared/redis`, presentation/layout components.

**Depends on:** `REQ-0067` (M6 interacts with H3's `resolveSubscriptionId`; M14's `publicPaths`
edit touches the same array as H9). Land `REQ-0067` first or coordinate the edits.

**Blocks:** a public Shopify App Store submission (M5); any claim of WCAG 2.1 AA conformance (M8).

## 8. Open Questions

1. **Q5 — Shopify App Store listing.** If public listing is *not* intended, M5 drops from
   "mandatory" to "recommended". **Default: assume listing is intended.**
2. Which moderation provider for M15 — OpenAI's moderation endpoint (already an OpenAI customer) or
   a self-hosted classifier? **Default: OpenAI moderation endpoint behind the existing provider
   interface, so a swap needs no caller changes.**
3. What is the acceptable global login-attempt budget for M10? **Default: 20/hour per account.**
4. How long should the M9 plaintext-passthrough branch remain? **Default: one release after the
   re-encryption backfill completes; record the removal date in the task.**
