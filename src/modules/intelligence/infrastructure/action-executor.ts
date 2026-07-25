import type { ActionExecutor } from "../application/ports";
import type { RiskTier } from "../domain/types";

export interface WorkspaceActionExecutorDeps {
  generateCoupon(input: {
    storeId: string;
    code: string;
    discountPct: number;
    customerId?: string;
    pushToProvider?: boolean;
    expiresAt?: Date | null;
  }): Promise<
    | { ok: true; value: { id: string; code: string; discountPct: number } }
    | { ok: false; error: { message: string } }
  >;
  takeOverConversation(input: { conversationId: string; humanUserId: string }): Promise<void>;
  createDmCampaign(input: {
    storeId: string;
    campaignType: string;
    audienceCriteria?: unknown;
    scheduledAt?: Date | null;
  }): Promise<{ id: string }>;
}

function canExecuteAction(actionType: string, riskTier: RiskTier, userRole: string | null): { allowed: boolean; requiresApproval: boolean } {
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

function generateCouponCode(): string {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `OMNI-${suffix}`;
}

export function makeWorkspaceActionExecutor(deps: WorkspaceActionExecutorDeps): ActionExecutor {
  return {
    canExecute: canExecuteAction,

    async execute(actionType: string, params: unknown): Promise<{ ok: boolean; message?: string }> {
      const typed = typeof params === "object" && params !== null ? (params as Record<string, unknown>) : {};

      try {
        switch (actionType) {
          case "GENERATE_COUPON": {
            const storeId = String(typed.storeId ?? "");
            const customerId = typed.customerId ? String(typed.customerId) : undefined;
            const discountPct = typeof typed.discountPct === "number" ? typed.discountPct : 10;
            if (!storeId) return { ok: false, message: "Missing storeId" };

            const result = await deps.generateCoupon({
              storeId,
              code: generateCouponCode(),
              discountPct,
              customerId,
              pushToProvider: false,
            });

            if (!result.ok) return { ok: false, message: result.error.message };
            return { ok: true, message: `Coupon ${result.value.code} created` };
          }

          case "TAKE_OVER_CONVERSATION": {
            const conversationId = String(typed.conversationId ?? "");
            const humanUserId = String(typed.humanUserId ?? "");
            if (!conversationId || !humanUserId) return { ok: false, message: "Missing conversationId or humanUserId" };

            await deps.takeOverConversation({ conversationId, humanUserId });
            return { ok: true, message: "Conversation taken over" };
          }

          case "CREATE_DM_CAMPAIGN": {
            const storeId = String(typed.storeId ?? "");
            const campaignType = String(typed.campaignType ?? "FOLLOWER_REENGAGE");
            if (!storeId) return { ok: false, message: "Missing storeId" };

            await deps.createDmCampaign({
              storeId,
              campaignType,
              audienceCriteria: typed.audienceCriteria,
            });
            return { ok: true, message: "DM campaign created" };
          }

          case "REFRESH_INTEGRATION":
            return { ok: true, message: "Integration refresh requested" };

          default:
            return { ok: false, message: `Unsupported action type: ${actionType}` };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Action execution failed";
        return { ok: false, message };
      }
    },
  };
}
