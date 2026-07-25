# TASK-370: Intelligence Domain Ownership Refactor — Live Progress Tracker

Tracks the architecture-review findings and the security gaps. Status legend:

- `[x]` Done — implemented and verified.
- `[~]` Partial — scaffolded or partly done; needs more work.
- `[ ]` Not started.

---

## Architecture gaps (from review)

### 1. Intelligence is not an orchestrator anymore
- [x] Domain modules publish their own `*InsightGenerated` / `*RecommendationGenerated` events (ecommerce, CRM, conversations, growth, branddeals).
- [x] `intelligence` stops owning commerce/crm/conversation/growth/brand-deal detection rules (all primary modules now have `detect*Insights`).
- [x] `intelligence` becomes a prioritizer/scorer/conflict resolver via `recommendationLifecycleService`.

### 2. Domain knowledge is leaking
- [~] Product availability/demand detection remains a cross-domain correlation in `intelligence` (order/revenue detection extracted to `ecommerce`; product-mention signals owned by `conversations` and centralized via `intelligence/application/vocabulary.ts`).
- [x] Conversation intent/support detection moved to `conversations` (high-intent conversation detection extracted).
- [x] Customer churn/follower-growth detection moved to `crm` (stale-follower detection extracted).
- [x] Campaign/UGC/affiliate detection moved to `growth` (DM campaign staleness and UGC presence extracted).
- [x] Brand-deal pipeline detection moved to `branddeals` (stuck-negotiation detection extracted).

### 3. Recommendation lifecycle is incomplete
- [x] `Recommendation` has `producedByModule`, `producedByService`, `validFrom`, `validUntil`, `invalidatedAt`, `invalidatedByEvent`.
- [x] `prioritizeRecommendations` scoring implemented.
- [x] `resolveConflicts` for conflicting cross-domain recommendations implemented.
- [x] `expireStaleRecommendations` job implemented.
- [x] `expireStaleRecommendations` invalidates expired recommendations; invalidation events raised via `RecommendationExpired`.

### 4. Recommendation ownership is wrong
- [x] `Recommendation` records `producedByModule` and `producedByService`.
- [x] `intelligence` no longer creates recommendations for other domains; each domain's `detect*Insights` emits `*RecommendationGenerated` and `intelligence` maps them.

### 5. Business Brain is disconnected
- [x] `getBusinessBrainContext` returns insights/predictions/recommendations/outcomes/learning.
- [x] `askBusinessBrain` uses the new context instead of raw counts.
- [x] Business Brain conversation memory (`BrainConversationMemory`) added to `askBusinessBrain` prompts.

### 6. Intelligence duplicates logic
- [x] `SUPPORT_KEYWORDS` / `INTENT_KEYWORDS` centralized in `intelligence/application/vocabulary.ts`.
- [x] Product-mention detection centralized in `intelligence/application/vocabulary.ts` (`detectProductMentions`).
- [~] Keyword vocabularies centralized in `intelligence/application/vocabulary.ts`; long-term per-module ownership can be split when vocabularies diverge.

### 7. Read models mixed with business entities
- [x] `ReadModelRefresher` orchestrates recomputation of `MetricSnapshot`, `BusinessInsight`, `Recommendation` from canonical signals via `refreshReadModelsAction`.
- [~] `Prediction` and `Outcome` are updated by existing prediction/outcome services; async scheduler not yet implemented.

### 8. Business Brain is stateless
- [x] Conversation memory for Brain (`BrainConversationMemory`) persists previous questions, answers, accepted/rejected advice, and goals.
- [x] `BrainConversationMemory` has `expiresAt`; `brainMemoryService.purgeExpired` and `PrismaBrainMemoryRepository.purgeExpiredBefore` enforce retention.

### 9. No recommendation conflict resolution
- [x] `resolveConflicts` implemented with `single_discount_per_run` policy and `RecommendationConflictDetected` event.
- [x] `RecommendationConflict` table, `getRecommendationConflictsAction`, and `RecommendationConflictCard` on Daily Marketing surface conflicts.

### 10. Action execution knows too much
- [x] `WorkspaceActionExecutor` reduced to an `execute` dispatcher; approval/risk gating moved to `decision-policy.ts`.
- [x] Domain modules expose `executeEcommerceAction`, `executeConversationAction`, `executeGrowthAction`; `WorkspaceActionExecutor` is a dispatcher mapping action types to domain handlers.

### 11. Intelligence queries operational data directly
- [~] `ReadModelRefresher` recomputes read models from canonical signals; full replacement of operational scans requires dedicated read-model tables/caching in a future iteration.

### 12. AI architecture is not unified
- [x] Shared `AIContext` builder (`AIContextBuilder`) and `selectModel` router used by reply, Brain, captions, trends, competitor analysis, and welcome message.
- [~] Prompt templates, memory, retrieval, confidence, and model routing centralized behind `ai` module contracts; retrieval/confidence scaffolding can be added later.

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
- [x] NextAuth `Account.access_token` / `refresh_token` encrypted at rest via `EncryptedPrismaAdapter` (wraps `@auth/prisma-adapter` and encrypts/decrypts `access_token`, `refresh_token`, `id_token` on `linkAccount` and `getAccount`).
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
- [x] `scripts/verify-task370.ts` end-to-end validation script created and typechecks; runtime requires PostgreSQL.
- [x] `CHANGELOG.md` updated.
