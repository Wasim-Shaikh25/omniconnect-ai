import type { AIProvider, AIConfigurationRepository, BrainConversationMemoryRecord } from "./ports";
import type { BrainMemoryService } from "./brain-memory";
import type { MarketingMemoryRecord, DailyBriefRecord, BusinessBrainContext } from "@/modules/intelligence";
import { AIContextBuilder } from "./ai-context";
import { selectModel } from "./model-router";

export interface BusinessBrainAnswer {
  answer: string;
  sources: string[];
  confidence: "high" | "medium" | "low";
  memoryId?: string;
}

export interface AskBusinessBrainInput {
  question: string;
  userId: string;
  userId: string;
  projectId?: string;
}

export interface WorkspaceContextPort {
  getContext(input: {
    userId: string;
    userId: string;
    projectId?: string;
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

export interface MarketingMemoryPort {
  getMemory(userId: string, projectId: string): Promise<MarketingMemoryRecord>;
  getBrief(userId: string, projectId: string): Promise<DailyBriefRecord>;
}

export interface BusinessBrainContextPort {
  getContext(userId: string, projectId?: string): Promise<BusinessBrainContext>;
}

function buildFallbackAnswer(
  question: string,
  ctx: Awaited<ReturnType<WorkspaceContextPort["getContext"]>>,
  brief?: DailyBriefRecord,
  brainContext?: BusinessBrainContext,
): string {
  const q = question.toLowerCase();
  const summary = `Workspace "${ctx.organizationName}" has ${ctx.storeCount} store(s), ${ctx.productCount} product(s), ${ctx.conversationCount} conversation(s), ${ctx.followerCount} follower(s), ${ctx.couponCount} coupon(s), and ${ctx.unreadNotificationCount} unread notification(s).`;
  const intelligenceSummary = brainContext ? ` ${brainContext.summary}` : "";
  const daily = brief
    ? `Today's brief: ${brief.priorities.join("; ")}.`
    : "";

  if (q.includes("summary") || q.includes("overview")) {
    return `${summary} Connected integrations: ${ctx.connectedIntegrations}.${intelligenceSummary}${daily ? ` ${daily}` : ""}`;
  }
  if (q.includes("focus") || q.includes("today") || q.includes("prioritize")) {
    if (brief && brief.priorities.length > 0) {
      return `${summary}${intelligenceSummary} ${daily}`;
    }
    if (ctx.unreadNotificationCount > 0) {
      return `${summary}${intelligenceSummary} You have unread notifications to review. If conversations are pending, consider replying or taking over high-intent threads.`;
    }
    if (ctx.conversationCount === 0) {
      return `${summary}${intelligenceSummary} No conversations yet. Connect Meta and simulate or wait for inbound messages to start engaging.`;
    }
    return `${summary}${intelligenceSummary} Review pending conversations and consider creating a first-time follower campaign to convert new followers.`;
  }
  if (q.includes("content") || q.includes("post") || q.includes("reel")) {
    const idea = brief?.contentIdea ?? "Use the Trends or Competitors page to find high-performing content ideas, then generate captions with AI.";
    return `${summary}${intelligenceSummary} ${idea}`;
  }
  return `${summary}${intelligenceSummary}${daily ? ` ${daily} ` : ""}Ask me about your workspace summary, what to focus on today, or what content to create next.`;
}

function buildPrompt(
  question: string,
  ctx: Awaited<ReturnType<WorkspaceContextPort["getContext"]>>,
  memory?: MarketingMemoryRecord,
  brief?: DailyBriefRecord,
  brainContext?: BusinessBrainContext,
  recentMemory?: BrainConversationMemoryRecord[],
): AIContextBuilder {
  const topProducts = memory?.productScores
    .slice(0, 3)
    .map((p) => `${p.productTitle} (${Math.round(p.compositeScore * 100)} pts)`)
    .join(", ") ?? "none";

  const dmPatterns = memory?.dmPatterns
    .slice(0, 3)
    .map((p) => `${p.category}: ${p.frequency}`)
    .join("; ") ?? "none";

  const commentPatterns = memory?.commentPatterns
    .slice(0, 3)
    .map((p) => `${p.category}: ${p.frequency}`)
    .join("; ") ?? "none";

  const dailyBrief = brief
    ? `
Today's priorities: ${brief.priorities.join("; ")}
Recommended product: ${brief.recommendedProductTitle ?? "none"}
Content idea: ${brief.contentIdea ?? "none"}
Best posting time: ${brief.bestPostingTime ?? "unknown"}
Trending hashtags: ${brief.trendingHashtags.map((h) => `#${h}`).join(", ") || "none"}
`
    : "";

  const topInsight = brainContext?.topInsights[0]?.title ?? "none";
  const topRecommendation = brainContext?.topRecommendations[0]?.title ?? "none";
  const topPrediction = brainContext?.activePredictions[0]?.predictionType ?? "none";
  const latestOutcome = brainContext?.recentOutcomes[0]?.status ?? "none";
  const latestLearning = brainContext?.learning[0]?.ruleName ?? "none";
  const activeGoal = brainContext?.activeGoals[0]?.name ?? "none";

  const todayActions = brainContext?.todayActions
    .slice(0, 3)
    .map((a) => `${a.title} (${a.objective}, ${Math.round(a.confidence * 100)}%)`)
    .join("; ") ?? "none";

  const journeys = brainContext?.recentJourneys
    .slice(0, 3)
    .map((j) => `${j.steps.map((s) => s.type).join("→")} ⇒ ${j.outcome}`)
    .join("; ") ?? "none";

  const citations = brainContext?.citations
    .slice(0, 8)
    .map((c) => `[${c.source}] ${c.detail}`)
    .join("\n") ?? "";

  const intelligenceContext = brainContext
    ? `
Intelligence summary: ${brainContext.summary}
Today's actions: ${todayActions}
Customer journeys: ${journeys}
Top insight: ${topInsight}
Top recommendation: ${topRecommendation}
Top prediction: ${topPrediction}
Latest outcome: ${latestOutcome}
Latest learning: ${latestLearning}
Active goal: ${activeGoal}
Cite these sources when relevant:
${citations}
`
    : "";

  const memoryContext = recentMemory && recentMemory.length > 0
    ? `
Recent conversation memory:
${recentMemory
      .map(
        (m) =>
          `- Q: ${m.question}\n  A: ${m.answer}${m.goals.length > 0 ? `\n  Goals: ${m.goals.join(", ")}` : ""}${m.acceptedAdviceIds.length > 0 ? `\n  Accepted: ${m.acceptedAdviceIds.join(", ")}` : ""}${m.rejectedAdviceIds.length > 0 ? `\n  Rejected: ${m.rejectedAdviceIds.join(", ")}` : ""}`,
      )
      .join("\n")}
`
    : "";

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
Top products: ${topProducts}
DM patterns: ${dmPatterns}
Comment patterns: ${commentPatterns}${dailyBrief}${intelligenceContext}${memoryContext}
`;

  return new AIContextBuilder()
    .withSystem(`You are OmniConnect AI Marketing Brain, an evidence-backed assistant for Instagram and Facebook businesses. Answer concisely using only the workspace context below. If data is missing, say so. Recommend one concrete next action when possible.\n\nContext:${context}`)
    .withUser(question)
    .withOperation("brain");
}

export interface AskBusinessBrainDeps {
  aiProvider: AIProvider;
  aiConfigurationRepository: AIConfigurationRepository;
  workspaceContext: WorkspaceContextPort;
  marketingMemory?: MarketingMemoryPort;
  businessBrainContext?: BusinessBrainContextPort;
  brainMemory?: BrainMemoryService;
}

export function makeAskBusinessBrain(deps: AskBusinessBrainDeps) {
  return async function askBusinessBrain(
    input: AskBusinessBrainInput,
  ): Promise<BusinessBrainAnswer> {
    const ctx = await deps.workspaceContext.getContext({
      userId: input.userId,
      userId: input.userId,
      projectId: input.projectId,
    });

    let memory: MarketingMemoryRecord | undefined;
    let brief: DailyBriefRecord | undefined;
    let brainContext: BusinessBrainContext | undefined;
    let recentMemory: BrainConversationMemoryRecord[] | undefined;
    const projectId = input.projectId ?? ctx.storeNames[0];
    if (deps.marketingMemory && projectId) {
      try {
        memory = await deps.marketingMemory.getMemory(input.userId, projectId);
        brief = await deps.marketingMemory.getBrief(input.userId, projectId);
      } catch {
        // Memory is optional; answer from workspace context if unavailable.
      }
    }

    if (deps.businessBrainContext) {
      try {
        brainContext = await deps.businessBrainContext.getContext(input.userId, input.projectId);
      } catch {
        // Intelligence context is optional; answer from workspace context if unavailable.
      }
    }

    if (deps.brainMemory) {
      try {
        recentMemory = await deps.brainMemory.getRecentContext(input.userId, input.userId, input.projectId, 5);
      } catch {
        // Conversation memory is optional.
      }
    }

    const fallback = buildFallbackAnswer(input.question, ctx, brief, brainContext);
    const promptBuilder = buildPrompt(input.question, ctx, memory, brief, brainContext, recentMemory);

    const configStoreId = projectId ?? "";
    const config = await deps.aiConfigurationRepository.getByStore(configStoreId);
    const model = selectModel("brain", config?.model).model;

    const context = promptBuilder
      .withModel(model)
      .withFallback(fallback)
      .withMetadata({ userId: input.userId, userId: input.userId, projectId })
      .build();

    const answer = await deps.aiProvider.complete(context.messages, {
      model: context.model,
      fallback: context.fallback,
    });

    let memoryId: string | undefined;
    if (deps.brainMemory) {
      try {
        const entry = await deps.brainMemory.rememberQuestion(
          input.userId,
          input.userId,
          input.question,
          answer,
          input.projectId,
        );
        memoryId = entry.id;
      } catch {
        // Do not fail the answer if memory persistence fails.
      }
    }

    const citationSources = brainContext?.citations.map((c) => `${c.source}: ${c.reference}`) ?? [];

    return {
      answer,
      sources: [...ctx.storeNames, ...citationSources],
      confidence: answer === fallback ? "low" : "high",
      memoryId,
    };
  };
}

export type AskBusinessBrain = ReturnType<typeof makeAskBusinessBrain>;
