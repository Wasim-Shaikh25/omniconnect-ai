# OmniConnect AI

The **AI Marketing & Commerce Platform for Instagram and Facebook Businesses**.

OmniConnect AI turns every interaction — posts, comments, DMs, followers, competitors, and
products — into actionable marketing decisions. It connects your Shopify catalog and Meta pages
into one daily workflow: content ideas, competitor insights, DM automation, analytics, and
post-to-order attribution.

> **Status:** Active development — SaaS landing page, Stripe billing, and full deployment docs
> are now part of the repository.

## What it does

- **Daily Marketing Brief** — one prioritized list of what to post, promote, and reply to today.
- **Content Intelligence** — Reel and post ideas grounded in your own best-performing content,
  competitor changes, audience comments, DMs, and product catalog.
- **DM & Comment Automation** — AI replies to Instagram/Facebook messages and comments, with
  automatic human handoff.
- **First-Time Follower Campaigns** — auto-welcome new followers with personalized coupons.
- **Shopify + Meta Commerce** — sync products, push shoppable posts, and see which content drives
  orders.
- **Marketing Analytics** — content, audience, product, and campaign views built around growth
  questions.
- **Competitor Benchmarking** — compare posting frequency, hooks, audio usage, and engagement.

## Plans

| Plan | Price | Best for |
|------|-------|----------|
| Free | $0 | One store, one Meta account, up to 50 AI replies/month. |
| Starter | $4.99/mo | Up to 3 stores, 500 AI replies, advanced analytics, DM automation, competitor tracking. |
| Pro | $9.99/mo | Unlimited stores and AI replies, team seats, brand deals, benchmarking, priority support. |

Payments are processed by Stripe. Upgrade from **Settings → Billing**.

## Quick start (local)

1. **Requirements:** Node.js 20+, PostgreSQL 15+, Redis 7+.
2. **Clone and install:**
   ```bash
   git clone <repo-url>
   cd omniconnect-ai
   npm install
   ```
3. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, `OPENAI_API_KEY`, and any provider keys
   you want to test. See `.env.example` for the full list.
4. **Prepare the database:**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
5. **Run the app:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).
6. **Run background jobs (optional):**
   ```bash
   npm run worker
   ```

## Environment files

The repo ships with three environment templates:

- `.env.local` — local development with Docker/localhost Postgres and Redis.
- `.env.test` — CI / test runs with in-memory or throwaway services.
- `.env.production` — production deployment with managed Postgres, Redis, and Stripe live keys.

Copy the template that matches your target and fill in real values. Never commit `.env` files.

## Deployment

See [`docs/deployment.md`](./docs/deployment.md) for the full local → test → production guide,
including Vercel, Fly.io, Docker, Stripe webhook setup, and the production checklist.

## Architecture

- **Next.js 15** app router, TypeScript strict, TailwindCSS, ShadCN UI.
- **PostgreSQL** via Prisma.
- **Redis + BullMQ** for background jobs.
- **NextAuth v5** with organization-scoped RBAC (Admin / Store Owner / Staff).
- **OpenAI** via a provider interface for assistant replies and content generation.
- **Meta Graph API** and webhooks for Instagram/Facebook events.
- **Stripe** for subscriptions and billing.

Domain modules: `auth`, `users`, `organizations`, `ecommerce`, `meta`, `ai`, `coupons`, `crm`,
`conversations`, `analytics`, `reports`, `notifications`.

## Engineering standards

1. Read [`CHANGELOG.md`](./CHANGELOG.md) first every session.
2. Read/update the spec in `docs/specs/` before code.
3. Create/update a task in `docs/tasks/`.
4. Keep modules loosely coupled; never import another module's internals.
5. Run lint, typecheck, and build before committing.

See [`AGENTS.md`](./AGENTS.md) for the complete standard.

## License

Private — see repository license file.
