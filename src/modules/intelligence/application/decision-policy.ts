import type { ActionExecutor } from "./ports";
import type { RiskTier } from "../domain/types";

export interface DecisionPolicyInput {
  executor: ActionExecutor;
}

export interface DecisionPolicyResult {
  allowed: boolean;
  requiresApproval: boolean;
}

export function makeDecisionPolicyService(input: DecisionPolicyInput) {
  return {
    canExecute(actionType: string, riskTier: RiskTier, userRole: string | null): DecisionPolicyResult {
      return input.executor.canExecute(actionType, riskTier, userRole);
    },

    isApprovedBySufficientAuthority(riskTier: RiskTier, userRole: string | null): boolean {
      if (riskTier === "TIER_4") return userRole === "ADMIN" || userRole === "STORE_OWNER";
      if (riskTier === "TIER_3") return userRole === "ADMIN" || userRole === "STORE_OWNER" || userRole === "STAFF";
      return userRole !== null;
    },
  };
}

export type DecisionPolicyService = ReturnType<typeof makeDecisionPolicyService>;
