import type { AIMessage, AIProvider } from "./ports";
import type { AIConfigurationRepository } from "./ports";

export interface BusinessBrainAnswer {
  answer: string;
  sources: string[];
  confidence: "high" | "medium" | "low";
}

export interface AskBusinessBrainInput {
  question: string;
  organizationId: string;
  userId: string;
  storeId?: string;
}

export interface WorkspaceContextPort {
  getContext(input: {
    organizationId: string;
    userId: string;
    storeId?: string;
  }): Promise<{
    organizationName: string;
    storeCount: number;
    productCount: number;
    conversationCount: number;
    followerCount: number;
    couponCount: number;
    unreadNotificationCount: number;
    connectedIntegrations: number;
    storeNames: string[];
  }>;
}

function buildFallbackAnswer(
  question: string,
  ctx: Awaited<ReturnType<WorkspaceContextPort["getContext"]>>,
): string {
  const q = question.toLowerCase();
  const summary = `Workspace "${ctx.organizationName}" has ${ctx.storeCount} store(s), ${ctx.productCount} product(s), ${ctx.conversationCount} conversation(s), ${ctx.followerCount} follower(s), ${ctx.couponCount} coupon(s), and ${ctx.unreadNotificationCount} unread notification(s).`;

  if (q.includes("summary") || q.includes("overview")) {
    return `${summary} Connected integrations: ${ctx.connectedIntegrations}.`;
  }
  if (q.includes("focus") || q.includes("today") || q.includes("prioritize")) {
    if (ctx.unreadNotificationCount > 0) {
      return `${summary} You have unread notifications to review. If conversations are pending, consider replying or taking over high-intent threads.`;
    }
    if (ctx.conversationCount === 0) {
      return `${summary} No conversations yet. Connect Meta and simulate or wait for inbound messages to start engaging.`;
    }
    return `${summary} Review pending conversations and consider creating a first-time follower campaign to convert new followers.`;
  }
  if (q.includes("content") || q.includes("post") || q.includes("reel")) {
    return `${summary} Use the Trends or Competitors page to find high-performing content ideas, then generate captions with AI.`;
  }
  return `${summary} Ask me about your workspace summary, what to focus on today, or what content to create next.`;
}

function buildPrompt(
  question: string,
  ctx: Awaited<ReturnType<WorkspaceContextPort["getContext"]>>,
): AIMessage[] {
  const context = `
Workspace: ${ctx.organizationName}
Stores: ${ctx.storeNames.join(", ") || "none"}
Store count: ${ctx.storeCount}
Products: ${ctx.productCount}
Conversations: ${ctx.conversationCount}
Followers: ${ctx.followerCount}
Coupons: ${ctx.couponCount}
Unread notifications: ${ctx.unreadNotificationCount}
Connected integrations: ${ctx.connectedIntegrations}
`;

  return [
    {
      role: "system",
      content: `You are OmniConnect AI Business Brain, an evidence-backed assistant for creators and social-first businesses. Answer concisely using only the workspace context below. If data is missing, say so. Recommend one concrete next action when possible.\n\nContext:${context}`,
    },
    { role: "user", content: question },
  ];
}

export function makeAskBusinessBrain(deps: {
  aiProvider: AIProvider;
  aiConfigurationRepository: AIConfigurationRepository;
  workspaceContext: WorkspaceContextPort;
}) {
  return async function askBusinessBrain(
    input: AskBusinessBrainInput,
  ): Promise<BusinessBrainAnswer> {
    const ctx = await deps.workspaceContext.getContext({
      organizationId: input.organizationId,
      userId: input.userId,
      storeId: input.storeId,
    });

    const fallback = buildFallbackAnswer(input.question, ctx);
    const messages = buildPrompt(input.question, ctx);

    const storeId = input.storeId ?? ctx.storeNames[0] ?? "";
    const config = await deps.aiConfigurationRepository.getByStore(storeId);

    const answer = await deps.aiProvider.complete(messages, {
      model: config?.model ?? "gpt-4o-mini",
      fallback,
    });

    return {
      answer,
      sources: ctx.storeNames,
      confidence: answer === fallback ? "low" : "high",
    };
  };
}

export type AskBusinessBrain = ReturnType<typeof makeAskBusinessBrain>;
