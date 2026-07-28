# Spec 0053: Audit Fixes — Production Readiness

- **Module(s):** Auth, Users, Organizations, eCommerce, Meta, AI, CRM, Conversations, Growth, Intelligence, Support, Notifications, Shared Infrastructure
- **Status:** Draft
- **Owner:** Devin
- **Related task(s):** `docs/tasks/0053-audit-fixes-progress.md`
- **Related ADR(s):** ADR-0001 (DDD / loose coupling)
- **Last updated:** 2026-07-26

## 1. Summary

This spec consolidates all fixes identified in the 2026-07-26 production-readiness audit (`docs/audit/2026-07-26-production-readiness-audit.md`). It covers authentication/session hardening, broken access control (IDOR / role escalation), payment fulfillment correctness, external API security, prompt/SSRF/regex injection prevention, in-memory-state durability, database performance, and security/infrastructure hardening.

## 2. Goals

- Close every Critical and High finding from the audit.
- Ensure tenant isolation by scoping all mutating repository calls.
- Fix the Stripe billing lifecycle so paid plans are actually recorded.
- Harden auth (OAuth onboarding, MFA/reset rate limiting, stale JWT, session invalidation).
- Remove dangerous public barrel exports and enforce role hierarchy.
- Secure external API calls (Shopify, Meta, OpenAI) against SSRF, injection, and hang.
- Replace or scope in-memory intelligence/goal/feedback/rollout state.
- Add missing database indexes and tighten observability/logging hygiene.

## 3. Non-Goals

- No new product features (new pages or AI capabilities).
- No redesign of the event bus architecture beyond adding durable persistence where required.
- No migration to a different auth provider.

## 4. User Stories

- As an OAuth user, I can sign up and be onboarded into an organization without redirect loops.
- As a paying customer, my workspace plan is updated correctly after a successful Stripe checkout.
- As an admin, I cannot be locked out by a store owner self-demotion or privilege escalation.
- As a user of one store, I cannot view or mutate data belonging to another store.
- As a platform, MFA and reset codes are resistant to brute force and are not logged.

## 5. Domain Model

No new entities are introduced except where persistence replaces in-memory state:

- `IntelligenceFeedback` table (replaces in-memory ratings array).
- `IntelligenceDismissal` table (replaces `dismissalReasons` map).
- `GoalPlanVersion` table (replaces in-memory goal-plan map) — scoped to `organizationId`/`storeId`.
- `RolloutGate` per-organization setting (replaces global in-memory gates).

All other changes are invariants/rules on existing entities.

## 6. Public Contract

- `users` module public barrel must **no longer** export `setUserSuperAdmin` or `changeUserRole` directly. Only the action wrappers remain public.
- `organizations` public barrel must **no longer** export `applyCouponToCheckoutAction` or `incrementCouponUsageAction`.
- Auth session helpers (`getCurrentUser`, `requireRole`) continue to be exposed, but internally re-validate role/organization against the DB for mutating actions.

## 7. Data / Persistence

### New indexes (Prisma migration)

Add `@@index([foreignKey])` or composite indexes for high-cardinality relation scalars and common query patterns:

```prisma
model User {
  ...
  organizationId String?
  storeId        String?

  @@index([organizationId])
  @@index([storeId])
}

model Account {
  ...
  @@index([userId])
}

model Session {
  ...
  @@index([userId])
}

model Store {
  ...
  @@index([organizationId])
}

model Integration {
  ...
  @@index([storeId, type])
  @@index([storeId, type, provider])
  @@index([externalId])
}

model Product {
  ...
  @@index([storeId])
}

model Customer {
  ...
  @@index([storeId])
}

model Conversation {
  ...
  @@index([storeId])
  @@index([storeId, customerId])
  @@index([customerId])
}

model Message {
  ...
  @@index([conversationId])
}

model Coupon {
  ...
  @@index([storeId])
  @@index([customerId])
}

model CouponUsage {
  ...
  @@index([couponId])
  @@index([customerId])
}

model Follower {
  ...
  @@index([customerId])
  @@index([storeId])
}

model AIConfiguration {
  ...
  @@index([storeId])
}

model SocialLead {
  ...
  @@index([customerId])
  @@index([storeId])
}

model UgcAsset {
  ...
  @@index([customerId])
  @@index([storeId])
}

model Ambassador {
  ...
  @@index([customerId])
  @@index([storeId, code])
}

model ReferralOrder {
  ...
  @@index([ambassadorId])
  @@index([storeId, orderId])
}

model BackInStockSubscription {
  ...
  @@index([customerId])
  @@index([storeId, productId])
}

model Project {
  ...
  @@index([organizationId, name])
  @@index([integrationId])
}

model ProjectMember {
  ...
  @@index([projectId])
  @@index([userId])
}

model AuditLog {
  ...
  @@index([actorId])
}

model TicketComment {
  ...
  @@index([userId])
  @@index([ticketId])
}

model SupportTicket {
  ...
  @@index([userId])
}

model SaaSCoupon {
  ...
  @@index([createdBy])
}

model MetaCatalogSync {
  ...
  @@index([storeId])
}

model MetaProductMapping {
  ...
  @@index([storeId, status])
  @@index([storeId, productId])
}

model ShoppableMedia {
  ...
  @@index([storeId, status])
}

model SocialComment {
  ...
  @@index([storeId, hidden, createdAt])
}

model SocialMention {
  ...
  @@index([storeId, source])
}

model TrackedAccount {
  ...
  @@index([storeId, handle])
}
```

### VerificationToken single-active code

Change repository behavior so `sendCode` deletes prior rows for the same `(purpose, email)`:

```ts
async save(identifier: string, token: string, expiresAt: Date): Promise<void> {
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: { identifier, token, expires: expiresAt },
    }),
  ]);
}
```

### New in-memory-state tables

```prisma
model IntelligenceFeedback {
  id            String   @id @default(cuid())
  organizationId String
  insightId     String
  userId        String
  understood    Boolean
  hoursSaved    Int      @default(0)
  falsePositive Boolean  @default(false)
  falseNegative Boolean  @default(false)
  createdAt     DateTime @default(now())

  @@index([organizationId])
  @@index([insightId])
  @@index([userId])
}

model IntelligenceDismissal {
  id          String   @id @default(cuid())
  organizationId String
  insightId   String   @unique
  reason      String
  userId      String
  dismissedAt DateTime @default(now())

  @@index([organizationId])
  @@index([insightId])
  @@index([userId])
}

model GoalPlanVersion {
  id          String   @id @default(cuid())
  goalId      String
  organizationId String
  version     Int
  workflowId  String   @unique
  status      String
  holdoutPct  Int      @default(10)
  postLaunchRecommendation String @default("continue")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([goalId])
  @@index([organizationId])
}

model RolloutGate {
  id            String   @id @default(cuid())
  organizationId String
  name          String
  enabled       Boolean  @default(false)
  updatedAt     DateTime @updatedAt

  @@unique([organizationId, name])
  @@index([organizationId])
}
```

## 8. API / UI Surface

### 8.1 Auth

#### OAuth onboarding

Add `events.signIn` to emit `UserRegistered` for OAuth-first accounts without an organization:

```ts
events: {
  async signIn({ user, account }) {
    if (account?.provider === "credentials" || !user.id || !user.email) return;
    const existing = await accounts.findById(user.id);
    if (existing?.organizationId) return;
    await eventBus.publish(
      new UserRegistered(user.id, {
        userId: user.id,
        email: user.email,
        role: "STORE_OWNER",
      }),
    );
  },
},
```

Update `/login` and `/register` redirects:

```ts
export default async function LoginPage() {
  const user = await getCurrentUser();
  if (!user) return <LoginForm />;
  if (!user.organizationId) redirect("/onboarding");
  redirect("/dashboard");
}
```

#### Stale JWT role / super-admin

Refresh `role` in `jwt` callback on `update` trigger and re-validate in `requireRole`:

```ts
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true, isSuperAdmin: true, organizationId: true },
  });
  if (!fresh || !roleSatisfies(fresh.role, role)) throw new ForbiddenError();
  return {
    ...user,
    role: fresh.role,
    isSuperAdmin: fresh.isSuperAdmin,
    organizationId: fresh.organizationId,
  };
}
```

#### Secret env

Map `NEXTAUTH_SECRET` to `AUTH_SECRET` in `authConfig`:

```ts
export const authConfig: NextAuthConfig = {
  ...,
  secret: env.NEXTAUTH_SECRET,
};
```

#### MFA / reset rate limiting

Use existing `rateLimit` helper in actions:

```ts
const limit = await rateLimit({
  key: `login:${parsed.data.email}`,
  limit: 5,
  windowMs: 15 * 60 * 1000,
});
if (!limit.allowed) {
  return { error: "Too many attempts. Try again later." };
}
```

#### Reset invalidates sessions

Add `tokenVersion` to `User` and validate in `jwt` callback. After reset, bump token version:

```ts
// auth.ts jwt callback
if (trigger === "update" && typeof token.id === "string") {
  const fresh = await accounts.findById(token.id);
  if (!fresh || fresh.tokenVersion !== token.tokenVersion) {
    throw new Error("Session invalidated");
  }
  token.role = fresh.role;
  token.isSuperAdmin = fresh.isSuperAdmin;
  token.organizationId = fresh.organizationId;
  token.tokenVersion = fresh.tokenVersion;
}

// resetPasswordAction
await accounts.updatePassword({ id: account.id, passwordHash });
await accounts.bumpTokenVersion(account.id);
```

### 8.2 RBAC / Users

Remove dangerous exports from `src/modules/users/index.ts`:

```ts
export {
  getUserProfile,
  listOrganizationUsers,
  listAllUsers,
  updateProfile,
  auditQueries,
  auditCommands,
} from "./infrastructure/container";
// setUserSuperAdmin and changeUserRole are not exported here.
// Use toggleUserSuperAdminAction and changeUserRoleAction.
```

Enforce role hierarchy in `changeUserRole`:

```ts
if (!roleSatisfies(changedByUser.role, input.role)) {
  return err(new ForbiddenError("You cannot assign a role higher than your own."));
}
if (input.userId === changedByUserId) {
  return err(new ForbiddenError("You cannot change your own role."));
}
```

### 8.3 Stripe Billing

Set top-level `metadata` in checkout session creation:

```ts
const sessionInput: Stripe.Checkout.SessionCreateParams = {
  mode: "subscription",
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: input.successUrl,
  cancel_url: input.cancelUrl,
  client_reference_id: input.organizationId,
  metadata: {
    organizationId: input.organizationId,
    plan: input.plan,
  },
  subscription_data: {
    metadata: {
      organizationId: input.organizationId,
      plan: input.plan,
    },
  },
};
```

Move coupon usage increment to webhook fulfillment:

```ts
async fulfillCheckout(payload, signature) {
  ...
  const session = event.data.object as Stripe.Checkout.Session;
  const plan = session.metadata?.plan;
  const organizationId = session.client_reference_id;

  if (plan && organizationId) {
    await deps.organizations.updatePlan(organizationId, {
      plan,
      subscriptionId,
      subscriptionStatus: "active",
    });
  }

  if (session.metadata?.couponCode) {
    await saasCouponRepository.incrementUsageByCode(session.metadata.couponCode);
  }
}
```

Remove `incrementUsage` call from `src/app/api/stripe/checkout/route.ts`.

### 8.4 IDOR / Tenant Scoping

Refactor repository signatures to accept tenant scope:

```ts
async takeOver(input: { id: string; storeId: string; humanUserId: string }): Promise<ConversationRecord | null> {
  const updated = await prisma.conversation.update({
    where: { id: input.id, storeId: input.storeId },
    data: { status: "HUMAN_ACTIVE", assignedHumanId: input.humanUserId },
  });
  return updated ? toRecord(updated) : null;
}
```

Apply the same pattern to all mutating repository methods listed in the audit.

Implemented repository scopes:

- `intelligence` `Recommendation` and `ActionPlan`: `findById`, `updateStatus`, `updateObjective`, `updateConfidence`, and `invalidate` now require `organizationId` and use `where: { id, organizationId }`.
- `intelligence` application services (`recommendationService`, `actionPlanService`) and presentation actions (`approveRecommendationAction`, `executeActionPlanAction`, `dismissRecommendationAction`) pass `user.organizationId` through to the repositories.
- `Outcome`, `Goal`, `Prediction`, `Hypothesis`, `BusinessLearning`, `CompetitorInsight`, `DataQualityIssue`, `ActionOutcome`, and `Journey` repository mutations (`findById`, `updateStatus`, `updateMeasured`, `updatePacing`, `expire`, `updateOutcome`, `appendStep`) now require `organizationId` and use `where: { id, organizationId }`.
- `OutcomeService.measure`, `GoalService.updatePacing`, `JourneyService.getJourney`, `ActionOutcomeService` queue handler, and `BusinessLearningService.learnFromOutcome` updated to thread `organizationId` through to repositories.

### 8.6 In-Memory State (PR-6)

Implemented:

- Added Prisma models: `IntelligenceFeedback`, `IntelligenceDismissal`, `GoalPlanVersion`, `RolloutGate`.
- Migration `20260728085245_audit_fixes_intelligence_state_persistence` adds the four tables and indexes.
- Added repository ports and Prisma implementations:
  - `IntelligenceFeedbackRepository` / `PrismaIntelligenceFeedbackRepository`
  - `IntelligenceDismissalRepository` / `PrismaIntelligenceDismissalRepository`
  - `GoalPlanRepository` / `PrismaGoalPlanRepository`
  - `RolloutGateRepository` / `PrismaRolloutGateRepository`
- Rewrote domain services to use repositories and require `organizationId`:
  - `makeIntelligenceFeedbackService` persists ratings and KPIs per organization.
  - `makeIntelligenceFeedInteractionService` persists dismissal reasons per organization.
  - `makeGoalPlanGenerationService` creates/test-runs/launches/post-launches goal plan versions per organization.
  - `makeRolloutService` fetches/sets per-organization gates and enforces environment/risk tier rules.
- Updated `container.ts` to instantiate the new repositories and wire the services.
- Updated presentation actions (`submitIntelligenceFeedbackAction`, `getIntelligenceFeedbackKpisAction`, `dismissInsightAction`, `createGoalPlanWorkflowAction`, `testGoalPlanWorkflowAction`, `launchGoalPlanWorkflowAction`, `getRolloutGatesAction`, `setRolloutGateAction`) to pass `organizationId`.
- Verification scripts `verify-task367.ts` and `verify-task369.ts` updated to the new async/organization-scoped signatures.

### 8.5 Shopify / Meta / OpenAI Security

#### Shopify SSRF

Validate `shopDomain`:

```ts
const SHOPIFY_DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

function isValidShopifyDomain(domain: string): boolean {
  if (!SHOPIFY_DOMAIN_RE.test(domain)) return false;
  try {
    const url = new URL(`https://${domain}`);
    return url.hostname.endsWith(".myshopify.com");
  } catch {
    return false;
  }
}
```

Use `URL` object for requests:

```ts
const url = new URL(path, `https://${this.shopDomain}/admin/api/${API_VERSION}/`);
const res = await fetch(url.toString(), { ... });
```

#### Meta URL encoding

```ts
const url = new URL(`${GRAPH_API_BASE}/${integration.accountId}`);
url.searchParams.set(
  "fields",
  `business_discovery.username(${encodeURIComponent(handle)}){id,media{...}}`,
);
url.searchParams.set("access_token", token);
```

#### OpenAI

```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 20_000);
try {
  const res = await fetch(OPENAI_API_BASE, { ..., signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```

Sanitize user strings in prompts:

```ts
function escapePrompt(str: string): string {
  return str.replace(/[<>{}\[\]\\|`]/g, "");
}
```

### 8.7 Infrastructure

#### CSP / HSTS

```ts
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://graph.facebook.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ...,
];
```

Also add `poweredByHeader: false` to `next.config.ts`.

#### Sign-out

Use `signOut` server action instead of raw form:

```tsx
import { signOut } from "@/modules/auth";
...
<form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
  <Button type="submit">Sign out</Button>
</form>
```

#### Email

```ts
const transporter = nodemailer.createTransport({
  host: this.config.host,
  port: this.config.port,
  secure: this.config.port === 465,
  requireTLS: true,
  auth: { user: this.config.user, pass: this.config.pass },
});
```

Mask console logs:

```ts
class ConsoleEmailSender implements EmailSender {
  async send(to, subject, text) {
    const masked = text
      .replace(/\b\d{6}\b/g, "******")
      .replace(/code=[\w-]+/gi, "code=***");
    logger.info("email.console", { to, subject, body: masked });
  }
}
```

#### Logger redaction

```ts
const SENSITIVE_KEYS = ["password", "token", "secret", "authorization", "apikey", "api_key", "email", "phone"];
function sanitize(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (SENSITIVE_KEYS.some((b) => k.toLowerCase().includes(b))) out[k] = "***";
    else out[k] = v;
  }
  return out;
}
```

## 9. External Integrations

- **Stripe:** lifecycle webhook handling (see 8.3).
- **Meta:** URL encoding and rate-limit guard hardening (see 8.5).
- **Shopify:** domain validation and `URL` object requests (see 8.5).
- **OpenAI:** prompt escaping, JSON mode, timeout (see 8.5).

## 10. Edge Cases & Failure Modes

- OAuth account already has an organization → `signIn` event must not create a duplicate org.
- Password reset while user has active sessions → all sessions invalidated.
- User role changed while logged in → next mutating action uses fresh role.
- Concurrent referrals → `incrementEarnings` must be atomic.
- Duplicate coupon codes at checkout → Stripe promotion-code idempotency + DB unique constraint.
- Webhook replay → Stripe webhook must be idempotent; use `session.id` to guard.
- In-memory state lost on restart → DB-backed persistence.

## 11. Security & Privacy

- No secret logging; all code paths audited for `accessToken`, `passwordHash`, `apiKey`, MFA codes, reset links.
- RBAC on every public server action and exported application service.
- Tenant scope on every repository mutation.
- Webhook signatures verified before any side effect.
- CSP blocks inline scripts; nonces handled by Next.js if configured.

## 12. Testing Strategy

- **Domain unit tests:** `changeUserRole` hierarchy, `roleSatisfies`, rate-limit buckets.
- **Repository/contract tests:** each tenant-scoped mutation rejects cross-tenant IDs.
- **Integration tests:** OAuth onboarding flow, Stripe webhook, reset-password session invalidation.
- **E2E:** Sign up → onboard → pay → plan updated; one user cannot see another tenant’s data.

## 13. Acceptance Criteria (Definition of Done)

- [ ] OAuth users are onboarded into an organization and reach `/dashboard`.
- [ ] Stripe `checkout.session.completed` updates `Organization.plan` and `subscriptionId`.
- [ ] Coupon usage increments only after successful payment.
- [ ] `users` barrel no longer exports `setUserSuperAdmin` or `changeUserRole`.
- [ ] `changeUserRole` enforces hierarchy and blocks self-demotion/last-owner removal.
- [ ] All mutating repository methods include tenant scope and reject cross-tenant IDs.
- [ ] MFA and reset codes are rate-limited, single-active, and not logged.
- [ ] Password reset invalidates existing sessions.
- [ ] Shopify `shopDomain` is validated and requests use `URL` object.
- [ ] Meta Graph API URLs encode dynamic values.
- [ ] OpenAI calls have a timeout and user content is escaped/delimited.
- [ ] Intelligence feedback, dismissal, and goal-plan state persist to PostgreSQL.
- [ ] CSP, HSTS, and `X-Powered-By` hardening applied.
- [ ] Sign-out works via authenticated `signOut` action.
- [ ] Prisma indexes added and heavy queries are under budget.
- [ ] `npm run lint`, `typecheck`, `test`, and `build` pass.
- [ ] `CHANGELOG.md` updated.

## 14. Open Questions

- Should `GoalPlanVersion` be a new table or folded into `ActionPlan`? (Implemented as a separate `GoalPlanVersion` table.)
- Should `RolloutGate` be per-organization or super-admin-only platform settings? (Implemented as a per-organization DB setting; super-admin controls the toggle.)
