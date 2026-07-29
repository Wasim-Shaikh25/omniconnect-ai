# TRACKER-0046: 0046 — Intelligence Domain Ownership Refactor

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0046-intelligence-domain-ownership.md`
- **Task:** `docs/tasks/TASK-0046-intelligence-domain-ownership.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0046.

## 2. Subtasks

### Planning
- [ ] Requirement approved and task created.

### Implementation / Verification
- [ ] `ecommerce`, `crm`, `conversations`, `growth`, `branddeals` each publish their own insight/recommendation events.
- [ ] `intelligence` no longer contains domain-specific detection rules for commerce/crm/conversations/growth/branddeals.
- [ ] `Recommendation` records include `producedByModule`, `validFrom`, `validUntil`, `invalidatedAt`.
- [ ] `intelligence` provides `prioritizeRecommendations`, `resolveConflicts`, and `expireStaleRecommendations`.
- [ ] `Business Brain` consumes `getBusinessBrainContext` and can explain top insight, top recommendation, and outcome history.
- [ ] `BrainConversationMemory` enforces retention via `expiresAt` and `purgeExpiredBrainMemory`.
- [ ] Recommendation conflicts are surfaced in UI via `getRecommendationConflictsAction` and a conflict card.
- [ ] Action plan execution dispatches through domain handlers (`executeEcommerceAction`, `executeConversationAction`, `executeGrowthAction`).
- [ ] Cross-domain read models (`MetricSnapshot`, `BusinessInsight`, `Recommendation`) are recomputed asynchronously from canonical signals via `ReadModelRefresher`.
- [ ] `Integration.accessToken` / `refreshToken` are encrypted at rest; connector decrypts at use time.
- [ ] NextAuth `Account.access_token` / `refresh_token` / `id_token` are encrypted at rest via `EncryptedPrismaAdapter`; reads decrypt transparently and remain backwards-compatible with legacy plaintext.
- [ ] `env.ts` rejects startup in production if any required secret is missing.
- [ ] `npm run lint`, `npm run typecheck`, `npm run build` pass.
- [ ] `CHANGELOG.md` and task tracker updated.

### Quality Gates
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] `CHANGELOG.md` updated.

## 3. Acceptance Criteria

- [ ] All linked requirement acceptance criteria are met.
- [ ] All quality gates pass.

## 4. Notes / Blockers

- Migrated from legacy spec `docs/specs/0046-intelligence-domain-ownership.md`.
