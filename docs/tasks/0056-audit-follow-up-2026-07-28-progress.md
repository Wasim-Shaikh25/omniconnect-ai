# Task 0056: Production Readiness Audit Follow-Up (2026-07-28)

- **Status:** Done
- **Spec:** `docs/specs/0056-audit-follow-up-2026-07-28.md`
- **Module(s):** shared, auth, organizations, ecommerce, meta, ai, growth, support, analytics, conversations, crm
- **Owner:** Devin
- **Changelog entry:** Resolves remaining High/Medium/Low findings from the 2026-07-28 production-readiness audit.

## Description

Implement the remediation plan from `PRODUCTION_READINESS_AUDIT.md` section 5. The work is grouped by severity and focuses on release blockers: consent enforcement, IP/rate-limit hardening, Stripe webhook error classification, secure randomness, production env validation, onboarding route, form parsing, ticket assignment, AI hardening, dashboard counts, log redaction, event-bus ordering, and config consistency.

## Subtasks

### High

- [x] **AUD-HIGH-01** — Enforce `Customer.consent = DECLINED` before automated welcome DMs, comment-to-DM unlock, and AI replies.
- [x] **AUD-HIGH-02** — Harden `clientIp` extraction with trusted-proxy header support and fallback.
- [x] **AUD-HIGH-03** — Return `500` for transient/internal Stripe webhook errors and `400` only for signature/validation failures.
- [x] **AUD-HIGH-04** — Replace `Math.random()` with `crypto.getRandomValues`/`crypto.randomUUID` for coupon codes and job IDs.
- [x] **AUD-HIGH-05** — Expand `validateProductionSecrets` to cover Stripe, Meta, `NEXTAUTH_URL`/`APP_URL`, S3, and super-admin credentials.

### Medium

- [x] **AUD-MED-01** — Add `/onboarding` route or remove redirects; ensure auth pages never 404.
- [x] **AUD-MED-02** — Fix `growth/presentation/actions.ts` `parseForm` to safely handle `FormData` values, duplicate keys, and `File` values.
- [x] **AUD-MED-03** — Validate `assignedTo` in `support/updateTicketAction` against the `User` table.
- [x] **AUD-MED-04** — Harden OpenAI provider: prompt delimiters, model allowlist, output sanitization.
- [x] **AUD-MED-05** — Use Prisma `count` aggregates for dashboard KPIs and reports instead of loading 500 records per store.
- [x] **AUD-MED-06** — Apply value-level PII redaction to `SystemLog` metadata.
- [x] **AUD-MED-07** — Make `RedisEventBus.publish` await local handlers before returning.

### Low

- [x] **AUD-LOW-01** — Replace direct `process.env.NODE_ENV` reads in `src/app/stores/[storeId]/page.tsx` and `campaigns/first-follower/page.tsx` with `env.NODE_ENV`.

## Acceptance Criteria

- [x] All subtasks above are implemented.
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm audit` reports 0 vulnerabilities.
- [x] `npm run build` passes and emits `.next/standalone/worker.cjs`.
- [x] `CHANGELOG.md` is updated.
- [x] `PRODUCTION_READINESS_AUDIT.md` finding status and executive summary are updated where applicable.

## Notes / Blockers

- No schema changes anticipated.
- Redis-backed `eventBus` tests may need adjustments once `publish` awaits local handlers.
- Marketing analytics still loads follower/customer lists up to 500 per store for intent/hashtag analysis; this is intentionally left as a later optimization because it needs actual record content, not just counts.
- E2E smoke testing surfaced two follow-up items that were fixed:
  - Credentials registrations now set `UserRegistered.autoProvisionOrganization: false` so new users reach `/onboarding`; OAuth sign-ins keep `autoProvisionOrganization: true`.
  - `completeOnboardingAction` refreshes the session via `unstable_update({})` after linking the workspace.
  - Added `/analytics/page.tsx` redirect to `/analytics/journeys` to fix the header 404.
