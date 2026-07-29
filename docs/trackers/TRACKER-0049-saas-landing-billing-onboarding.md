# TRACKER-0049: 0049 — SaaS Landing Page, Pricing, Payments, and Onboarding Docs

- **Status:** Done
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0049-saas-landing-billing-onboarding.md`
- **Task:** `docs/tasks/TASK-0049-saas-landing-billing-onboarding.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0049.

## 2. Subtasks

### Planning
- [x] Requirement approved and task created.

### Implementation / Verification
- [x] `/` is a marketing landing page with hero, feature bullets, and pricing cards.
- [x] `/pricing` lists Free, Starter ($4.99), and Pro ($9.99) with accurate capability lists.
- [x] `/api/stripe/checkout` creates a Stripe Checkout session using the configured price ID.
- [x] `/api/stripe/webhook` verifies signature and updates `Organization.plan`.
- [x] `/settings/billing` displays current plan and shows upgrade options.
- [x] `/help` includes sections: getting started, all features, pricing/upgrade, integrations, analytics, security, deployment, troubleshooting.
- [x] `README.md` is rewritten with positioning, quick start, and links to deployment docs.
- [x] `docs/deployment.md` has full local → test → production steps.
- [x] `.env.local`, `.env.test`, and `.env.production` are created with appropriate values.
- [x] `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run worker` pass.

### Quality Gates
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.

## 3. Acceptance Criteria

- [x] All linked requirement acceptance criteria are met.
- [x] All quality gates pass.

## 4. Notes / Blockers

- Migrated from legacy spec `docs/specs/0049-saas-landing-billing-onboarding.md`.
