# TASK-370: Intelligence Domain Ownership Refactor — Live Progress Tracker

Tracks the architecture-review findings and the security gaps. Status legend:

- `[x]` Done — implemented and verified.
- `[~]` Partial — scaffolded or partly done; needs more work.
- `[ ]` Not started.

---

## Architecture gaps (from review)

### 1. Intelligence is not an orchestrator anymore
- [~] Domain modules publish their own `*InsightGenerated` / `*RecommendationGenerated` events (ecommerce events added; CRM/conversations/growth/branddeals pending).
- [~] `intelligence` stops owning commerce/crm/conversation/growth/brand-deal detection rules (ecommerce order/revenue detection extracted; remaining modules pending).
- [ ] `intelligence` becomes a prioritizer/scorer/conflict resolver.

### 2. Domain knowledge is leaking
- [~] Product availability/demand detection moved to `ecommerce` (order/revenue detection extracted; product-mention/demand cross-domain logic still in intelligence).
- [~] Conversation intent/support detection moved to `conversations` (high-intent conversation detection extracted; intent-keyword deduplication pending).
- [~] Customer churn/follower-growth detection moved to `crm` (stale-follower detection extracted; churn detection pending).
- [ ] Campaign/UGC/affiliate detection moved to `growth`.
- [ ] Brand-deal pipeline detection moved to `branddeals`.

### 3. Recommendation lifecycle is incomplete
- [ ] `Recommendation` has `validFrom`, `validUntil`, `invalidatedAt`, `invalidatedByEvent`.
- [ ] `expireStaleRecommendations` job implemented.
- [ ] Invalidation events defined (e.g. revenue recovered, product back in stock).

### 4. Recommendation ownership is wrong
- [ ] `Recommendation` records `producedByModule` and `producedByService`.
- [ ] `intelligence` no longer creates recommendations for other domains.

### 5. Business Brain is disconnected
- [ ] `getBusinessBrainContext` returns insights/predictions/recommendations/outcomes/learning.
- [ ] `askBusinessBrain` uses the new context instead of raw counts.

### 6. Intelligence duplicates logic
- [ ] `SUPPORT_KEYWORDS` / `INTENT_KEYWORDS` exist in one place.
- [ ] Product-mention detection exists in one place.
- [ ] Keyword vocabularies are versioned and owned by the right module.

### 7. Read models mixed with business entities
- [ ] `MetricSnapshot`, `BusinessInsight`, `Recommendation`, `Prediction`, `Outcome` treated as derived read models, not source-of-truth.
- [ ] Snapshots recomputed from canonical events/tables, not hand-edited.

### 8. Business Brain is stateless
- [ ] Conversation memory for Brain (previous questions, accepted/rejected advice, goals).
- [ ] Stored per workspace/user with retention rules.

### 9. No recommendation conflict resolution
- [ ] `resolveConflicts` implemented with policy and human-escalation fallback.
- [ ] Conflicts surfaced in UI with reason and runner-up.

### 10. Action execution knows too much
- [ ] `WorkspaceActionExecutor` removed or reduced to a dispatcher.
- [ ] Domain modules execute their own actions and publish outcomes.

### 11. Intelligence queries operational data directly
- [ ] Domains expose read-model query ports; `intelligence` stops loading `listOrders(500)` / `listProducts(100)` for scoring.
- [ ] Materialized/cached snapshots used for cross-domain ranking.

### 12. AI architecture is not unified
- [ ] Shared `AIContext` builder used by reply, Brain, captions, trends, competitor analysis.
- [ ] Prompt templates, memory, retrieval, confidence, and model routing centralized behind `ai` module contracts.

### 13. Application layer is enormous
- [ ] `intelligence/application` services refactored into smaller, focused services (scoring, lifecycle, conflict, learning).
- [ ] Domain logic pushed into domain layer where possible.

### 14. Domain model is anemic
- [ ] Core invariants (e.g. `Recommendation` cannot be executed after expiry) live in domain objects, not only application services.
- [ ] Decide and document whether the project uses rich DDD or transaction-script style.

### 15. Intelligence lifecycle is synchronous
- [ ] Prediction, learning, correlation, and trend jobs can run asynchronously (BullMQ/Redis) without blocking business operations.

---

## Security gaps (from review)

- [x] `Integration.accessToken` / `refreshToken` encrypted at rest.
- [ ] NextAuth `Account.access_token` / `refresh_token` encrypted or stored only as JWT (deferred to follow-up).
- [x] `Customer.consent` enforced in `generate-reply`.
- [x] AI prompt audit log without PII.
- [x] `/api/meta/webhook` rate limiting and replay idempotency.
- [x] `env.ts` rejects startup via `validateProductionSecrets()` + `instrumentation.ts`.
- [ ] Tenant isolation audit completed for all mutating server actions (deferred to follow-up).
- [ ] Dev-only simulators cannot be triggered in production (deferred to follow-up).

---

## Quality gates

- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run build` passes.
- [ ] `scripts/verify-task370.ts` end-to-end validation passes.
- [ ] `CHANGELOG.md` updated.
