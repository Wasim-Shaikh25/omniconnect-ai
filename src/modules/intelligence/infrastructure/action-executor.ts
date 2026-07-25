import type { ActionExecutor } from "../application/ports";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export interface DomainActionHandler {
  execute(actionType: string, params: unknown): Promise<ActionResult>;
}

export interface WorkspaceActionExecutorDeps {
  ecommerce: DomainActionHandler;
  conversations: DomainActionHandler;
  growth: DomainActionHandler;
}

const ECOMMERCE_ACTIONS = new Set(["GENERATE_COUPON", "REFRESH_INTEGRATION"]);
const CONVERSATION_ACTIONS = new Set(["TAKE_OVER_CONVERSATION"]);
const GROWTH_ACTIONS = new Set(["CREATE_DM_CAMPAIGN", "CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN"]);

export function makeWorkspaceActionExecutor(deps: WorkspaceActionExecutorDeps): ActionExecutor {
  return {
    async execute(actionType: string, params: unknown): Promise<{ ok: boolean; message?: string }> {
      try {
        if (ECOMMERCE_ACTIONS.has(actionType)) {
          return await deps.ecommerce.execute(actionType, params);
        }
        if (CONVERSATION_ACTIONS.has(actionType)) {
          return await deps.conversations.execute(actionType, params);
        }
        if (GROWTH_ACTIONS.has(actionType)) {
          return await deps.growth.execute(actionType, params);
        }
        return { ok: false, message: `Unsupported action type: ${actionType}` };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Action execution failed";
        return { ok: false, message };
      }
    },
  };
}
