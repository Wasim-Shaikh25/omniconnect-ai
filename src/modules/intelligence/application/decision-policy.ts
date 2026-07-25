import type { RiskTier } from "../domain/types";

export interface DecisionPolicyResult {
  allowed: boolean;
  requiresApproval: boolean;
}

function canExecuteAction(actionType: string, riskTier: RiskTier, userRole: string | null): DecisionPolicyResult {
  switch (riskTier) {
    case "TIER_1":
      return { allowed: true, requiresApproval: false };
    case "TIER_2":
      return {
        allowed: userRole !== null,
        requiresApproval: userRole === "STAFF",
      };
    case "TIER_3":
      return {
        allowed: userRole === "ADMIN" || userRole === "STORE_OWNER" || userRole === "STAFF",
        requiresApproval: true,
      };
    case "TIER_4":
    default:
      return {
        allowed: userRole === "ADMIN" || userRole === "STORE_OWNER",
        requiresApproval: true,
      };
  }
}

export function makeDecisionPolicyService() {
  return {
    canExecute(actionType: string, riskTier: RiskTier, userRole: string | null): DecisionPolicyResult {
      return canExecuteAction(actionType, riskTier, userRole);
    },

    isApprovedBySufficientAuthority(riskTier: RiskTier, userRole: string | null): boolean {
      if (riskTier === "TIER_4") return userRole === "ADMIN" || userRole === "STORE_OWNER";
      if (riskTier === "TIER_3") return userRole === "ADMIN" || userRole === "STORE_OWNER" || userRole === "STAFF";
      return userRole !== null;
    },
  };
}

export type DecisionPolicyService = ReturnType<typeof makeDecisionPolicyService>;
