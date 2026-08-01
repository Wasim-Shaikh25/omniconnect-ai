# OmniConnect AI — Deployment & SaaS Guide

This guide covers how to deploy OmniConnect AI from a local development machine to a production
environment on Vercel, Fly.io, or any Docker host.

## Architecture overview

- **Application:** Next.js 15 app router (TypeScript, Tailwind, ShadCN UI).
- **Auth:** NextAuth.js v5 with organization-scoped RBAC.
- **Database:** PostgreSQL via Prisma.
- **Queue / cache:** Redis for BullMQ and future job workers.
- **Payments:** Stripe Checkout + webhooks for subscriptions.
- **Object storage:** S3-compatible provider for media backups.
- **AI:** OpenAI GPT models for assistant replies and content generation.
- **Observability:** Sentry and OpenTelemetry (optional).

## Local development

1. **Install prerequisites:**
   - Node.js 20+ and npm 10+
   - PostgreSQL 15+ (local or Docker)
   - Redis 7+ (local or Docker)

2. **Start Postgres and Redis locally:**
   ```bash
   docker run -d --name omniconnect-postgres \
     -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=omniconnect -p 5432:5432 postgres:15

   docker run -d --name omniconnect-redis -p 6379:6379 redis:7
   ```

3. **Clone and install:**
   ```bash
   git clone <repo-url>
   cd omniconnect-ai
   npm install
   ```

4. **Configure `.env.local`:**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` and set at minimum:
   - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/omniconnect?schema=public`
   - `REDIS_URL=redis://localhost:6379`
   - `NEXTAUTH_SECRET` — a random 32+ character string
   - `NEXTAUTH_URL=http://localhost:3000`
   - `OPENAI_API_KEY`
   - `META_APP_SECRET` and `META_WEBHOOK_VERIFY_TOKEN` (for live Meta webhooks)
   - Optional: `GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET` for Google OAuth

5. **Run database migrations and generate the Prisma client:**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

6. **Run the Next.js dev server and worker:**
   ```bash
   npm run dev
   # in another terminal
   npm run worker
   ```

7. **Open** [http://localhost:3000](http://localhost:3000) and register an account.

## Test environment

Use `.env.test` for CI or a throwaway test environment.

1. Use an isolated test database:
   ```bash
   createdb omniconnect_test
   ```
2. Set `DATABASE_URL` to the test database and `NODE_ENV=test`.
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   npm run build
   npm run typecheck
   ```

## Production deployment

### Before you deploy

1. Provision managed **PostgreSQL** and **Redis** services.
2. Create a **Stripe** account and configure:
   - Products and prices for Starter ($4.99/mo) and Pro ($9.99/mo).
   - `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.
   - `STRIPE_PRICE_STARTER` and `STRIPE_PRICE_PRO` price IDs.
   - Webhook endpoint: `https://your-domain.com/api/stripe/webhook`, listening to
     `checkout.session.completed`.
3. Create or configure Meta, Google, OpenAI, and S3 credentials.
4. Set a strong `NEXTAUTH_SECRET` and point `NEXTAUTH_URL` to your public domain.

### Vercel

1. Create a project in the Vercel dashboard or run `npx vercel`.
2. Add all environment variables from `.env.production`.
3. Set the build command to `npm run build` and install command to `npm ci`.
4. Add a `postinstall` script or build step: `npx prisma generate`.
5. Run migrations in a separate CI step or Vercel hook:
   ```bash
   npx prisma migrate deploy
   ```
6. Add a `vercel.json` if you want the worker to run separately, or run BullMQ workers on a
   separate service/container pointed at the same Redis.

### Fly.io

1. Install `flyctl` and authenticate:
   ```bash
   fly auth signup
   fly auth login
   ```
2. Launch the app or use the included `fly.toml`:
   ```bash
   fly launch
   ```
3. Set secrets:
   ```bash
   fly secrets set DATABASE_URL="..." REDIS_URL="..." NEXTAUTH_SECRET="..." \
     STRIPE_SECRET_KEY="..." STRIPE_WEBHOOK_SECRET="..." STRIPE_PRICE_STARTER="..." \
     STRIPE_PRICE_PRO="..." OPENAI_API_KEY="..." META_APP_SECRET="..."
   ```
4. Create Postgres and Redis addons, or connect external services.
5. The `fly.toml` should run `npx prisma migrate deploy` as a release command before starting the
   web server.
6. Deploy:
   ```bash
   ./deploy.sh
   ```

### Docker / self-hosted

Build and run with Docker:

```bash
docker build -t omniconnect-ai .
docker run -p 3000:3000 --env-file .env.production omniconnect-ai
```

`.env.production` should contain the same keys as `.env.example` but with production values. Make
sure Redis and Postgres are reachable from the container and migrations have been applied.

## Multi-tenant SaaS checklist

- [ ] Use a unique PostgreSQL schema or `organizationId` column isolation per tenant. Currently rows are scoped by `organizationId`.
- [ ] Stripe billing is configured and webhook endpoint is registered.
- [ ] Configure a custom domain with wildcard DNS if offering per-tenant subdomains.
- [ ] Set up SSL certificates and HTTP/2.
- [ ] Use a managed Redis provider for queues and caching.
- [ ] Enable backups for Postgres and S3 media.
- [ ] Set up Sentry and OpenTelemetry for observability.
- [ ] Add rate limiting on API routes and webhooks.
- [ ] Configure webhooks in Meta and Shopify dashboards with the public production URL.
- [ ] Run the BullMQ worker in a separate process or container for background jobs.

## Environment variables

See `.env.example`, `.env.local`, `.env.test`, and `.env.production` for templates. At minimum
production needs:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `NEXTAUTH_URL` | Public app URL |
| `AUTH_TRUST_HOST` | `true` off Vercel so Auth.js trusts the proxy `Host` header |
| `OPENAI_API_KEY` | AI replies and content generation |
| `META_APP_SECRET` | Webhook HMAC verification |
| `META_WEBHOOK_VERIFY_TOKEN` | Meta webhook subscription token |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for client-side |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint secret |
| `STRIPE_PRICE_STARTER` | Stripe price ID for Starter plan |
| `STRIPE_PRICE_PRO` | Stripe price ID for Pro plan |

## Health checks

The app exposes the standard Next.js server on port `3000`. For load balancers, use `GET /` as a
health check. If the worker is separate, monitor Redis queue depth as an additional health signal.

## Next steps

- Configure the first store and Meta integration.
- Run the Marketing Brain daily brief.
- Review `docs/specs/` and `CHANGELOG.md` for the roadmap.
