# TASK-0067: Implement Release-Blocker Fixes (C1–C2, H1–H10)

- **Status:** Todo
- **Owner:** Backend / Platform
- **Requirement:** `docs/requirements/REQ-0067-release-blockers-critical-high.md`
- **Tracker:** `docs/trackers/TRACKER-0067-release-blockers-critical-high.md`
- **Module(s):** `auth`, `organizations`, `ecommerce`, `ai`, `conversations`, `shared/events`, `shared/queue`, `shared/config`
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Fixed all Critical and High production-readiness blockers (C1, C2, H1–H10).
- **Last updated:** 2026-08-01

## 1. Summary

Twelve release-blocking defects, implemented in dependency order. Steps 1–4 are independent and can
be parallelised. Steps 5–6 (event bus) must be done together. Step 7 (webhook ledger) must land
before step 8 (subscription lifecycle) because both touch `billing.ts`.

**Ordering constraint:** every step's regression test is written *first* and must be observed
failing against the current code before the fix is applied. That is the exit criterion for the
whole task.

## 2. References

- Audit: `PRODUCTION_READINESS_AUDIT.md` §4 (C1, C2, H1–H10), §5 Phase 1
- Requirement: `docs/requirements/REQ-0067-release-blockers-critical-high.md`
- Tracker: `docs/trackers/TRACKER-0067-release-blockers-critical-high.md`
- Architecture: `docs/specs/current-state.md`, `AGENTS.md` §1 (layering), §3 (coding standards)
- Test tooling and CI Redis service: `docs/tasks/TASK-0074-test-coverage-quality-gates.md`

## 3. Implementation Plan

---

### Step 1 — C1: Trust the proxy host (NextAuth v5)

**Files:** `src/modules/auth/infrastructure/auth.ts`, `src/shared/config/env.ts`, `.env.example`,
`fly.toml`, `docs/deployment.md`, `.github/workflows/ci.yml`

`authConfig` currently omits `trustHost`. Auth.js v5 only auto-trusts on Vercel (`VERCEL=1`), so
behind Fly.io/Docker every `/api/auth/*` request returns HTTP 500 `UntrustedHost`.

```typescript
// src/modules/auth/infrastructure/auth.ts
export const authConfig: NextAuthConfig = {
  adapter: EncryptedPrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: env.NEXTAUTH_SECRET,
  // Auth.js v5 cannot infer a trusted host behind Fly.io/Docker/nginx; APP_URL is the
  // canonical origin and callback URLs are validated against it below.
  trustHost: true,
  pages: { signIn: "/login" },
  // ... unchanged
};
```

Add the env var as belt-and-braces (code default wins; the var exists so operators can see it):

```typescript
// src/shared/config/env.ts — inside the zod schema
AUTH_TRUST_HOST: z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true"),
```

Because `trustHost: true` honours the incoming `Host` header, add origin validation so a spoofed
host cannot poison a callback URL:

```typescript
// src/modules/auth/infrastructure/auth.ts — inside callbacks
async redirect({ url, baseUrl }) {
  const canonical = new URL(env.APP_URL ?? baseUrl);
  const target = new URL(url, canonical);
  // Only same-origin redirects; a spoofed Host must not be able to steer the callback.
  return target.origin === canonical.origin ? target.toString() : canonical.toString();
},
```

`fly.toml`:

```toml
[env]
  PORT = "3000"
  NODE_ENV = "production"
  NEXT_TELEMETRY_DISABLED = "1"
  AUTH_TRUST_HOST = "true"
```

`.env.example` — add with a comment explaining it is required off Vercel. `docs/deployment.md` —
document it in the required-variables table.

**CI smoke test** (`.github/workflows/ci.yml`) — replace the `/api/health`-only loop:

```yaml
      - name: Smoke test
        run: |
          node .next/standalone/server.js &
          APP_PID=$!
          ok=0
          for i in {1..30}; do
            if curl -sf http://localhost:3000/api/health > /dev/null; then ok=1; break; fi
            sleep 2
          done
          if [ "$ok" != "1" ]; then echo "health failed"; kill $APP_PID || true; exit 1; fi
          # C1 regression: auth must not 500 with UntrustedHost behind a proxy-less host.
          code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/auth/session)
          if [ "$code" != "200" ]; then echo "auth session returned $code"; kill $APP_PID || true; exit 1; fi
          # H9 regression: the Shopify webhook must reach HMAC verification, not redirect.
          code=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/shopify/webhooks)
          case "$code" in 3*) echo "shopify webhook redirected ($code)"; kill $APP_PID || true; exit 1;; esac
          kill $APP_PID || true
```

**Verify:** build, start standalone without `AUTH_TRUST_HOST`, `curl -o /dev/null -w '%{http_code}'
http://127.0.0.1:3000/api/auth/session` → `200`. Complete a browser login end to end.

---

### Step 2 — H9: Whitelist the Shopify webhook path

**File:** `src/modules/auth/infrastructure/auth.ts:215-231`

The array currently lists `/api/meta/webhook` and `/api/stripe/webhook` but **not**
`/api/shopify/webhooks`, so anonymous `POST`s are redirected to `/login` before the HMAC verifier
runs. (This is combined with Step 12's removal of `/support` — M14, tracked in `REQ-0068`; keep the
two edits in separate commits.)

```typescript
const publicPaths = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/support",
  "/api/auth",
  "/api/meta/webhook",
  "/api/stripe/webhook",
  "/api/shopify/webhooks", // Shopify signs with HMAC; the route verifies before any side effect.
  "/api/health",
  "/api/ready",
  "/_next",
  "/favicon.ico",
  "/manifest.webmanifest",
];
```

Review the matcher — `pathname === p || pathname.startsWith(`${p}/`)` — and confirm no unintended
sub-route under `/api/shopify/webhooks/` exists or is added later.

**Verify:** `curl -i -X POST http://localhost:3000/api/shopify/webhooks` → `401` (missing HMAC),
never `307`.

---

### Step 3 — H1: Make startup seeding best-effort

**Files:** `src/instrumentation.ts`, `fly.toml`, `scripts/seed-super-admin.ts` (new)

```typescript
// src/instrumentation.ts
import { validateProductionSecrets } from "@/shared/config";
import { initSentry, initTelemetry, logger } from "@/shared/observability";

export async function register() {
  initSentry();
  initTelemetry();
  validateProductionSecrets(); // stays fatal: misconfiguration is not recoverable

  // Seeding is best-effort. A transient database outage must never stop the process
  // from serving traffic, including /api/health.
  try {
    const { ensureSuperAdmin, accounts, hasher } = await import(
      "@/modules/auth/infrastructure/container"
    );
    await ensureSuperAdmin({ accounts, hasher });
  } catch (error) {
    logger.error("bootstrap.ensureSuperAdmin.failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
```

Move the authoritative seeding into the release phase so a genuine failure blocks the *release*:

```toml
# fly.toml
[deploy]
  release_command = "sh -c 'npx prisma migrate deploy && npx tsx scripts/seed-super-admin.ts'"

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  path = "/api/ready"
  timeout = "5s"
```

`scripts/seed-super-admin.ts` imports the same `ensureSuperAdmin` container binding and exits
non-zero on failure.

**Verify:** stop PostgreSQL, start the standalone server, `GET /api/health` → `200`, `GET
/api/ready` → `503`; start PostgreSQL, `/api/ready` → `200` without restarting.
**H1 verified 2026-08-01:** Standalone build with PostgreSQL stopped returned `/api/health` 200,
`/api/ready` 503 with `bootstrap.ensureSuperAdmin.failed` logged; after `docker run` brought Postgres
back, `/api/ready` returned 200 without restarting the Node process.

---

### Step 4 — H4: Enforce session revocation on the export route

**File:** `src/app/api/export/[id]/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth";
import { dataExportService, userRepository } from "@/modules/users";
import { rateLimit, clientIp } from "@/shared/security";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // getCurrentUser re-reads the canonical row and compares tokenVersion, so a revoked
  // session cannot download personal data. auth() alone trusts the raw JWT.
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const limited = await rateLimit({ key: `export:${user.id}:${clientIp(request)}`, limit: 10, windowMs: 60_000 });
  if (!limited.allowed) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const { id } = await params;
  const exportRequest = await userRepository.getExportRequest(id, user.id);
  if (!exportRequest || exportRequest.status !== "COMPLETED") {
    return new NextResponse("Export not found", { status: 404 });
  }
  if (exportRequest.expiresAt && new Date() > new Date(exportRequest.expiresAt)) {
    return new NextResponse("Export expired", { status: 410 });
  }

  const data = await dataExportService.getExport(user.id);
  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": `attachment; filename="export-${id}.json"`,
      "Cache-Control": "no-store, private",
    },
  });
}
```

Match the actual `rateLimit`/`clientIp` signatures in `src/shared/security/rate-limit.ts` — the
snippet above is illustrative. Then assert the invariant repo-wide:

```bash
grep -rn "await auth()" src --include=*.ts --include=*.tsx | grep -v "modules/auth/"
# must return nothing
```

---

### Step 5 — C2 Layer 1: Stop the event-bus self-echo

**File:** `src/shared/events/redis-event-bus.ts`

```typescript
async publish(event: DomainEvent): Promise<void> {
  const publisher = this.getPublisher();
  try {
    await publisher.publish(CHANNEL, serialize(event));
  } catch (err) {
    logger.error("redisEventBus.publishFailed", {
      error: String(err),
      eventName: event.name,
    });
    // Redis is unreachable: dispatch locally so the event is not silently lost.
    await this.dispatchLocal(event);
  }
}

private async dispatchLocal(event: DomainEvent): Promise<void> {
  const handlers = this.handlers.get(event.name) ?? [];
  // allSettled: one failing handler must not mask the outcome of its peers (H6).
  const results = await Promise.allSettled(handlers.map((handler) => handler(event)));
  for (const result of results) {
    if (result.status === "rejected") {
      logger.error("redisEventBus.handlerError", {
        error: String(result.reason),
        eventName: event.name,
      });
    }
  }
}
```

**Audit the 23 subscriptions before merging.** Removing the eager local dispatch makes handlers
asynchronous relative to `publish()`. Enumerate them and record the result in §6 of this file:

```bash
grep -rn "\.subscribe(" src --include=*.ts | grep -v node_modules
```

For each, confirm no caller reads state written by the handler immediately after `publish()`
returns. Known call sites to check first: `src/modules/ai/infrastructure/subscribers.ts:25`,
`src/modules/coupons/infrastructure/subscribers.ts:20`, `src/server/subscribers.ts`.

**Regression test** (`src/shared/events/redis-event-bus.test.ts`) — must fail today with `2`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { RedisEventBus } from "./redis-event-bus";

describe("RedisEventBus", () => {
  it("dispatches each published event exactly once per instance", async () => {
    const bus = new RedisEventBus(process.env.REDIS_URL!);
    const handler = vi.fn();
    bus.subscribe("TestEvent", handler);
    await waitForSubscription(bus);

    await bus.publish(makeEvent("TestEvent"));
    await waitForDelivery();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("falls back to a single local dispatch when Redis is unreachable", async () => {
    const bus = new RedisEventBus("redis://127.0.0.1:1"); // closed port
    const handler = vi.fn();
    bus.subscribe("TestEvent", handler);

    await bus.publish(makeEvent("TestEvent"));

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
```

**C2.4 — Subscription audit findings (2026-08-01):**

Command used:
```bash
grep -rn "\.subscribe(" src --include=*.ts | grep -v node_modules | grep -v ".test.ts"
```

All 23 `bus.subscribe(...)` registrations are in `*/infrastructure/subscribers.ts` or `*/bootstrap.ts`
files. None of the handlers read state written by a *different* handler after calling
`eventBus.publish(...)`. The two call sites that publish and then continue are:

1. `src/modules/coupons/application/welcome-first-follower.ts` publishes `WelcomeCouponGenerated`
   and then proceeds to generate and send the welcome message using the `coupon` already in scope.
   No handler state is read.
2. `src/modules/auth/infrastructure/auth.ts` (OAuth `signIn` callback) publishes
   `UserRegistered(autoProvisionOrganization: true)` and then calls `refreshTokenFromDb` to build the
   JWT. This path already expects the user row to carry `organizationId`, but `onUserRegistered`
   currently creates the organization without updating `user.organizationId`, so the JWT will not
   contain the new organization until the next session refresh. This is a latent provisioning bug,
   not a new C2 regression; it should be fixed when organization auto-provisioning is hardened
   (tracked under REQ-0067/REQ-0070, not in this Layer 1 change).

No other `await eventBus.publish(...)` is followed by a read of state that a handler mutates.

---

### Step 6 — C2 Layer 2 + H6: Durable, once-per-cluster delivery

**Files:** `src/shared/events/queue-event-bus.ts` (new), `src/shared/events/event-bus.ts`,
`src/shared/events/index.ts`, `src/modules/*/infrastructure/subscribers.ts`, `fly.toml`

Add a stable id to the event contract:

```typescript
// src/shared/events/event-bus.ts
export interface DomainEvent {
  readonly name: string;
  readonly aggregateId: string;
  readonly eventId: string; // stable, deterministic where possible; used as the dedup key
  readonly occurredAt: Date;
  readonly payload: unknown;
}
```

Base-class default: `eventId = `${name}:${aggregateId}:${crypto.randomUUID()}``, overridden by
publishers that have a natural key (e.g. the Meta message id) so retries collapse.

```typescript
// src/shared/events/queue-event-bus.ts
export class QueueEventBus implements EventBus {
  constructor(private readonly queue: Queue) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.queue.add(event.name, serialize(event), {
      jobId: event.eventId,      // BullMQ dedups on jobId -> once per cluster
      attempts: 5,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: 1_000,
      removeOnFail: false,        // retain failures for inspection / DLQ
    });
  }
}
```

Route side-effecting handlers through the queue rather than executing inline:

```typescript
// src/modules/ai/infrastructure/subscribers.ts
const onNewMessage: EventHandler = async (event) => {
  const payload = event.payload as NewMessagePayload;
  await aiQueue.add(
    "generate-reply",
    { conversationId: payload.conversationId, externalUserId: payload.externalUserId },
    {
      jobId: `reply:${payload.messageId}`, // one reply per inbound message, cluster-wide
      attempts: 3,
      backoff: { type: "exponential", delay: 2_000 },
    },
  );
};
```

Add a persisted guard so duplicates are impossible even if delivery guarantees regress:

```prisma
model Message {
  // ... existing fields
  inReplyToMessageId String?

  @@unique([conversationId, inReplyToMessageId])
}
```

`generateReply` writes `inReplyToMessageId` on the `AI` message; a unique-violation is caught and
treated as "already replied".

`fly.toml`: `min_machines_running = 1` for the `app` process so a subscriber is always connected
(scale-to-zero silently drops Pub/Sub messages — L5).

**Tests:** handler throws → retried per policy → lands in the failed queue; two handlers, one
throws → the other still completes; event published while the consumer is down → processed on
restart; `generateReply` invoked twice for one message id → one `Message` row, one DM.

---

### Step 7 — H2: Webhook idempotency ledger

**Files:** `prisma/schema.prisma` + migration, `src/modules/organizations/application/billing.ts`,
`src/app/api/shopify/webhooks/route.ts`, `src/app/api/meta/webhook/route.ts`,
`src/shared/webhooks/processed-events.repository.ts` (new), `src/jobs/` (retention job)

```prisma
model ProcessedWebhookEvent {
  id          String   @id            // provider event id, e.g. Stripe evt_… or x-shopify-webhook-id
  provider    String                  // "stripe" | "shopify" | "meta"
  type        String
  processedAt DateTime @default(now())

  @@index([provider, processedAt])
}
```

```typescript
// src/modules/organizations/application/billing.ts
async function fulfillCheckout(payload: string, signature: string) {
  // ... signature verification unchanged ...
  const event = rawEvent as Stripe.Event;

  // Stripe delivers at least once and retries for 3 days. Record the event id first;
  // a unique violation means this event was already fulfilled.
  try {
    await deps.processedEvents.create({ id: event.id, provider: "stripe", type: event.type });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      logger.info("stripe.webhook.duplicate", { eventId: event.id, type: event.type });
      return;
    }
    throw error;
  }

  switch (event.type) { /* … see Step 8 … */ }
}
```

Shopify: key on `x-shopify-webhook-id` (Shopify retries up to 19 times over 48 hours). Meta:
replace the raw-body hash dedup with the same ledger, keyed on the delivery id.

Retention job (BullMQ repeatable, daily): delete `ProcessedWebhookEvent` where
`processedAt < now() - 30 days`.

**Ordering note.** Recording *before* processing means a crash mid-fulfillment marks the event
processed. `updatePlan` is idempotent, so this is the safer trade-off. If a non-idempotent
fulfillment step is ever added, move the insert inside the fulfillment transaction.

---

### Step 8 — H3: Bidirectional subscription lifecycle

**File:** `src/modules/organizations/application/billing.ts`

```typescript
const ACTIVE_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing"]);

function planFromPriceId(priceId: string | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === env.STRIPE_PRICE_PRO) return Plan.PRO;
  if (priceId === env.STRIPE_PRICE_STARTER) return Plan.STARTER;
  return null; // unknown price must never silently downgrade
}

case "customer.subscription.created":
case "customer.subscription.updated": {
  const subscription = event.data.object as Stripe.Subscription;
  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) {
    logger.error("stripe.subscription.missingMetadata", { subscriptionId: subscription.id });
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const plan = planFromPriceId(priceId) ?? Plan.FREE;
  const entitledPlan = ACTIVE_STATUSES.has(subscription.status) ? plan : Plan.FREE;

  await deps.organizations.updatePlan(organizationId, {
    plan: entitledPlan,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
  });
  logger.info("stripe.subscription.synced", { organizationId, plan: entitledPlan, status: subscription.status });
  return;
}

case "invoice.paid":
case "invoice.payment_succeeded": {
  // Clears past_due once Stripe dunning recovers the payment.
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = resolveSubscriptionId(invoice);
  if (!subscriptionId) return;
  const org = await findOrganizationBySubscriptionId(deps.organizations, subscriptionId);
  if (!org) return;
  await deps.organizations.updatePlan(org.id, {
    plan: org.plan,
    subscriptionId,
    subscriptionStatus: "active",
  });
  return;
}
```

`resolveSubscriptionId(invoice)` must handle both payload shapes — `invoice.subscription` (older
API versions) and `invoice.parent.subscription_details.subscription` (newer) — because the Stripe
API version is currently unpinned (M6, `REQ-0068`). Pin the version in the same release.

**Per Q3 (REQ-0067 §5):** `past_due` retains the plan. `ACTIVE_STATUSES` deliberately excludes
`past_due`, so the `entitledPlan` computation above would drop a `past_due` org to `FREE` —
**adjust to match Q3** by adding `past_due` to a `RETAINED_STATUSES` set that keeps the current
plan while recording the status. Document the final semantics in `docs/specs/current-state.md`.

**Deployment:** enable `customer.subscription.created`, `customer.subscription.updated`,
`invoice.paid`, and `invoice.payment_succeeded` on the Stripe webhook endpoint. Back-fill orgs
currently stuck in `past_due` with a one-off script.

---

### Step 9 — H5: Soft-archive projects

**Files:** `prisma/schema.prisma` + migration,
`src/modules/organizations/infrastructure/project.repository.ts`,
`src/modules/organizations/presentation/project-actions.ts`

Pre-migration check (duplicate names would break the new unique constraint):

```sql
SELECT "organizationId", name, COUNT(*)
FROM "Project" GROUP BY 1, 2 HAVING COUNT(*) > 1;
```

```prisma
model Project {
  id              String       @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  name            String
  description     String?
  instagramHandle String?
  integrationId   String?
  integration     Integration? @relation(fields: [integrationId], references: [id], onDelete: SetNull)
  archivedAt      DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  members ProjectMember[]

  @@unique([organizationId, name])
  @@index([organizationId])
  @@index([archivedAt])
}
```

```typescript
// src/modules/organizations/infrastructure/project.repository.ts
async archive(id: string, organizationId: string): Promise<ProjectRecord | null> {
  // updateMany: a missing or cross-tenant id yields count 0 instead of throwing P2025.
  const result = await prisma.project.updateMany({
    where: { id, organizationId, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  if (result.count === 0) return null;
  return this.findById(id, organizationId);
}

async restore(id: string, organizationId: string): Promise<ProjectRecord | null> {
  const result = await prisma.project.updateMany({
    where: { id, organizationId, archivedAt: { not: null } },
    data: { archivedAt: null },
  });
  if (result.count === 0) return null;
  return this.findById(id, organizationId);
}

async listByOrganization(
  organizationId: string,
  options?: { includeArchived?: boolean },
): Promise<ProjectRecord[]> {
  const projects = await prisma.project.findMany({
    where: {
      organizationId,
      ...(options?.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: { createdAt: "desc" },
  });
  return projects.map(mapProject);
}
```

`archiveProjectAction` must surface the `null` result as a user-facing error instead of throwing.
Also replace the check-then-insert in `create` with a `P2002` catch now that the unique constraint
exists (this closes the M3 race).

Inventory every other hard delete:

```bash
grep -rn "prisma\.\w*\.delete(" src/modules
```

Record each with a keep/change decision in §6.

---

### Step 10 — H7: Cart state model and abandonment sweep

**Files:** `prisma/schema.prisma` + migration,
`src/modules/ecommerce/application/apply-shopify-webhook.ts`,
`src/modules/ecommerce/infrastructure/cart.repository.ts` (new), `src/jobs/` sweep

```prisma
model Cart {
  id             String    @id @default(cuid())
  storeId        String
  store          Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  cartToken      String
  email          String?
  lineItemTitles String[]
  totalPrice     Decimal?  @db.Decimal(12, 2)
  currency       String?
  recoveredUrl   String?
  lastActivityAt DateTime
  notifiedAt     DateTime?
  convertedAt    DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@unique([storeId, cartToken])
  @@index([storeId, lastActivityAt])
  @@index([notifiedAt])
}
```

```typescript
// src/modules/ecommerce/application/apply-shopify-webhook.ts
if (topic === "checkouts/create" || topic === "checkouts/update") {
  const cart = mapAbandonedCartPayload(input.payload);
  // Record state only. Abandonment is a function of elapsed inactivity, which the
  // scheduled sweep evaluates — not of a cart edit.
  await deps.carts.upsert({
    storeId,
    cartToken: cart.cartToken,
    email: cart.email,
    lineItemTitles: cart.lineItemTitles,
    totalPrice: cart.totalPrice,
    currency: cart.currency,
    recoveredUrl: cart.recoveredUrl,
    lastActivityAt: new Date(),
  });
  return { ok: true };
}
```

Sweep job (repeatable, every 15 minutes): select carts where
`lastActivityAt < now() - ABANDONED_CART_THRESHOLD_MINUTES`, `notifiedAt IS NULL`,
`convertedAt IS NULL`; publish `AbandonedCartDetected` once per cart; set `notifiedAt` in the same
transaction. `orders/create` must set `convertedAt` on the matching cart token.

Threshold is configurable via `ABANDONED_CART_THRESHOLD_MINUTES` (default 60) in
`src/shared/config/env.ts`.

**Subscriber decision.** If no subscriber ships in this release, remove the event publication and
the `AbandonedCartDetected` declaration rather than leaving a misleading no-op. Record the decision
in §6.

---

### Step 11 — H10: Atomic seat-limit enforcement

**Files:** `src/modules/organizations/infrastructure/organization-invite.repository.ts`,
`src/modules/organizations/application/invite-member.ts`

Keep Prisma out of the application layer (AGENTS.md §1) by putting the transaction in the
repository, mirroring `store.repository.ts`:

```typescript
// organization-invite.repository.ts
async createWithinSeatLimit(input: CreateInviteInput & { teamSeats: number | null }): Promise<
  | { ok: true; invite: InviteRecord }
  | { ok: false; reason: "seat_limit"; limit: number }
> {
  return prisma.$transaction(
    async (tx) => {
      if (input.teamSeats !== null) {
        const [userCount, pendingCount] = await Promise.all([
          tx.user.count({ where: { organizationId: input.organizationId, deletedAt: null } }),
          tx.organizationInvite.count({
            where: { organizationId: input.organizationId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
          }),
        ]);
        if (userCount + pendingCount >= input.teamSeats) {
          return { ok: false as const, reason: "seat_limit" as const, limit: input.teamSeats };
        }
      }
      const invite = await tx.organizationInvite.create({ data: { /* … */ } });
      return { ok: true as const, invite: mapInvite(invite) };
    },
    { isolationLevel: "Serializable" },
  );
}
```

Wrap the call in a bounded retry (3 attempts) for Postgres serialization failures (`P2034` /
SQLSTATE `40001`). `invite-member.ts` converts `{ ok: false, reason: "seat_limit" }` to
`err(new SeatLimitError(limit))` and only sends the invite email after the transaction commits.

**Test:** fire `teamSeats + 5` invites concurrently with `Promise.all`; assert pending invites
never exceed `teamSeats`.

Inventory other plan-limited paths and confirm each is atomic:

```bash
grep -rn "planLimits(" src/modules
```

---

## 4. Subtasks

- [ ] **C1.1** Set `trustHost: true` in `authConfig`.
- [ ] **C1.2** Add `AUTH_TRUST_HOST` to `env.ts`, `.env.example`, `fly.toml`, `docs/deployment.md`.
- [ ] **C1.3** Add same-origin `redirect` callback validation against `APP_URL`.
- [ ] **C1.4** Extend the CI smoke test to assert `/api/auth/session` → `200`.
- [ ] **C1.5** Verify a production standalone boot without `AUTH_TRUST_HOST` returns `200`.
- [ ] **H9.1** Add `/api/shopify/webhooks` to `publicPaths`.
- [ ] **H9.2** Review the `publicPaths` prefix matcher for unintended sub-route exposure.
- [ ] **H9.3** Add the CI smoke assertion that the endpoint does not redirect.
- [ ] **H9.4** Integration test: valid HMAC `products/create` persists a product.
- [ ] **H1.1** Wrap `ensureSuperAdmin` in `try/catch` with `bootstrap.ensureSuperAdmin.failed`.
- [ ] **H1.2** Add `scripts/seed-super-admin.ts` and wire it into `fly.toml` `release_command`.
- [ ] **H1.3** Add the Fly.io `/api/ready` health check block.
- [ ] **H1.4** Verify DB-down boot: `/api/health` `200`, `/api/ready` `503`, recovery without restart.
- [ ] **H4.1** Swap `auth()` for `getCurrentUser()` in `/api/export/[id]`.
- [ ] **H4.2** Add `Cache-Control: no-store, private` and rate limiting.
- [ ] **H4.3** Assert repo-wide that no `await auth()` remains outside `src/modules/auth/`.
- [ ] **H4.4** Tests: valid, stale `tokenVersion`, soft-deleted, cross-user id.
- [ ] **C2.1** Write the failing exactly-once test for `RedisEventBus`.
- [ ] **C2.2** Remove the eager `dispatchLocal` from `publish()`; add the Redis-down fallback.
- [ ] **C2.3** Switch `dispatchLocal` to `Promise.allSettled` with per-rejection logging.
- [ ] **C2.4** Audit all 23 `bus.subscribe(...)` sites for eager-dispatch assumptions; record findings.
- [ ] **C2.5** Add `eventId` to `DomainEvent` and all publishers.
- [ ] **C2.6** Implement `QueueEventBus` on BullMQ with `jobId` dedup, retries, and retained failures.
- [ ] **C2.7** Route AI reply, coupon, and notification handlers through the queue with stable `jobId`s.
- [ ] **C2.8** Add `Message.inReplyToMessageId` + `@@unique([conversationId, inReplyToMessageId])`.
- [ ] **C2.9** Two-instance integration test: one publish → one handler run per instance.
- [ ] **H6.1** Set `min_machines_running = 1` for the app process in `fly.toml`.
- [ ] **H6.2** Export failed-queue depth as a metric.
- [ ] **H6.3** Tests: retry-to-DLQ, one-of-two-handlers-throws, consumer-down-then-up.
- [ ] **H2.1** Add the `ProcessedWebhookEvent` model and migration.
- [ ] **H2.2** Add `processed-events.repository.ts` and wire it into the billing deps.
- [ ] **H2.3** Record `event.id` before Stripe fulfillment; early-return on duplicates.
- [ ] **H2.4** Dedup Shopify on `x-shopify-webhook-id`.
- [ ] **H2.5** Migrate the Meta dedup onto the shared ledger.
- [ ] **H2.6** Add the 30-day retention job.
- [ ] **H2.7** Tests: duplicate delivery, distinct events, concurrent duplicates.
- [ ] **H3.1** Handle `customer.subscription.created` / `.updated`.
- [ ] **H3.2** Handle `invoice.paid` / `invoice.payment_succeeded` to clear `past_due`.
- [ ] **H3.3** Add `planFromPriceId` and `ACTIVE_STATUSES` / `RETAINED_STATUSES` per Q3.
- [ ] **H3.4** Add `resolveSubscriptionId` handling both invoice payload shapes.
- [ ] **H3.5** Document required Stripe dashboard events in `docs/deployment.md`.
- [ ] **H3.6** Write the `past_due` backfill script.
- [ ] **H3.7** Tests: fail→succeed, portal downgrade, `unpaid` status, unknown price.
- [ ] **H5.1** Run the duplicate-project-name pre-check.
- [ ] **H5.2** Add `archivedAt`, `@@unique([organizationId, name])`, `@@index([archivedAt])` + migration.
- [ ] **H5.3** Convert `archive` to `updateMany`; add `restore`; filter archived from lists.
- [ ] **H5.4** Replace the check-then-insert in `create` with a `P2002` catch (closes M3's race).
- [ ] **H5.5** Handle the `null` result in `archiveProjectAction`.
- [ ] **H5.6** Inventory all `prisma.*.delete(` call sites; record decisions.
- [ ] **H5.7** Tests: archive keeps row + members, excluded from list, cross-tenant → null, restore round-trip.
- [ ] **H7.1** Add the `Cart` model and migration.
- [ ] **H7.2** Convert `checkouts/*` handling to a cart upsert with no event.
- [ ] **H7.3** Mark `convertedAt` on `orders/create` for the matching cart token.
- [ ] **H7.4** Implement the abandonment sweep job with `notifiedAt` guarding.
- [ ] **H7.5** Add `ABANDONED_CART_THRESHOLD_MINUTES` to config.
- [ ] **H7.6** Ship a subscriber or remove the event; record the decision.
- [ ] **H7.7** Tests: ten updates → one row/zero events; idle → one event; order → no event; double sweep → no duplicate.
- [ ] **H10.1** Add `createWithinSeatLimit` with a serializable transaction.
- [ ] **H10.2** Add bounded serialization-failure retries.
- [ ] **H10.3** Convert the result to `err(new SeatLimitError(...))` at the application boundary.
- [ ] **H10.4** Send the invite email only after commit.
- [ ] **H10.5** Concurrency test: `teamSeats + 5` parallel invites.
- [ ] **H10.6** Inventory other `planLimits(` call sites for the same race.

## 5. Acceptance Criteria

- [ ] All acceptance criteria in `REQ-0067` §7 are met.
- [ ] Every regression test was observed failing against pre-fix code and passing after.
- [ ] `npm run lint` passes with `--max-warnings=0`.
- [ ] `npm run typecheck` passes with no `any` and no `@ts-ignore` introduced.
- [ ] `npm run test` passes.
- [ ] `npm run build` and `npm run build:worker` pass.
- [ ] `npx prisma migrate deploy` applies cleanly and `prisma migrate diff` reports no drift.
- [ ] `docs/specs/current-state.md` updated (event delivery, webhook ledger, Project archive, Cart).
- [ ] `CHANGELOG.md` updated last.

## 6. Notes / Blockers

- **Audit correction:** H9 is recorded in `PRODUCTION_READINESS_AUDIT.md` §4 as "Fixed — Awaiting
  Verification" at `f64cf84`. Re-verified at `33e2e0b`: `/api/shopify/webhooks` is **absent** from
  `publicPaths`. Treat as open and release-blocking.
- **Blocked on CI Redis.** The C2/H6 integration tests need a `redis:7-alpine` service in
  `.github/workflows/ci.yml` (`REQ-0074`). Land that first or the new tests fail in CI.
- **Record here during implementation:**
  - Result of the 23-subscription eager-dispatch audit (C2.4).
  - Result of the `prisma.*.delete(` inventory (H5.6).
  - Result of the `planLimits(` inventory (H10.6).
  - The `AbandonedCartDetected` subscriber decision (H7.6).
- **Sequencing:** Step 7 before Step 8 (both edit `billing.ts`). Steps 5 and 6 in one PR. Steps 1,
  2, 3, 4 are independent and safe to land first as a hotfix set.
