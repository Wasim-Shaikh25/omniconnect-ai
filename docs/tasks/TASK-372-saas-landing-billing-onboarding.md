# Task 372: SaaS landing page, pricing, payments, and onboarding docs

- **Status:** Done
- **Spec:** `docs/specs/0049-saas-landing-billing-onboarding.md`
- **Module(s):** `organizations`, `app`, `docs`
- **Owner:** wasim
- **Changelog entry:** Adds SaaS landing/pricing, Stripe payment gateway, expanded help, deployment docs, and env templates.

## Description

Implement the SaaS surface from spec `0049`: public marketing landing page with pricing tiers, Stripe checkout + webhook, plan persistence on `Organization`, updated help/README/deployment docs, and environment file templates.

## Subtasks

- [x] Add `Plan` enum + billing fields to `Organization` and run Prisma generate.
- [x] Add Stripe env keys and `stripe` dependency.
- [x] Build `/` landing page with hero, features, and pricing cards.
- [x] Build `/pricing` comparison page.
- [x] Build `/settings/billing` with current plan + upgrade buttons.
- [x] Create `POST /api/stripe/checkout` route.
- [x] Create `POST /api/stripe/webhook` route with signature verification and plan update.
- [x] Add `getCurrentPlan` / `updateOrganizationPlan` application service in `organizations`.
- [x] Update `/help` with full feature/usage/pricing/deployment details.
- [x] Rewrite `README.md`.
- [x] Rewrite `docs/deployment.md` with local → test → production steps.
- [x] Create `.env.local`, `.env.test`, `.env.production` templates.
- [x] Run lint + typecheck + build + worker.

## Acceptance Criteria

- [x] Matches spec `0049` acceptance criteria.
- [x] `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run worker` pass.
- [x] `CHANGELOG.md` updated.

## Notes / Blockers

- Stripe account/keys required for live payments; test keys and test price IDs are enough for UI and webhook validation.
- Prisma migration will need a PostgreSQL connection when `npx prisma migrate dev` is run; generated client can be produced with `npx prisma generate`.
