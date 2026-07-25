# Task 366: AI Governance, Trust, and Workflow Acceptance

- **Status:** Done
- **Spec:** `docs/specs/0042-ai-governance-trust.md`
- **Module(s):** `intelligence`, `ai`
- **Owner:** wasim
- **Changelog entry:** Adds AI governance, trust controls, and workflow acceptance criteria.

## Description

Implement AI behavior, governance, and trust controls from `TASK-350` (subtasks 96–101) plus workflow acceptance criteria for goal-based automations.

## Subtasks (6)

- [x] 96. **AI-generated workflow acceptance criteria:** every node maps to supported action, clear goal/success event, explicit entry/exit, no duplicate enrollment, suppression at send time, estimated audience/volume, highlighted assumptions, editable workflow.
- [x] 97. **AI response contract:** direct conclusion, evidence/period, likely drivers, confidence/uncertainty, missing/stale data, recommended action, expected result range, preview/execute link.
- [x] 98. **Allowlisted tool use:** schema validation, idempotency keys, and audit events.
- [x] 99. **Risk tier enforcement (Tier 0–4)** across UI and API.
- [x] 100. **Grounding/prompt-injection resistance:** retrieved data cannot override policies, tool permissions independent of model text, server-generated evidence refs, PII redaction in logs.
- [x] 101. **Trust language:** “likely contributed,” “associated with,” or “consistent with” for observational; “caused” only with causal/experimental backing; estimated impact as a range with assumptions.

## Acceptance Criteria

- [x] `AiGovernanceService` returns a structured response contract.
- [x] Tool calls validate against allowlist and role permissions.
- [x] Risk tier enforcement returns `allowed`/`requiresApproval`/`reason`.
- [x] Trust-language rewrite converts unsupported causal claims into guarded phrasing.
- [x] Prompt-injection / PII redaction basics in place.
- [x] Workflow acceptance criteria report generated for goal automations.
- [x] UI surfaces risk tier and acceptance report.
- [x] End-to-end script passes.
- [x] Lint + typecheck + build pass.
