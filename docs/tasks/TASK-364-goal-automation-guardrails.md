# Task 364: Goal-based Automation Templates and Guardrails

- **Status:** Done
- **Spec:** `docs/specs/0040-goal-automation-guardrails.md`
- **Module(s):** `intelligence`, `growth`, `crm`
- **Owner:** wasim
- **Changelog entry:** Adds outcome-first automation templates and guardrails for goal-driven campaigns.

## Description

Implement the goal-based automation portion of `TASK-350` (subtasks 93–96) by providing reusable templates, a goal-plan generation flow, and guardrails that validate safety before execution.

## Subtasks (4)

- [x] 93. **Outcome-first automation templates:** increase repeat purchases, recover abandoned carts/conversations, improve response time, re-engage inactive customers, product launch, collect reviews, grow affiliates, improve brand-deal follow-up.
- [x] 94. **Goal-plan generation flow:** goal selection, data readiness, eligible audience, channels, consent, constraints, AI strategy, rationale, drafts, delays, stop conditions, reach/risk, approval, test run, launch, control/holdout, measurement.
- [x] 95. **Automation guardrails:** audience preview/count, consent/suppression validation, frequency/fatigue, conflict detection, max spend/discount exposure, stop conditions, test contacts, approval by risk tier, versioning/rollback, live run history, global kill switch, per-workflow pause.
- [~] 96. **AI-generated workflow acceptance criteria:** every node maps to supported action, clear goal/success event, explicit entry/exit, no duplicate enrollment, suppression at send time, estimated audience/volume, highlighted assumptions, editable workflow.

## Acceptance Criteria

- [x] `GoalAutomationService` exposes the eight outcome-first templates.
- [x] `createFromTemplate` produces a `Goal`, `Recommendation`, and `ActionPlan`.
- [x] `AutomationGuard` evaluates audience, consent, discount exposure, frequency, and stop conditions.
- [x] UI renders templates and guardrail feedback.
- [x] End-to-end script passes.
- [x] Lint + typecheck + build pass.
