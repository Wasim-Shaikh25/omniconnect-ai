import { eventBus } from "@/shared/events";
import type {
  ActionPlanRepository,
  RecommendationRepository,
  DecisionRepository,
  ActionExecutor,
} from "./ports";
import type { MetricService } from "./metrics";
import type { OutcomeService } from "./outcome";
import type { BusinessLearningService } from "./business-learning";
import type { DecisionPolicyService } from "./decision-policy";
import {
  ActionPlanApproved,
  ActionPlanExecuted,
  RecommendationAccepted,
} from "../domain/events";
import { canExecuteRecommendation } from "../domain/recommendation";
import type { RecommendationRecord, ActionPlanRecord, DecisionRecord, OutcomeRecord, RiskTier } from "../domain/types";

export interface ActionPlanServiceInput {
  actionPlans: ActionPlanRepository;
  recommendations: RecommendationRepository;
  decisions: DecisionRepository;
  outcomeService: OutcomeService;
  businessLearning: BusinessLearningService;
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
    case "CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN":
      return "conversation_count";
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
    async createFromRecommendation(recommendationId: string, userId: string, approvedBy?: string): Promise<ActionPlanRecord> {
      const recommendation = await input.recommendations.findById(recommendationId, userId);
      if (!recommendation) throw new Error("Recommendation not found");

      const plan = await input.actionPlans.save({
        userId: recommendation.userId,
        projectId: recommendation.projectId,
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
        await input.actionPlans.updateStatus(plan.id, userId, "APPROVED", approvedBy);
      }

      await eventBus.publish(
        new RecommendationAccepted(plan.id, { recommendation, actionPlan: { ...plan, approvedBy: approvedBy ?? null, status: "DRAFT" } }),
      );

      return input.actionPlans.findById(plan.id, userId) as Promise<ActionPlanRecord>;
    },

    async approve(actionPlanId: string, userId: string, decidedBy: string, userRole: string | null): Promise<ActionPlanRecord> {
      const plan = await input.actionPlans.findById(actionPlanId, userId);
      if (!plan) throw new Error("Action plan not found");

      const recommendation = await input.recommendations.findById(plan.recommendationId ?? "", userId);
      const riskTier: RiskTier = recommendation?.riskTier ?? "TIER_2";
      if (!input.policy.isApprovedBySufficientAuthority(riskTier, userRole)) {
        throw new Error("Insufficient authority to approve this action plan");
      }

      await input.decisions.save({
        userId: plan.userId,
        actionPlanId: plan.id,
        recommendationId: plan.recommendationId,
        decisionType: "APPROVED",
        reason: "Approved by user",
        decidedBy,
        decidedAt: new Date(),
      });

      const approved = await input.actionPlans.updateStatus(plan.id, userId, "APPROVED", decidedBy);

      await eventBus.publish(
        new ActionPlanApproved(plan.id, {
          actionPlan: approved,
          decision: await input.decisions.listByActionPlan(plan.id).then((ds) => ds[0]) as DecisionRecord,
        }),
      );

      return approved;
    },

    async execute(actionPlanId: string, userId: string, userId: string, userRole: string | null): Promise<{ plan: ActionPlanRecord; outcome: OutcomeRecord }> {
      const plan = await input.actionPlans.findById(actionPlanId, userId);
      if (!plan) throw new Error("Action plan not found");

      const recommendation = await input.recommendations.findById(plan.recommendationId ?? "", userId);
      const executable = canExecuteRecommendation(recommendation);
      if (!executable.ok) {
        throw new Error(executable.reason ?? "Recommendation cannot be executed");
      }

      const riskTier: RiskTier = recommendation?.riskTier ?? "TIER_2";

      if (plan.status !== "APPROVED" && plan.status !== "DRAFT") {
        throw new Error("Action plan cannot be executed");
      }

      if (plan.status === "DRAFT") {
        const { allowed, requiresApproval } = input.policy.canExecute(recommendation?.actionType ?? "", riskTier, userRole);
        if (!allowed) throw new Error("Not authorized to execute this action plan");
        if (requiresApproval) throw new Error("This action plan requires approval before execution");
        await input.actionPlans.updateStatus(plan.id, userId, "APPROVED", userId);
      }

      const beforeSnapshot = await input.metrics.getMetric(plan.targetMetric ?? "conversation_count", plan.userId, plan.projectId);
      const beforeValue = beforeSnapshot?.value ?? null;

      const outcome = await input.outcomeService.create(
        plan.userId,
        plan.id,
        plan.projectId,
        plan.targetMetric ?? null,
        beforeValue,
        recommendation?.confidence ?? 0.5,
      );

      const actionParams = {
        ...((recommendation?.actionParams as Record<string, unknown> | null) ?? {}),
        ...(plan.projectId ? { projectId: plan.projectId } : {}),
        ...(userId ? { humanUserId: userId } : {}),
      };
      const result = await input.executor.execute(recommendation?.actionType ?? "", actionParams);

      const afterSnapshot = await input.metrics.refreshMetric(plan.targetMetric ?? "conversation_count", plan.userId, plan.projectId);
      const afterValue = afterSnapshot?.value ?? null;

      const status: OutcomeRecord["status"] = result.ok ? "SUCCESS" : "FAILURE";
      const measuredOutcome = await input.outcomeService.measure(outcome.id, userId, beforeValue, afterValue, status);

      if (recommendation) {
        await input.businessLearning.learnFromOutcome(recommendation, measuredOutcome);
      }

      const planStatus: ActionPlanRecord["status"] = result.ok ? "EXECUTED" : "FAILED";
      const executed = await input.actionPlans.updateStatus(plan.id, userId, planStatus, undefined, new Date(), null);

      await eventBus.publish(
        new ActionPlanExecuted(plan.id, { actionPlan: executed, outcome: measuredOutcome }),
      );

      if (recommendation && recommendation.status !== "ACCEPTED") {
        await input.recommendations.updateStatus(recommendation.id, userId, "ACCEPTED");
      }

      return { plan: executed, outcome: measuredOutcome };
    },
  };
}

export type ActionPlanService = ReturnType<typeof makeActionPlanService>;
