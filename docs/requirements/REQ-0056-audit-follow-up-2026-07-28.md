---
description: Production Readiness Audit Follow-Up (2026-07-28)
---

# REQ-0056: Production Readiness Audit Follow-Up (2026-07-28)

- **Status:** Implemented
- **Owner:** Devin
- **Module(s):** shared, auth, organizations, ecommerce, meta, ai, growth, support, analytics, conversations, crm
- **Original spec path:** `docs/specs/0056-audit-follow-up-2026-07-28.md` (restructured)
- **Task:** `docs/tasks/TASK-0056-audit-follow-up-2026-07-28.md`
- **Tracker:** `docs/trackers/TRACKER-0056-audit-follow-up-2026-07-28.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0056-audit-follow-up-2026-07-28.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** shared, auth, organizations, ecommerce, meta, ai, growth, support, analytics, conversations, crm
- **Status:** Implemented
- **Owner:** Devin
- **Related task(s):** `docs/trackers/TRACKER-0056-audit-follow-up-2026-07-28.md`
- **Related ADR(s):** —
- **Last updated:** 2026-07-28

## 1. Summary

Remediate the remaining High and Medium findings from the 2026-07-28 production-readiness audit (`PRODUCTION_READINESS_AUDIT.md`). These are the release blockers preventing a `GO` recommendation.

## 2. Goals

1. Enforce `Customer.consent` before any automated outbound message or AI reply.
2. Harden client IP extraction so rate limits cannot be bypassed by forged `X-Forwarded-For` headers.
3. Distinguish Stripe webhook `4xx` client errors from `5xx` transient/internal errors.
4. Replace `Math.random()` with cryptographically secure random generation for coupon codes and job IDs.
5. Expand production environment validation to cover Stripe, Meta, `NEXTAUTH_URL`/`APP_URL`, S3 (if used), and super-admin credentials.
6. Add an `/onboarding` route so the auth redirects do not 404.
7. Harden `growth/parseForm` to handle `FormData` values, duplicate keys, and `File` values safely.
8. Validate `assignedTo` in support ticket updates against the `User` table.
9. Harden the OpenAI provider against prompt injection and restrict the model allowlist.
10. Replace in-memory list/count patterns on dashboard/reports with Prisma `count` aggregates.
11. Apply value-level PII redaction to `SystemLog` metadata.
12. Make `RedisEventBus.publish` await local handlers before returning.
13. Replace direct `process.env.NODE_ENV` reads with the validated `env` module.

## 3. Non-Goals

- No new product features (public API, mobile app, file uploads, visual workflow builder).
- No live load testing, penetration testing, or real third-party integration exercises.
- No redesign of the authentication strategy or session model.

## 4. User Stories

- As a customer, I do not receive automated DMs or AI replies after I decline consent.
- As an operator, I know the application will fail loudly at startup if any required production secret is missing.
- As a store owner, I can complete registration without hitting a 404 onboarding page.
- As a platform owner, I trust that rate limits, coupon codes, and webhook error codes are robust.

## 5. Domain Model

No new domain entities. Reuses `Customer.consent`, `User`, `Organization`, `Store`, `Coupon`, `SystemLog`, `SupportTicket`.

## 6. Public Contract

- `src/modules/auth` continues to export `getCurrentUser`, `requireRole`, `requireSuperAdmin`.
- `src/shared/security/rate-limit.ts` exports `clientIp` with optional trusted header support.
- `src/shared/events` continues to export `eventBus`; `RedisEventBus` internal behavior only.
- `src/shared/observability` continues to export `logger` and `logSystem`; redaction logic shared.

## 7. Data / Persistence

- No schema changes required for the core findings.
- If dashboard aggregates require new repository methods, add them behind existing `EcommerceQueries` / `ConversationQueries` / `CrmQueries` ports.
- Migrations only needed if new indexes are discovered; none anticipated.

## 8. API / UI Surface

- `POST /api/stripe/webhook` returns `400` for signature/validation errors and `500` for transient/internal errors.
- `POST /api/meta/webhook` stops logging raw `X-Forwarded-For` chains.
- Server actions updated: `welcome-first-follower`, `growth` actions, `support/updateTicketAction`, `ai` generate-reply, `generate-captions/trends/post-ideas`.
- New page: `/onboarding`.

## 9. External Integrations

- Stripe webhook error handling behavior unchanged for signature verification; only response status codes change.
- OpenAI provider: delimiters, model allowlist, output sanitization.
- Meta/Shopify: no changes.

## 10. Edge Cases & Failure Modes

- `Customer.consent` may be `PENDING`; continue normal flows for `PENDING` and `GRANTED`, block/restrict for `DECLINED`.
- Missing trusted proxy header in production: `clientIp` should fall back to the last untrusted `X-Forwarded-For` hop or `unknown`.
- Stripe webhook idempotency: already uses event signature; still return `200` for duplicate processing.
- `/onboarding` must redirect authenticated users with an organization to `/dashboard`.

## 11. Security & Privacy

- No secrets logged.
- No PII in `SystemLog` values.
- Consent gate is server-side and cannot be bypassed by client UI.

## 12. Testing Strategy

- Add/update unit tests for changed application functions.
- Add targeted tests for `clientIp`, coupon code entropy, `SystemLog` redaction, and `generate-reply` consent behavior.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm audit`, `npm run build` before final commit.

## 13. Acceptance Criteria

- [ ] AUD-HIGH-01: `Customer.consent = DECLINED` blocks automated welcome DMs, comment-to-DM unlock, and AI replies (or sends a safe handoff only).
- [ ] AUD-HIGH-02: `clientIp` supports a trusted proxy header and does not trust leftmost `X-Forwarded-For` by default.
- [ ] AUD-HIGH-03: Stripe webhook returns `500` for transient/internal errors and `400` for signature/validation errors.
- [ ] AUD-HIGH-04: No `Math.random()` remains in coupon code, username suffix, or job ID generation.
- [ ] AUD-HIGH-05: `validateProductionSecrets` covers Stripe, Meta webhook, `NEXTAUTH_URL`/`APP_URL`, S3 (if used), and super-admin credentials.
- [ ] AUD-MED-01: `/onboarding` route exists and auth redirects render correctly.
- [ ] AUD-MED-02: `growth/presentation/actions.ts` `parseForm` handles `FormData` safely.
- [ ] AUD-MED-03: `support/updateTicketAction` validates `assignedTo` against the `User` table.
- [ ] AUD-MED-04: OpenAI provider uses delimiters, model allowlist, and output sanitization.
- [ ] AUD-MED-05: Dashboard/reports use `count` aggregates instead of loading 500 records per store.
- [ ] AUD-MED-06: `SystemLog` redacts values, not just keys.
- [ ] AUD-MED-07: `RedisEventBus.publish` awaits local handlers.
- [ ] AUD-LOW-01: Direct `process.env.NODE_ENV` reads replaced with `env.NODE_ENV`.
- [ ] All quality gates pass.
