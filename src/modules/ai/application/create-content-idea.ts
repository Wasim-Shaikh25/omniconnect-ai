import type { AIConfigurationRepository, AIProvider } from "./ports";
import { AIContextBuilder } from "./ai-context";
import { selectModel } from "./model-router";

export interface CreateContentIdeaInput {
  projectId: string;
  type?: string;
  topic?: string;
  niche?: string | null;
  basedOnMedia?: { id: string; caption: string | null; mediaType: string }[];
}

export interface ContentIdeaOutput {
  title: string;
  outline: string;
  hashtags: string[];
  audioSuggestion: string;
  basedOnMediaIds: string[];
}

export interface CreateContentIdea {
  (input: CreateContentIdeaInput): Promise<ContentIdeaOutput>;
}

const DEFAULT_TONE = "trendy, authentic, and platform-native";

export function makeCreateContentIdea(deps: {
  aiProvider: AIProvider;
  aiConfigurationRepository: AIConfigurationRepository;
}): CreateContentIdea {
  return async function createContentIdea(input): Promise<ContentIdeaOutput> {
    const config = await deps.aiConfigurationRepository.getByStore(input.projectId);
    const tone = config?.tone ?? DEFAULT_TONE;
    const type = input.type ?? "REEL";
    const topic = input.topic ?? input.niche ?? "our niche";

    const mediaSummary = (input.basedOnMedia ?? [])
      .map((m, i) => `${i + 1}. ${m.mediaType}: ${m.caption?.slice(0, 120) ?? "(no caption)"}`)
      .join("\n") || "(no reference media)";

    const system = `You are a Meta content creator assistant. Tone: ${tone}.
Create a fresh ${type} content idea based on the topic and reference media. Return a JSON object only (no markdown) with:
- title (string, catchy)
- outline (string, 2-4 sentences describing the hook, body, and CTA)
- hashtags (array of 10-15 strings)
- audioSuggestion (string, trending audio style or sound cue)
Do not mention that you are an AI.`;

    const user = `Topic/niche: ${topic}
Content type: ${type}
Reference media:
${mediaSummary}

Generate a new ${type} idea.`;

    const context = new AIContextBuilder()
      .withSystem(system)
      .withUser(user)
      .withModel(selectModel("post-ideas", config?.model).model)
      .withFallback(DEFAULT_DEV_OUTPUT)
      .withOperation("create-content-idea")
      .withMetadata({ projectId: input.projectId, type, topic: input.topic })
      .build();

    const raw = await deps.aiProvider.complete(context.messages, {
      model: context.model,
      fallback: context.fallback,
      operation: context.operation,
      metadata: context.metadata,
    });

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed !== "object" || parsed === null) return parseFallback(input);
      return parseIdea(parsed, input);
    } catch {
      return parseFallback(input);
    }
  };
}

const DEFAULT_DEV_OUTPUT = JSON.stringify({
  title: "Why [Product] Keeps Selling Out (Reel)",
  outline: "Hook: Show the sold-out notice. Body: Quick behind-the-scenes of restocking + creator using it. CTA: Comment 'link' and we'll DM you a discount.",
  hashtags: ["#smallbusiness", "#behindthescenes", "#reeltips", "#musthave", "#shoplocal"],
  audioSuggestion: "Trending soft-pop / satisfying audio",
});

function parseFallback(input: CreateContentIdeaInput): ContentIdeaOutput {
  const parsed = JSON.parse(DEFAULT_DEV_OUTPUT) as unknown;
  return parseIdea(parsed, input);
}

function parseIdea(value: unknown, input: CreateContentIdeaInput): ContentIdeaOutput {
  const obj = value as Record<string, unknown>;
  const basedOnMediaIds = (input.basedOnMedia ?? []).map((m) => m.id);
  return {
    title: typeof obj.title === "string" ? obj.title : "Content idea",
    outline: typeof obj.outline === "string" ? obj.outline : "",
    hashtags: Array.isArray(obj.hashtags)
      ? obj.hashtags.filter((h): h is string => typeof h === "string").slice(0, 15)
      : [],
    audioSuggestion: typeof obj.audioSuggestion === "string" ? obj.audioSuggestion : "",
    basedOnMediaIds,
  };
}
