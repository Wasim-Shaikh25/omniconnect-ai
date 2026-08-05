import { conversationCommands } from "../infrastructure/container";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export async function executeConversationAction(actionType: string, params: unknown): Promise<ActionResult> {
  const typed = typeof params === "object" && params !== null ? (params as Record<string, unknown>) : {};

  switch (actionType) {
    case "TAKE_OVER_CONVERSATION": {
      const conversationId = String(typed.conversationId ?? "");
      const projectId = String(typed.projectId ?? "");
      const humanUserId = String(typed.humanUserId ?? "");
      if (!conversationId || !projectId || !humanUserId) {
        return { ok: false, message: "Missing conversationId, projectId, or humanUserId" };
      }

      try {
        await conversationCommands.takeOver({ conversationId, projectId, humanUserId });
        return { ok: true, message: "Conversation taken over" };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Take-over failed";
        return { ok: false, message };
      }
    }

    default:
      return { ok: false, message: `Unsupported conversation action type: ${actionType}` };
  }
}
