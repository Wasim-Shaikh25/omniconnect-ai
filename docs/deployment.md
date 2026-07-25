# OmniConnect AI — Deployment & SaaS Guide

This guide covers how to deploy OmniConnect AI as a multi-tenant SaaS product on Vercel, Fly.io, or any Docker host. The repo includes a `deploy.sh` one-command build-and-deploy script.

## Architecture overview

- **Application:** Next.js 15 app router (TypeScript, Tailwind, ShadCN UI).
- **Auth:** NextAuth.js with organization-scoped RBAC.
- **Database:** PostgreSQL via Prisma.
- **Queue / cache:** Redis for BullMQ and future job workers.
- **Object storage:** S3-compatible provider for media backups.
- **AI:** OpenAI GPT models for assistant replies and content generation.
- **Observability:** Sentry and OpenTelemetry (optional).

## Prerequisites

1. Node.js 20+ and npm.
2. PostgreSQL 15+ and Redis 7+.
3. A configured `.env` file (see `.env.example`).
4. (Optional) `flyctl` for Fly.io or `vercel` CLI for Vercel.

## One-command deployment (`deploy.sh`)

```bash
# Deploy to Fly.io (requires flyctl and fly.toml)
./deploy.sh

# Deploy to Vercel
TARGET=vercel ./deploy.sh

# Build a Docker image locally
TARGET=docker ./deploy.sh
```

The script:
1. Runs `npm ci`.
2. Generates the Prisma client.
3. Runs `npm run build` (Next.js `output: "standalone"`).
4. Invokes the chosen deployment target (`flyctl deploy`, `vercel --prod`, or `docker build`).

> **Important:** Run `npx prisma migrate deploy` against your production database before the first deploy.

## Vercel deployment

1. Create a project in the Vercel dashboard or run `npx vercel`.
2. Add all environment variables from `.env.example`.
3. Set the build command to `npm run build` and the install command to `npm ci`.
4. Add a `postinstall` step to run `npx prisma generate` or keep it in the build command.
5. For migrations, add a separate CI step or Vercel hook that runs `npx prisma migrate deploy`.

## Fly.io deployment

1. Install `flyctl` and authenticate:
   ```bash
   fly auth signup
   fly auth login
   ```
2. Launch the app (or use the included `fly.toml`):
   ```bash
   fly launch
   ```
3. Set secrets:
   ```bash
   fly secrets set DATABASE_URL="..." REDIS_URL="..." NEXTAUTH_SECRET="..."
   ```
4. Create the Postgres and Redis addons, or connect external services.
5. Deploy:
   ```bash
   ./deploy.sh
   ```

The `fly.toml` runs `npx prisma migrate deploy` as a release command before starting the web server.

## Docker / self-hosted

Build and run with Docker:

```bash
docker build -t omniconnect-ai .
docker run -p 3000:3000 --env-file .env.production omniconnect-ai
```

`.env.production` should contain the same keys as `.env.example` but with production values.

## Multi-tenant SaaS checklist

- [ ] Use a unique PostgreSQL schema or `organizationId` column isolation per tenant. Currently rows are scoped by `organizationId`.
- [ ] Add Stripe billing and per-seat or usage-based pricing.
- [ ] Configure a custom domain per tenant with wildcard DNS.
- [ ] Set up SSL certificates and HTTP/2.
- [ ] Use a managed Redis provider for queues and caching.
- [ ] Enable backups for Postgres and S3 media.
- [ ] Set up Sentry and OpenTelemetry for observability.
- [ ] Add rate limiting on API routes and webhooks.
- [ ] Configure webhooks in Meta and Shopify dashboards with the public production URL.

## Environment variables

See `.env.example` for a full list. At minimum production needs:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `NEXTAUTH_URL` | Public app URL |
| `OPENAI_API_KEY` | AI replies and content generation |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth sign-up/login |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | Facebook OAuth sign-up/login |
| `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` | Apple OAuth sign-up/login |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth sign-up/login |
| `META_APP_SECRET` | Webhook HMAC verification |
| `META_WEBHOOK_VERIFY_TOKEN` | Meta webhook subscription token |

## Health checks

The app exposes the standard Next.js server on port `3000`. For load balancers, use `GET /` as a health check.

## Next steps

- Configure a CI pipeline to run `npm run lint`, `npx tsc --noEmit`, and `npm run build` on every pull request.
- Use Terraform or Pulumi to provision Postgres, Redis, and DNS in production.
- Add a staging environment and promote deployments from staging to production.
