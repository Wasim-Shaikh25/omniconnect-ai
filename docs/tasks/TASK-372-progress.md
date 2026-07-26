# Task 372 Progress — SaaS landing page, pricing, payments, and onboarding docs

Spec: `docs/specs/0049-saas-landing-billing-onboarding.md`

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
- [x] Update `CHANGELOG.md`.
- [x] Capture screenshots and share with user.
