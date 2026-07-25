# TASK-370: Intelligence Domain Ownership Refactor

- **Status:** Todo
- **Spec:** `docs/specs/0046-intelligence-domain-ownership.md`
- **Module(s):** `intelligence`, `ecommerce`, `crm`, `conversations`, `growth`, `branddeals`, `ai`, `auth`
- **Owner:** wasim
- **Changelog entry:** `TASK-370 — Refactored intelligence into a cross-domain prioritizer; moved detection/recommendation ownership to domain modules; added recommendation lifecycle, conflict resolution, Business Brain integration, and security hardening.`

## Description

See `docs/specs/0046-intelligence-domain-ownership.md`. This is the architecture consolidation task that addresses the 15 architecture-review gaps, plus the security issues found during the review. Do not write code until the spec is approved and this task is moved to **In Progress**.

## Subtasks

### Phase 0 — Security hardening (do first)
- [ ] 1. Encrypt `Integration.accessToken` and `refreshToken` at rest.
- [ ] 2. Encrypt or avoid persisting NextAuth `Account.access_token` / `refresh_token` at rest.
- [ ] 3. Add `Customer.consentForAiProcessing` and enforce it in `generate-reply`.
- [ ] 4. Log AI prompt metadata without PII (new `AiPromptAudit` table or extend `AuditLog`).
- [ ] 5. Add rate limiting and replay idempotency to `/api/meta/webhook`.
- [ ] 6. Make required production secrets non-optional in `env.ts`.

### Phase 1 — Move detection/recommendation into owning domains
- [ ] 7. `ecommerce`: create `detectCommerceInsights` + publish `CommerceInsightGenerated` / `CommerceRecommendationGenerated`.
- [ ] 8. `crm`: create `detectCrmInsights` + publish `CrmInsightGenerated` / `CrmRecommendationGenerated`.
- [ ] 9. `conversations`: create `detectConversationInsights` + publish `ConversationInsightGenerated` / `ConversationRecommendationGenerated`.
- [ ] 10. `growth`: create `detectGrowthInsights` + publish `GrowthInsightGenerated` / `GrowthRecommendationGenerated`.
- [ ] 11. `branddeals`: create `detectBrandDealInsights` + publish `BrandDealInsightGenerated` / `BrandDealRecommendationGenerated`.
- [ ] 12. Remove domain-specific detection rules from `intelligence/application/detection.ts`.
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
