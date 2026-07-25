# 0042 — AI Governance, Trust, and Workflow Acceptance

- **Module(s):** `intelligence`, `ai`
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/TASK-366-ai-governance-trust.md`
- **Last updated:** 2026-07-25

## 1. Summary

Add AI governance and trust controls so every AI-generated output follows a structured response contract, uses cautious causal language, respects an allowlisted tool-permission model, enforces Tier 0–4 risk levels, and resists prompt-injection attempts. Also add workflow acceptance criteria for AI-generated automation templates.

## 2. Goals

- AI response contract: conclusion, evidence/period, likely drivers, confidence/uncertainty, missing/stale data, recommended action, expected result range, preview/execute link.
- Allowlisted tool use with schema validation, idempotency keys, and audit events.
- Risk tier enforcement (Tier 0–4) across UI and API.
- Grounding/prompt-injection resistance: retrieved data cannot override policies, tool permissions independent of model text, server-generated evidence refs, PII redaction in logs.
- Trust language: observational phrasing unless causal/experimental backing exists.
- Workflow acceptance criteria for goal-automation templates.

## 3. Non-Goals

- Fine-tuned LLM alignment training.
- Real-time content moderation classifier.

## 4. User Stories

- As an operator, I want AI outputs to show confidence, evidence, and a safe next action so I can decide.
- As a developer, I want tool calls validated against an allowlist and idempotency keys before execution.
- As a store owner, I want risky automations blocked until an authorized role approves them.

## 5. Domain Model

```ts
export interface AiResponse {
  conclusion: string;
  evidencePeriod: string;
  likelyDrivers: string[];
  confidence: string;
  uncertainty: string;
  missingData: string[];
  recommendedAction: string;
  expectedResultRange: string;
  previewLink: string | null;
}

export interface ToolCall {
  tool: string;
  params: unknown;
  idempotencyKey: string;
}

export interface RiskTierResult {
  tier: RiskTier;
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
}

export interface WorkflowAcceptanceReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedAudience: number | null;
  assumptions: string[];
}
```

## 6. Public Contract

- `AiGovernanceService.formatResponse(input)`
- `AiGovernanceService.validateToolCall(toolCall, userRole)`
- `AiGovernanceService.applyTrustLanguage(text)`
- `AiGovernanceService.enforceRiskTier(actionType, audienceSize, discountPct, userRole)`
- `GoalAutomationService.validateWorkflow(template)`
- Server actions: `formatAiResponseAction`, `validateToolCallAction`, `validateWorkflowAction`
- UI: risk-tier badge on recommendations/action plans, trust-language preview, workflow acceptance panel on `/automations/goals`

## 7. Data / Persistence

- No new Prisma models.
- Allowlist and risk rules live in pure domain code (configurable later).

## 8. API / UI Surface

- `/business-brain` uses `AiGovernanceService` to format the final answer.
- Recommendation and action-plan cards display a `RiskTierBadge`.
- `/stores/[storeId]/automations/goals` displays workflow acceptance report.

## 9. External Integrations

- None.

## 10. Edge Cases & Failure Modes

- Unknown tool: reject.
- Missing user role: treat as no privileges.
- Prompt-injection keywords in input: reject or redact.

## 11. Security & Privacy

- Tool calls require explicit allowlist match and role check.
- PII patterns redacted from returned text.
- Risk tier cannot be downgraded by model text.

## 12. Testing Strategy

- End-to-end script `scripts/verify-task366.ts` validates tool allowlisting, trust-language rewriting, risk-tier enforcement, and workflow acceptance.

## 13. Acceptance Criteria

- [x] `AiGovernanceService` returns a structured response contract.
- [x] Tool calls validate against allowlist and role permissions.
- [x] Risk tier enforcement returns `allowed`/`requiresApproval`/`reason`.
- [x] Trust-language rewrite converts unsupported causal claims into guarded phrasing.
- [x] Prompt-injection / PII redaction basics in place.
- [x] Workflow acceptance criteria report generated for goal automations.
- [x] UI surfaces risk tier and acceptance report.
- [x] End-to-end script passes.
- [x] Lint + typecheck + build pass.
