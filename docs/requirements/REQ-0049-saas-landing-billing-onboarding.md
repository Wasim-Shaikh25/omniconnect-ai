---
description: 0049 — SaaS Landing Page, Pricing, Payments, and Onboarding Docs
---

# REQ-0049: 0049 — SaaS Landing Page, Pricing, Payments, and Onboarding Docs

- **Status:** Implemented
- **Owner:** wasim
- **Module(s):** `organizations`, `app` (UI), `docs`
- **Original spec path:** `docs/specs/0049-saas-landing-billing-onboarding.md` (restructured)
- **Task:** `docs/tasks/TASK-0049-saas-landing-billing-onboarding.md`
- **Tracker:** `docs/trackers/TRACKER-0049-saas-landing-billing-onboarding.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0049-saas-landing-billing-onboarding.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** `organizations`, `app` (UI), `docs`
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/TASK-372-saas-landing-billing-onboarding.md`
- **Last updated:** 2026-07-25

## 1. Summary

Position OmniConnect as a paid SaaS by adding a public marketing landing page, three transparent pricing tiers, and Stripe payment gateway integration. Update help and deployment docs so self-hosters and production operators can configure local, test, and production environments end-to-end.

## 2. Goals

1. Replace the generic feature-card landing page with a focused marketing page.
2. Define three pricing plans: **Free**, **Starter ($4.99/mo)**, and **Pro ($9.99/mo)** with clearly divided capabilities.
3. Add Stripe Checkout integration that updates the organization's plan after payment.
4. Update `/settings/billing` to show current plan and allow upgrades.
5. Expand `/help` with full feature/usage details.
6. Rewrite `README.md` and `docs/deployment.md` with full local → production setup steps.
7. Provide `.env.local`, `.env.test`, and `.env.production` templates.

## 3. Non-Goals

- Multi-currency billing; USD only.
- Usage-based metering or per-seat billing in this iteration.
- Invoicing, taxes, or proration.
- Removing any existing free behavior; free tier is the default.

## 4. User Stories

- As a visitor, I want to understand the product and see pricing so I can sign up.
- As a free user, I want to upgrade to a paid plan from the billing page.
- As a founder, I want to deploy from local to production with clear env files and docs.

## 5. Domain Model

- `Plan` enum values: `FREE`, `STARTER`, `PRO`.
- `Organization.plan` defaults to `FREE`.
- `Organization.subscriptionId` and `Organization.subscriptionStatus` optional strings for Stripe state.
- `PriceCard` and `BillingStatus` are read/view models, not persisted.

## 6. Public Contract

- `organizations` module exposes:
  - `getCurrentPlan(organizationId): Promise<Plan>`
  - `updateOrganizationPlan(organizationId, plan, { subscriptionId?, subscriptionStatus? }): Promise<void>`
- `app` pages/routes:
  - `GET /` — marketing landing page.
  - `GET /pricing` — pricing table with checkout links.
  - `GET /settings/billing` — current plan + upgrade/portal buttons.
  - `POST /api/stripe/checkout` — create Stripe Checkout session.
  - `POST /api/stripe/webhook` — handle `checkout.session.completed` and update plan.
- UI components in `src/components/` may be used by pages but contain no business logic.

## 7. Data / Persistence

- Add `Plan` enum and `plan`, `subscriptionId`, `subscriptionStatus` columns to `Organization` via Prisma migration.
- Add Stripe environment keys to `env.ts`.
- Do not store full payment method details; Stripe owns card data.

## 8. API / UI Surface

### Pricing tiers

| Plan | Price | Capabilities |
|------|-------|--------------|
| Free | $0 | 1 store, 1 social account, 50 AI replies/month, basic analytics, manual DM/comment replies. |
| Starter | $4.99/mo | Up to 3 stores, unlimited social accounts, 500 AI replies/month, advanced analytics, first-time-follower campaign, content ideas. |
| Pro | $9.99/mo | Unlimited stores + AI replies, competitor benchmarking, brand-deal pipeline, team seats, priority support. |

### Routes

- `POST /api/stripe/checkout` — expects `{ priceId, plan }` in JSON; returns `{ url }`.
- `POST /api/stripe/webhook` — verifies Stripe signature and updates `Organization`.

### Pages

- `/` (landing): hero, feature bullets, pricing cards, CTA buttons, footer.
- `/pricing`: detailed comparison of the three tiers.
- `/settings/billing`: current plan, upgrade button per plan, pending state.

## 9. External Integrations

- **Stripe**: checkout sessions and webhooks. Use the official `stripe` Node SDK.
- Required env keys: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`.
- Stripe signature verification required in webhook route.

## 10. Edge Cases & Failure Modes

- Missing Stripe config: pricing page shows "Configure Stripe to enable upgrades" and disables checkout.
- Webhook with unknown customer/org id: log and return 200 to stop retries.
- Duplicate checkout completion: idempotency via `subscriptionId` or `checkoutSessionId`.
- Free plan has no checkout action; it is the default/fallback.

## 11. Security & Privacy

- Stripe webhook signature verified with `STRIPE_WEBHOOK_SECRET`.
- Checkout session `client_reference_id` contains `organizationId`; validated against authenticated user on return if possible.
- No card data touches our server.
- `billing/*` server actions guarded by `requireUser` and `requireRole` (Admin/Store Owner).

## 12. Testing Strategy

- Unit test plan enum mapping and feature gating (no production secrets needed).
- Manual integration test: Stripe test mode checkout session creation and webhook callback.
- Run `npm run lint`, `npm run typecheck`, `npm run build`, `npm run worker` before commit.

## 13. Acceptance Criteria

- [ ] `/` is a marketing landing page with hero, feature bullets, and pricing cards.
- [ ] `/pricing` lists Free, Starter ($4.99), and Pro ($9.99) with accurate capability lists.
- [ ] `/api/stripe/checkout` creates a Stripe Checkout session using the configured price ID.
- [ ] `/api/stripe/webhook` verifies signature and updates `Organization.plan`.
- [ ] `/settings/billing` displays current plan and shows upgrade options.
- [ ] `/help` includes sections: getting started, all features, pricing/upgrade, integrations, analytics, security, deployment, troubleshooting.
- [ ] `README.md` is rewritten with positioning, quick start, and links to deployment docs.
- [ ] `docs/deployment.md` has full local → test → production steps.
- [ ] `.env.local`, `.env.test`, and `.env.production` are created with appropriate values.
- [ ] `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run worker` pass.

## 14. Open Questions

- Should annual billing be offered? (Deferred.)
- Which specific feature gating should be enforced per plan? (Deferred to future policy spec; UI labels only in this spec.)
