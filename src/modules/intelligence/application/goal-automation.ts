import type { GoalService } from "./goal";
import type { RecommendationRepository, ActionPlanRepository, GoalRepository } from "./ports";
import type { GoalRecord, RecommendationRecord, ActionPlanRecord, RiskTier } from "../domain/types";
import { inferBusinessObjective } from "../domain/objective";

export interface AutomationTemplate {
  id: string;
  name: string;
  objective: string;
  targetMetric: string;
  defaultTarget: number;
  defaultChannel: string;
  actionType: string;
  reasonCodes: string[];
  stopConditions: string[];
  guardrails: {
    maxAudience: number;
    maxDiscountPct: number;
    requireConsent: boolean;
    minDaysBetweenTouches: number;
    maxActionsPerDay: number;
  };
  riskTier: RiskTier;
}

const TEMPLATES: AutomationTemplate[] = [
  {
    id: "repeat-purchase",
    name: "Increase repeat purchases",
    objective: "Drive a second purchase from one-time buyers within 30 days.",
    targetMetric: "order_count",
    defaultTarget: 10,
    defaultChannel: "DM",
    actionType: "CREATE_DM_CAMPAIGN",
    reasonCodes: ["repeat-purchase-growth"],
    stopConditions: ["purchase-converted", "30-days-elapsed", "consent-withdrawn"],
    guardrails: { maxAudience: 500, maxDiscountPct: 15, requireConsent: true, minDaysBetweenTouches: 3, maxActionsPerDay: 1 },
    riskTier: "TIER_2",
  },
  {
    id: "abandoned-cart",
    name: "Recover abandoned carts/conversations",
    objective: "Re-engage high-intent customers who did not complete checkout.",
    targetMetric: "conversation_count",
    defaultTarget: 20,
    defaultChannel: "DM",
    actionType: "CREATE_DM_CAMPAIGN",
    reasonCodes: ["abandoned-checkout"],
    stopConditions: ["order-completed", "48-hours-elapsed", "consent-withdrawn"],
    guardrails: { maxAudience: 1000, maxDiscountPct: 10, requireConsent: true, minDaysBetweenTouches: 1, maxActionsPerDay: 1 },
    riskTier: "TIER_2",
  },
  {
    id: "response-time",
    name: "Improve response time",
    objective: "Reduce average first-response time to under 5 minutes.",
    targetMetric: "conversation_count",
    defaultTarget: 5,
    defaultChannel: "AI",
    actionType: "TAKE_OVER_CONVERSATION",
    reasonCodes: ["response-time-sla"],
    stopConditions: ["avg-response-time-below-5min"],
    guardrails: { maxAudience: 0, maxDiscountPct: 0, requireConsent: false, minDaysBetweenTouches: 0, maxActionsPerDay: 0 },
    riskTier: "TIER_1",
  },
  {
    id: "re-engage-inactive",
    name: "Re-engage inactive customers",
    objective: "Reactivate customers with no purchase in the last 90 days.",
    targetMetric: "follower_count",
    defaultTarget: 50,
    defaultChannel: "DM",
    actionType: "CREATE_DM_CAMPAIGN",
    reasonCodes: ["customer-inactivity"],
    stopConditions: ["purchase-or-engagement", "30-days-elapsed", "consent-withdrawn"],
    guardrails: { maxAudience: 1000, maxDiscountPct: 20, requireConsent: true, minDaysBetweenTouches: 7, maxActionsPerDay: 1 },
    riskTier: "TIER_2",
  },
  {
    id: "product-launch",
    name: "Product launch",
    objective: "Generate awareness and first sales for a new product.",
    targetMetric: "order_count",
    defaultTarget: 15,
    defaultChannel: "DM",
    actionType: "CREATE_DM_CAMPAIGN",
    reasonCodes: ["new-product-launch"],
    stopConditions: ["launch-period-ended", "stock-depleted"],
    guardrails: { maxAudience: 2000, maxDiscountPct: 25, requireConsent: true, minDaysBetweenTouches: 2, maxActionsPerDay: 2 },
    riskTier: "TIER_3",
  },
  {
    id: "collect-reviews",
    name: "Collect reviews",
    objective: "Request reviews from recent purchasers.",
    targetMetric: "conversation_count",
    defaultTarget: 30,
    defaultChannel: "DM",
    actionType: "CREATE_DM_CAMPAIGN",
    reasonCodes: ["social-proof"],
    stopConditions: ["review-received", "7-days-elapsed"],
    guardrails: { maxAudience: 500, maxDiscountPct: 0, requireConsent: true, minDaysBetweenTouches: 7, maxActionsPerDay: 1 },
    riskTier: "TIER_1",
  },
  {
    id: "grow-affiliates",
    name: "Grow affiliates",
    objective: "Invite high-engagement customers to the ambassador program.",
    targetMetric: "follower_count",
    defaultTarget: 10,
    defaultChannel: "DM",
    actionType: "CREATE_DM_CAMPAIGN",
    reasonCodes: ["advocate-growth"],
    stopConditions: ["ambassador-enrolled", "14-days-elapsed"],
    guardrails: { maxAudience: 200, maxDiscountPct: 0, requireConsent: true, minDaysBetweenTouches: 14, maxActionsPerDay: 1 },
    riskTier: "TIER_2",
  },
  {
    id: "brand-deal-follow-up",
    name: "Improve brand-deal follow-up",
    objective: "Follow up on negotiating brand deals before they go stale.",
    targetMetric: "conversation_count",
    defaultTarget: 5,
    defaultChannel: "EMAIL",
    actionType: "TAKE_OVER_CONVERSATION",
    reasonCodes: ["deal-stuck"],
    stopConditions: ["deal-status-changed", "7-days-elapsed"],
    guardrails: { maxAudience: 50, maxDiscountPct: 0, requireConsent: true, minDaysBetweenTouches: 7, maxActionsPerDay: 1 },
    riskTier: "TIER_2",
  },
];

export interface AutomationGuardInput {
  audienceEstimate: number;
  discountPct: number;
  consentConfirmed: boolean;
  daysSinceLastTouch: number;
  actionsPerDay: number;
  policy: AutomationTemplate["guardrails"];
}

export interface AutomationGuardResult {
  allowed: boolean;
  approvalRequired: boolean;
  violations: string[];
}

export function evaluateAutomationGuard(input: AutomationGuardInput): AutomationGuardResult {
  const violations: string[] = [];

  if (input.audienceEstimate > input.policy.maxAudience) {
    violations.push(`Audience (${input.audienceEstimate}) exceeds max ${input.policy.maxAudience}`);
  }
  if (input.discountPct > input.policy.maxDiscountPct) {
    violations.push(`Discount ${input.discountPct}% exceeds max ${input.policy.maxDiscountPct}%`);
  }
  if (input.policy.requireConsent && !input.consentConfirmed) {
    violations.push("Consent required but not confirmed");
  }
  if (input.daysSinceLastTouch < input.policy.minDaysBetweenTouches) {
    violations.push(`Last touch ${input.daysSinceLastTouch}d ago is less than min ${input.policy.minDaysBetweenTouches}d`);
  }
  if (input.actionsPerDay > input.policy.maxActionsPerDay) {
    violations.push(`Actions per day ${input.actionsPerDay} exceeds max ${input.policy.maxActionsPerDay}`);
  }

  const allowed = violations.length === 0;
  const approvalRequired = !allowed;
  return { allowed, approvalRequired, violations };
}

export interface GoalAutomationServiceInput {
  goalService: GoalService;
  recommendations: RecommendationRepository;
  actionPlans: ActionPlanRepository;
  goals: GoalRepository;
}

export interface CreateGoalAutomationInput {
  organizationId: string;
  storeId: string;
  templateId: string;
  target?: number;
  endDate?: Date | null;
  ownerUserId?: string | null;
  audienceEstimate?: number;
  discountPct?: number;
  consentConfirmed?: boolean;
  daysSinceLastTouch?: number;
  actionsPerDay?: number;
}

export interface GoalAutomationPlanResult {
  goal: GoalRecord;
  recommendation: RecommendationRecord;
  actionPlan: ActionPlanRecord;
  guard: AutomationGuardResult;
}

export interface WorkflowNode {
  id: string;
  actionType: string;
  goalEvent: string;
  entry: string[];
  exit: string[];
  suppressesDuplicates: boolean;
  suppressesAtSend: boolean;
}

export interface WorkflowTemplate {
  name: string;
  nodes: WorkflowNode[];
  estimatedAudience?: number;
  assumptions?: string[];
}

export interface WorkflowAcceptanceReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedAudience: number | null;
  assumptions: string[];
}

const SUPPORTED_ACTION_TYPES = new Set([
  "CREATE_DM_CAMPAIGN",
  "TAKE_OVER_CONVERSATION",
  "GENERATE_COUPON",
  "CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN",
  "REFRESH_INTEGRATION",
]);

export function makeGoalAutomationService(input: GoalAutomationServiceInput) {
  return {
    listTemplates(): AutomationTemplate[] {
      return TEMPLATES;
    },

    async createFromTemplate(opts: CreateGoalAutomationInput): Promise<GoalAutomationPlanResult> {
      const template = TEMPLATES.find((t) => t.id === opts.templateId);
      if (!template) throw new Error("Template not found");

      const target = opts.target ?? template.defaultTarget;
      const endDate = opts.endDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const goal = await input.goalService.create(
        opts.organizationId,
        opts.storeId,
        template.name,
        template.targetMetric,
        target,
        endDate,
        opts.ownerUserId ?? undefined,
      );

      const now = new Date();
      const recommendation = await input.recommendations.save({
        organizationId: opts.organizationId,
        storeId: opts.storeId,
        insightId: null,
        producedByModule: "intelligence",
        producedByService: "goalAutomation",
        title: template.name,
        description: template.objective,
        objective: template.objective,
        businessObjective: inferBusinessObjective(template.reasonCodes, template.objective),
        reasoning: null,
        marketContext: null,
        competitorContext: null,
        selfContext: null,
        reasonCodes: template.reasonCodes,
        impactRange: { min: Math.floor(target * 0.3), max: Math.ceil(target * 1.2), unit: template.targetMetric },
        confidence: 0.6,
        confidenceSignals: 1,
        effort: "MEDIUM",
        urgency: "MEDIUM",
        riskTier: template.riskTier,
        eligibility: { templateId: template.id, channel: template.defaultChannel, stopConditions: template.stopConditions },
        status: "PROPOSED",
        actionType: template.actionType,
        actionParams: { storeId: opts.storeId, targetMetric: template.targetMetric, channel: template.defaultChannel },
        deepLink: `/stores/${opts.storeId}/automations/goals`,
        validFrom: now,
        validUntil: null,
        invalidatedAt: null,
        invalidatedByEvent: null,
        generatedAt: now,
        dismissedAt: null,
        snoozedUntil: null,
      });

      const actionPlan = await input.actionPlans.save({
        organizationId: opts.organizationId,
        storeId: opts.storeId,
        recommendationId: recommendation.id,
        title: template.name,
        steps: [
          {
            actionType: template.actionType,
            params: recommendation.actionParams,
            description: template.objective,
            stopConditions: template.stopConditions,
          },
        ],
        targetMetric: template.targetMetric,
        expectedImpact: recommendation.impactRange,
        status: "DRAFT",
        approvedBy: null,
        executedAt: null,
        stoppedAt: null,
      });

      // Update goal with the action plan reference if the repository supports it; otherwise leave it.
      const updatedGoal = await input.goals.findById(goal.id) ?? goal;

      const guard = evaluateAutomationGuard({
        audienceEstimate: opts.audienceEstimate ?? 0,
        discountPct: opts.discountPct ?? 0,
        consentConfirmed: opts.consentConfirmed ?? false,
        daysSinceLastTouch: opts.daysSinceLastTouch ?? 999,
        actionsPerDay: opts.actionsPerDay ?? 0,
        policy: template.guardrails,
      });

      return { goal: updatedGoal, recommendation, actionPlan, guard };
    },

    validateWorkflow(workflow: WorkflowTemplate): WorkflowAcceptanceReport {
      const errors: string[] = [];
      const warnings: string[] = [];
      const seenActions = new Map<string, number>();
      const seenIds = new Set<string>();

      if (!workflow.nodes || workflow.nodes.length === 0) {
        errors.push("Workflow must contain at least one node.");
      }

      for (const node of workflow.nodes ?? []) {
        if (!node.id || seenIds.has(node.id)) {
          errors.push(`Duplicate or missing node id: ${node.id ?? "(empty)"}.`);
        }
        seenIds.add(node.id);

        if (!SUPPORTED_ACTION_TYPES.has(node.actionType)) {
          errors.push(`Node ${node.id} uses unsupported action type "${node.actionType}".`);
        }

        if (!node.goalEvent || node.goalEvent.trim().length === 0) {
          errors.push(`Node ${node.id} must define a clear goal/success event.`);
        }

        if (!node.entry || node.entry.length === 0 || !node.exit || node.exit.length === 0) {
          errors.push(`Node ${node.id} must define explicit entry and exit conditions.`);
        }

        if (!node.suppressesAtSend) {
          warnings.push(`Node ${node.id} should suppress at send time to avoid duplicate outbound messages.`);
        }

        if (!node.suppressesDuplicates) {
          warnings.push(`Node ${node.id} should deduplicate enrollment to avoid overlapping journeys.`);
        }

        seenActions.set(node.actionType, (seenActions.get(node.actionType) ?? 0) + 1);
      }

      for (const [actionType, count] of seenActions.entries()) {
        if (count > 1) {
          warnings.push(`Action type "${actionType}" appears ${count} times — ensure no duplicate enrollment.`);
        }
      }

      const estimatedAudience = workflow.estimatedAudience ?? null;
      if (estimatedAudience === null || estimatedAudience <= 0) {
        warnings.push("Estimated audience/volume is missing; provide a value before launch.");
      }

      const assumptions = workflow.assumptions && workflow.assumptions.length > 0
        ? workflow.assumptions
        : ["Assumed workflow goals map to supported actions and stop conditions."];

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        estimatedAudience,
        assumptions,
      };
    },
  };
}

export type GoalAutomationService = ReturnType<typeof makeGoalAutomationService>;
