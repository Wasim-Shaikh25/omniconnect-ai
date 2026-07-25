# 0046 — Intelligence Domain Ownership Refactor

- **Module(s):** `intelligence`, `ecommerce`, `crm`, `conversations`, `growth`, `branddeals`, `ai`, `auth`
- **Status:** Draft
- **Owner:** wasim
- **Related task(s):** `docs/tasks/TASK-370-intelligence-domain-ownership.md`
- **Last updated:** 2026-07-25

## 1. Summary

Stop `intelligence` from becoming a decision monolith. Move domain-specific detection, diagnosis, and recommendation generation into the modules that own the data (`ecommerce`, `crm`, `conversations`, `growth`, `branddeals`). Reframe `intelligence` as a cross-domain prioritizer, scorer, conflict resolver, and learner. Connect `Business Brain` to `intelligence` outputs instead of raw workspace counts. Harden security before the refactor (token encryption, AI data governance, production env validation).

## 2. Goals

- Each domain publishes its own `*InsightGenerated` and `*RecommendationGenerated` events.
- `intelligence` consumes these, ranks/prioritizes, resolves conflicts, tracks lifecycle, and updates learning.
- `Recommendation` records state who produced them and when they expire/invalidated.
- `Business Brain` answers from insights, predictions, recommendations, and outcomes.
- Third-party tokens are encrypted at rest; AI data flows are governed and auditable.

## 3. Non-Goals

- Replacing Prisma/Postgres with a dedicated read model or event store.
- Real-time async pipeline overhaul (this spec keeps the existing synchronous shape; async refactor is separate).
- Multi-tenant SaaS admin dashboard or full observability integration.

## 4. User Stories

- As a store owner, I see recommendations that are clearly owned by Commerce, CRM, or Growth so I trust the source.
- As a system, when two modules recommend opposite actions, Intelligence resolves the conflict with policy and business goals.
- As a user, Business Brain explains why a recommendation was made and what happened last time I accepted a similar one.

## 5. Domain Model

- New per-module domain events:
  - `CommerceInsightGenerated`, `CommerceRecommendationGenerated`
  - `CrmInsightGenerated`, `CrmRecommendationGenerated`
  - `ConversationInsightGenerated`, `ConversationRecommendationGenerated`
  - `GrowthInsightGenerated`, `GrowthRecommendationGenerated`
  - `BrandDealInsightGenerated`, `BrandDealRecommendationGenerated`
- Intelligence domain events:
  - `SignalIngested`
  - `RecommendationGenerated` (cross-domain ranked/prioritized)
  - `RecommendationExpired`
  - `RecommendationConflictDetected`
  - `BusinessBrainContextUpdated`
- New value objects:
  - `RecommendationProducer = { module, service, version }`
  - `RecommendationLifecycle = { validFrom, validUntil, invalidatedAt, invalidatedByEvents }`
  - `ConflictResolution = { winnerId, reason, appliedPolicy, runnerUpId? }`

## 6. Public Contract

- `ecommerce` exposes `detectCommerceInsights(...)` and publishes `CommerceInsightGenerated` / `CommerceRecommendationGenerated`.
- `crm` exposes `detectCrmInsights(...)` and publishes `CrmInsightGenerated` / `CrmRecommendationGenerated`.
- `conversations` exposes `detectConversationInsights(...)` and publishes `ConversationInsightGenerated` / `ConversationRecommendationGenerated`.
- `growth` exposes `detectGrowthInsights(...)` and publishes `GrowthInsightGenerated` / `GrowthRecommendationGenerated`.
- `branddeals` exposes `detectBrandDealInsights(...)` and publishes `BrandDealInsightGenerated` / `BrandDealRecommendationGenerated`.
- `intelligence` exposes:
  - `prioritizeRecommendations(organizationId, storeId?, limit?)`
  - `resolveConflicts(recommendations[])`
  - `expireStaleRecommendations()`
  - `getBusinessBrainContext(organizationId, storeId?)`
- No module may import another module's internals; only public barrels and domain-event payload types.

## 7. Data / Persistence

- Add to the `Recommendation` Prisma model:
  - `producedByModule String`
  - `producedByService String?`
  - `validFrom DateTime @default(now())`
  - `validUntil DateTime?`
  - `invalidatedAt DateTime?`
  - `invalidatedByEvent String?`
- Add `expiresAt DateTime` to `BrainConversationMemory` and a daily `purgeExpiredBrainMemory` routine to enforce retention.
- Add `RecommendationConflict` audit table (or reuse `AuditLog` with `entityType = "RECOMMENDATION_CONFLICT"`) storing winner, runner-up, policy, and resolution time.
- Materialize cross-domain read models: `MetricSnapshot`, `BusinessInsight`, `Recommendation`, `Prediction`, `Outcome` are derived from canonical events/tables; update them in async background jobs rather than synchronous scans.
- Event-driven action dispatch: `ActionPlan.execute` publishes `CouponActionRequested`, `ConversationTakeOverRequested`, `DmCampaignActionRequested`, and `AlternativeProductCampaignActionRequested` domain events; target modules subscribe, execute, and publish `ActionExecuted` / `ActionFailed` outcomes back to intelligence.
- Encrypt `Integration.accessToken` and `refreshToken` at rest using a module-local encryption adapter.
- Add `Customer.consentForAiProcessing Boolean?` and an `AiPromptAudit` table, or extend `AuditLog` to record prompt metadata without PII.
- Update `shared/config/env.ts` so production startup fails if required secrets (`OPENAI_API_KEY`, `NEXTAUTH_SECRET`, `META_APP_SECRET`, `SHOPIFY_API_SECRET`, etc.) are missing.

## 8. API / UI Surface

- Existing server actions (`getRecommendationsAction`, `executeActionPlanAction`) keep similar signatures but now consume ranked cross-domain recommendations.
- Add `dismissRecommendationAction`, `snoozeRecommendationAction`, and `resolveRecommendationConflictAction` (admin).
- Add `getRecommendationConflictsAction` to surface active conflicts with winner, runner-up, and policy reason.
- Add a read-only conflict card on Daily Marketing / Engagement / Growth / Revenue workflow pages showing the latest unresolved conflict.
- Business Brain prompt builder uses `getBusinessBrainContext` instead of raw workspace counts.
- No new public routes are required for the MVP; conflict details can be shown in existing workflow pages.

## 9. External Integrations

- No new third-party integrations. Continue using public module contracts and the shared event bus.

## 10. Edge Cases & Failure Modes

- No domain produces a recommendation: Intelligence returns an empty ranked list.
- Two domains produce conflicting recommendations: apply policy (business priority, risk tier, goal alignment, human approval). If unresolved, surface both with a conflict flag.
- Underlying signal recovers (revenue recovers, product back in stock): the lifecycle job invalidates stale recommendations.
- Token decryption fails: fail closed (do not call the provider), log an audit event, and surface a notification for the workspace owner.

## 11. Security & Privacy

- Encrypt `Integration.accessToken` and `refreshToken` at rest. Decrypt only inside the connector/API client. Keys managed via env/KMS.
- Encrypt or avoid persisting NextAuth `Account.access_token` / `refresh_token` at rest. If using the Prisma adapter with database sessions, add an encryption adapter or switch to JWT-only sessions.
- `generate-reply` must check `Customer.consentForAiProcessing` before sending conversation history + profile to OpenAI. Log prompt metadata without PII.
- Add rate limiting and replay idempotency to `/api/meta/webhook`.
- `env.ts` production schema validates required secrets; fail startup if any are missing.

## 12. Testing Strategy

- **Unit:** per-domain insight/recommendation mappers, intelligence prioritization/scoring, conflict resolution, lifecycle invalidation, token encryption roundtrip.
- **Integration:** event-driven flow from domain event → intelligence ranking → business brain context.
- **E2E:** simulate revenue decline + high-intent conversation, verify conflict resolution and business brain answer.

## 13. Acceptance Criteria

- [x] `ecommerce`, `crm`, `conversations`, `growth`, `branddeals` each publish their own insight/recommendation events.
- [x] `intelligence` no longer contains domain-specific detection rules for commerce/crm/conversations/growth/branddeals.
- [x] `Recommendation` records include `producedByModule`, `validFrom`, `validUntil`, `invalidatedAt`.
- [x] `intelligence` provides `prioritizeRecommendations`, `resolveConflicts`, and `expireStaleRecommendations`.
- [x] `Business Brain` consumes `getBusinessBrainContext` and can explain top insight, top recommendation, and outcome history.
- [x] `BrainConversationMemory` enforces retention via `expiresAt` and `purgeExpiredBrainMemory`.
- [x] Recommendation conflicts are surfaced in UI via `getRecommendationConflictsAction` and a conflict card.
- [x] Action plan execution dispatches through domain handlers (`executeEcommerceAction`, `executeConversationAction`, `executeGrowthAction`).
- [x] Cross-domain read models (`MetricSnapshot`, `BusinessInsight`, `Recommendation`) are recomputed asynchronously from canonical signals via `ReadModelRefresher`.
- [x] `Integration.accessToken` / `refreshToken` are encrypted at rest; connector decrypts at use time.
- [x] `env.ts` rejects startup in production if any required secret is missing.
- [x] `npm run lint`, `npm run typecheck`, `npm run build` pass.
- [x] `CHANGELOG.md` and task tracker updated.

## 14. Open Questions

- Should per-module insight/recommendation events reuse the existing `BusinessInsight` / `Recommendation` tables, or should each producer have its own table?
- Should conflict resolution be rule-driven, LLM-driven, or both?
- Which KMS/encryption strategy is acceptable? (e.g. AWS KMS, HashiCorp Vault, libsodium with an env master key)
- Do we need a separate `AiPromptAudit` table, or is extending `AuditLog` sufficient?
