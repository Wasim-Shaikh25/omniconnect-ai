---
description: 0040 — Goal-based Automation Templates and Guardrails
---

# REQ-0040: 0040 — Goal-based Automation Templates and Guardrails

- **Status:** Implemented
- **Owner:** wasim
- **Module(s):** `intelligence`, `growth`, `crm`
- **Original spec path:** `docs/specs/0040-goal-automation-guardrails.md` (restructured)
- **Task:** `docs/tasks/TASK-0040-goal-automation-guardrails.md`
- **Tracker:** `docs/trackers/TRACKER-0040-goal-automation-guardrails.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0040-goal-automation-guardrails.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** `intelligence`, `growth`, `crm`
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/TASK-364-goal-automation-guardrails.md`
- **Last updated:** 2026-07-25

## 1. Summary

Add outcome-first automation templates and guardrails so users can create a goal-driven automation (e.g., "recover abandoned carts", "collect reviews") in one flow. The system drafts a `Goal`, a `Recommendation`, and an `ActionPlan`, then validates the plan against audience, consent, frequency, spend, and stop-condition guardrails before execution.

## 2. Goals

- Provide eight reusable goal-based automation templates.
- Generate a `Goal` and `ActionPlan` from a template with user-editable target and end date.
- Validate every automation with guardrails: max audience size, consent check, discount/spend exposure, frequency/fatigue, and stop conditions.
- Surface templates and guardrail results in the Automations hub.

## 3. Non-Goals

- Visual workflow builder / drag-and-drop node editor (deferred).
- Multi-channel budget allocation.

## 4. User Stories

- As a marketer, I want to pick "re-engage inactive customers" and set a target so the system drafts the campaign and tells me if it is safe to run.
- As a store owner, I want guardrails to block automations that exceed my discount exposure or hit unsubscribed customers.

## 5. Domain Model

```ts
export interface AutomationTemplate {
  id: string;
  name: string;
  objective: string;
  targetMetric: string;
  defaultTarget: number;
  defaultChannel: string;
  actionType: string;
  stopConditions: string[];
  guardrails: {
    maxAudience: number;
    maxDiscountPct: number;
    requireConsent: boolean;
    minDaysBetweenTouches: number;
  };
}

export interface GoalAutomationPlanResult {
  goal: GoalRecord;
  recommendation: RecommendationRecord;
  actionPlan: ActionPlanRecord;
  guard: AutomationGuardResult;
}

export interface AutomationGuardResult {
  allowed: boolean;
  approvalRequired: boolean;
  violations: string[];
}
```

## 6. Public Contract

- `GoalAutomationService.listTemplates()`
- `GoalAutomationService.createFromTemplate(input: { organizationId, storeId, templateId, target, endDate, ownerUserId })`
- `AutomationGuard.evaluate(organizationId, storeId, actionType, params, audienceEstimate, workspacePolicy)`
- Server actions: `getAutomationTemplatesAction`, `createGoalAutomationAction`
- UI: `/stores/[storeId]/automations/goals` page and card on `/stores/[storeId]/automations`

## 7. Data / Persistence

- Reuses existing `Goal`, `Recommendation`, `ActionPlan` repositories.
- No new Prisma models.

## 8. API / UI Surface

- `/stores/[storeId]/automations/goals` lists templates and a creation form.
- `/stores/[storeId]/automations` shows a "Goal-based automations" card linking to the page.

## 9. External Integrations

- None new; uses existing `growth` DM campaign and `ecommerce` coupon execution paths.

## 10. Edge Cases & Failure Modes

- Unknown template ID: throw `Error("Template not found")`.
- Guardrail violation: still create the draft `Goal`/`ActionPlan` but mark guard `allowed: false` so UI shows why.
- Missing audience estimate: use `0` and flag `needs review`.

## 11. Security & Privacy

- Server actions verify store membership.
- Guardrails enforce consent and audience limits.
- No PII in template metadata.

## 12. Testing Strategy

- End-to-end script `scripts/verify-task364.ts` lists templates, creates a plan, and asserts guardrail results.

## 13. Acceptance Criteria

- [x] `GoalAutomationService` exposes the eight outcome-first templates.
- [x] `createFromTemplate` produces a `Goal`, `Recommendation`, and `ActionPlan`.
- [x] `AutomationGuard` evaluates audience, consent, discount exposure, frequency, and stop conditions.
- [x] UI renders templates and guardrail feedback.
- [x] End-to-end script passes.
- [x] Lint + typecheck + build pass.
