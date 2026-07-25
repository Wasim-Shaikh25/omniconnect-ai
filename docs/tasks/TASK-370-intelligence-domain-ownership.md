# TASK-370: Intelligence Domain Ownership Refactor

- **Status:** In Progress
- **Spec:** `docs/specs/0046-intelligence-domain-ownership.md`
- **Module(s):** `intelligence`, `ecommerce`, `crm`, `conversations`, `growth`, `branddeals`, `ai`, `auth`
- **Owner:** wasim
- **Changelog entry:** `TASK-370 — Refactored intelligence into a cross-domain prioritizer; moved detection/recommendation ownership to domain modules; added recommendation lifecycle, conflict resolution, Business Brain integration, and security hardening.`

## Description

See `docs/specs/0046-intelligence-domain-ownership.md`. This is the architecture consolidation task that addresses the 15 architecture-review gaps, plus the security issues found during the review. Do not write code until the spec is approved and this task is moved to **In Progress**.

## Subtasks

### Phase 0 — Security hardening (do first)
- [x] 1. Encrypt `Integration.accessToken` and `refreshToken` at rest (`src/shared/security/encryption.ts`, ecommerce + meta integration repositories).
- [ ] 2. Encrypt or avoid persisting NextAuth `Account.access_token` / `refresh_token` at rest. (Deferred: requires a custom NextAuth adapter wrapper; track in a follow-up security task.)
- [x] 3. Enforce `Customer.consent` in `generate-reply` (declined consent excludes profile from the AI prompt).
- [x] 4. Log AI prompt metadata without PII via existing `AuditLog`.
- [x] 5. Add rate limiting and replay idempotency to `/api/meta/webhook` (`src/modules/meta/infrastructure/webhook-guard.ts`).
- [x] 6. Make required production secrets non-optional via `validateProductionSecrets()` + `src/instrumentation.ts`.

### Phase 1 — Move detection/recommendation into owning domains
- [x] 7. `ecommerce`: create `detectCommerceInsights` + publish `CommerceInsightGenerated` / `CommerceRecommendationGenerated`.
- [x] 8. `crm`: create `detectCrmInsights` + publish `CrmInsightGenerated` / `CrmRecommendationGenerated` (stale-follower detection extracted).
- [x] 9. `conversations`: create `detectConversationInsights` + publish `ConversationInsightGenerated` / `ConversationRecommendationGenerated` (high-intent conversation detection extracted).
- [ ] 10. `growth`: create `detectGrowthInsights` + publish `GrowthInsightGenerated` / `GrowthRecommendationGenerated`.
- [ ] 11. `branddeals`: create `detectBrandDealInsights` + publish `BrandDealInsightGenerated` / `BrandDealRecommendationGenerated`.
- [~] 12. Remove domain-specific detection rules from `intelligence/application/detection.ts` (commerce, CRM, and conversation rules removed; product availability/demand and stale metrics remain).
- [ ] 13. Deduplicate `SUPPORT_KEYWORDS`, `INTENT_KEYWORDS`, and product-mention logic into shared vocabularies owned by the right modules.

### Phase 2 — Reframe intelligence as a cross-domain prioritizer
- [ ] 14. Add `producedByModule`, `producedByService`, `validFrom`, `validUntil`, `invalidatedAt`, and `invalidatedByEvent` to `Recommendation`.
- [ ] 15. Implement `intelligence.prioritizeRecommendations` scoring.
- [ ] 16. Implement `intelligence.resolveConflicts` for conflicting cross-domain recommendations.
- [ ] 17. Implement `intelligence.expireStaleRecommendations` lifecycle job.
- [ ] 18. Shrink or remove `WorkspaceActionExecutor`; dispatch execution to domain commands through public barrels.

### Phase 3 — Business Brain consumes Intelligence
- [ ] 19. Create `intelligence.getBusinessBrainContext` (insights, predictions, recommendations, outcomes, learning).
- [ ] 20. Update `askBusinessBrain` and `workspace-context` to use the new context.
- [ ] 21. Add conversation memory to Business Brain (previous questions, accepted/rejected advice, goals).

### Phase 4 — Cleanup and verification
- [ ] 22. Update `intelligence/index.ts` public barrel and remove deprecated exports.
- [ ] 23. Write `scripts/verify-task370.ts` end-to-end validation script.
- [ ] 24. Run `npm run lint`, `npm run typecheck`, `npm run build`.
- [ ] 25. Update `docs/tasks/TASK-370-progress.md` and `CHANGELOG.md`.

## Acceptance Criteria

- [ ] Matches the linked spec's acceptance criteria.
- [ ] Lint + typecheck + build pass.
- [ ] `CHANGELOG.md` updated.
