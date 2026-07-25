import { eventBus } from "@/shared/events";
import type {
  ActionPlanRepository,
  RecommendationRepository,
  DecisionRepository,
  ActionExecutor,
} from "./ports";
import type { MetricService } from "./metrics";
import type { OutcomeService } from "./outcome";
import type { DecisionPolicyService } from "./decision-policy";
import {
  ActionPlanApproved,
  ActionPlanExecuted,
  RecommendationAccepted,
} from "../domain/events";
import type { RecommendationRecord, ActionPlanRecord, DecisionRecord, OutcomeRecord, RiskTier } from "../domain/types";

export interface ActionPlanServiceInput {
  actionPlans: ActionPlanRepository;
  recommendations: RecommendationRepository;
  decisions: DecisionRepository;
  outcomeService: OutcomeService;
  executor: ActionExecutor;
  policy: DecisionPolicyService;
  metrics: MetricService;
}

function targetMetricForAction(actionType: string): string {
  switch (actionType) {
    case "GENERATE_COUPON":
      return "coupon_count";
    case "TAKE_OVER_CONVERSATION":
      return "conversation_count";
    case "CREATE_DM_CAMPAIGN":
      return "follower_count";
    case "REFRESH_INTEGRATION":
      return "product_count";
    default:
      return "conversation_count";
  }
}

function stepsFromRecommendation(rec: RecommendationRecord): unknown {
  return [
    {
      actionType: rec.actionType,
      params: rec.actionParams,
      description: rec.description,
    },
  ];
}

export function makeActionPlanService(input: ActionPlanServiceInput) {
  return {
    async createFromRecommendation(recommendationId: string, approvedBy?: string): Promise<ActionPlanRecord> {
      const recommendation = await input.recommendations.findById(recommendationId);
      if (!recommendation) throw new Error("Recommendation not found");

      const plan = await input.actionPlans.save({
        organizationId: recommendation.organizationId,
        storeId: recommendation.storeId,
        recommendationId: recommendation.id,
        title: recommendation.title,
        steps: stepsFromRecommendation(recommendation),
        targetMetric: targetMetricForAction(recommendation.actionType),
        expectedImpact: recommendation.impactRange,
        status: "DRAFT",
        approvedBy: null,
        executedAt: null,
        stoppedAt: null,
      });

      if (approvedBy) {
        await input.actionPlans.updateStatus(plan.id, "APPROVED", approvedBy);
      }

      await eventBus.publish(
        new RecommendationAccepted(plan.id, { recommendation, actionPlan: { ...plan, approvedBy: approvedBy ?? null, status: "DRAFT" } }),
      );

      return input.actionPlans.findById(plan.id) as Promise<ActionPlanRecord>;
    },

    async approve(actionPlanId: string, decidedBy: string, userRole: string | null): Promise<ActionPlanRecord> {
      const plan = await input.actionPlans.findById(actionPlanId);
      if (!plan) throw new Error("Action plan not found");

      const recommendation = await input.recommendations.findById(plan.recommendationId ?? "");
      const riskTier: RiskTier = recommendation?.riskTier ?? "TIER_2";
      if (!input.policy.isApprovedBySufficientAuthority(riskTier, userRole)) {
        throw new Error("Insufficient authority to approve this action plan");
      }

      await input.decisions.save({
        organizationId: plan.organizationId,
        actionPlanId: plan.id,
        recommendationId: plan.recommendationId,
        decisionType: "APPROVED",
        reason: "Approved by user",
        decidedBy,
        decidedAt: new Date(),
      });

      const approved = await input.actionPlans.updateStatus(plan.id, "APPROVED", decidedBy);

      await eventBus.publish(
        new ActionPlanApproved(plan.id, {
          actionPlan: approved,
          decision: await input.decisions.listByActionPlan(plan.id).then((ds) => ds[0]) as DecisionRecord,
        }),
      );

      return approved;
    },

    async execute(actionPlanId: string, userId: string, userRole: string | null): Promise<{ plan: ActionPlanRecord; outcome: OutcomeRecord }> {
      const plan = await input.actionPlans.findById(actionPlanId);
      if (!plan) throw new Error("Action plan not found");

      const recommendation = await input.recommendations.findById(plan.recommendationId ?? "");
      const riskTier: RiskTier = recommendation?.riskTier ?? "TIER_2";

      if (plan.status !== "APPROVED" && plan.status !== "DRAFT") {
        throw new Error("Action plan cannot be executed");
      }

      if (plan.status === "DRAFT") {
        const { allowed, requiresApproval } = input.policy.canExecute(recommendation?.actionType ?? "", riskTier, userRole);
        if (!allowed) throw new Error("Not authorized to execute this action plan");
        if (requiresApproval) throw new Error("This action plan requires approval before execution");
        await input.actionPlans.updateStatus(plan.id, "APPROVED", userId);
      }

      const beforeSnapshot = await input.metrics.getMetric(plan.targetMetric ?? "conversation_count", plan.organizationId, plan.storeId);
      const beforeValue = beforeSnapshot?.value ?? null;

      const outcome = await input.outcomeService.create(
        plan.organizationId,
        plan.id,
        plan.storeId,
        plan.targetMetric ?? null,
        beforeValue,
        recommendation?.confidence ?? 0.5,
      );

      const actionParams = {
        ...((recommendation?.actionParams as Record<string, unknown> | null) ?? {}),
        ...(plan.storeId ? { storeId: plan.storeId } : {}),
        ...(userId ? { humanUserId: userId } : {}),
      };
      const result = await input.executor.execute(recommendation?.actionType ?? "", actionParams);

      const afterSnapshot = await input.metrics.refreshMetric(plan.targetMetric ?? "conversation_count", plan.organizationId, plan.storeId);
      const afterValue = afterSnapshot?.value ?? null;

      const status: OutcomeRecord["status"] = result.ok ? "SUCCESS" : "FAILURE";
      const measuredOutcome = await input.outcomeService.measure(outcome.id, beforeValue, afterValue, status);

      const planStatus: ActionPlanRecord["status"] = result.ok ? "EXECUTED" : "FAILED";
      const executed = await input.actionPlans.updateStatus(plan.id, planStatus, undefined, new Date(), null);

      await eventBus.publish(
        new ActionPlanExecuted(plan.id, { actionPlan: executed, outcome: measuredOutcome }),
      );

      if (recommendation && recommendation.status !== "ACCEPTED") {
        await input.recommendations.updateStatus(recommendation.id, "ACCEPTED");
      }

      return { plan: executed, outcome: measuredOutcome };
    },
  };
}

export type ActionPlanService = ReturnType<typeof makeActionPlanService>;
