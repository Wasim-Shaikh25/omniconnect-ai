import type { AIConfigurationRepository, AIProvider } from "./ports";
import { AIContextBuilder } from "./ai-context";
import { selectModel } from "./model-router";

export interface TrendingReelInput {
  externalId: string;
  caption: string | null;
  mediaType: string;
  hashtags: string[];
  audioName: string | null;
  publishedAt: string | null;
  likes: number | null;
  comments: number | null;
  plays: number | null;
  views: number | null;
  engagementRate: number | null;
}

export interface TrendingReelRecommendation {
  title: string;
  outline: string;
  hashtags: string[];
  audioSuggestion: string;
}

export interface TrendingReelsAnalysis {
  query: string;
  summary: string;
  patterns: string[];
  topHashtags: string[];
  audioSuggestions: string[];
  bestTimeToPost: string;
  recommendations: TrendingReelRecommendation[];
}

export interface AnalyzeTrendingReelsInput {
  projectId: string;
  query: string;
  reels: TrendingReelInput[];
}

export interface AnalyzeTrendingReels {
  (input: AnalyzeTrendingReelsInput): Promise<TrendingReelsAnalysis>;
}

const DEFAULT_TONE = "trendy, authentic, and platform-native";

export function makeAnalyzeTrendingReels(deps: {
  aiProvider: AIProvider;
  aiConfigurationRepository: AIConfigurationRepository;
}): AnalyzeTrendingReels {
  return async function analyzeTrendingReels(input): Promise<TrendingReelsAnalysis> {
    const config = await deps.aiConfigurationRepository.getByStore(input.projectId);
    const tone = config?.tone ?? DEFAULT_TONE;

    const reelSummary = input.reels
      .map((r, i) => {
        const metrics = [
          r.likes !== null && r.likes !== undefined ? `${r.likes} likes` : "",
          r.comments !== null && r.comments !== undefined ? `${r.comments} comments` : "",
          r.plays !== null && r.plays !== undefined ? `${r.plays} plays` : "",
          r.views !== null && r.views !== undefined ? `${r.views} views` : "",
          r.engagementRate !== null && r.engagementRate !== undefined
            ? `${Math.round(r.engagementRate * 10000) / 100}% engagement`
            : "",
        ]
          .filter(Boolean)
          .join(", ");
        return `${i + 1}. ${r.mediaType} | ${r.caption?.slice(0, 200) ?? "(no caption)"} | Hashtags: ${r.hashtags.join(", ") || "none"} | Audio: ${r.audioName ?? "unknown"} | ${metrics}`;
      })
      .join("\n");

    const system = `You are a social media trend analyst for Instagram Reels. Tone: ${tone}.
Analyze the provided reels and return a JSON object only (no markdown) with the following keys:
- query (string, the niche/topic being analyzed)
- summary (string, 2-3 sentences describing what is working in this niche right now)
- patterns (array of 3-5 strings describing repeating formats, hooks, visuals, or editing styles)
- topHashtags (array of 10-15 hashtags that appear across the high-performing reels)
- audioSuggestions (array of 3 trending audio styles or sound cues that fit the niche)
- bestTimeToPost (string, human-readable like "Tuesday, 7:00 PM EST")
- recommendations (array of 3-5 objects, each with title, outline, hashtags, audioSuggestion)
Be concise and strategic. Do not mention that you are an AI.`;

    const user = `Niche / topic: ${input.query}
Reels to analyze:
${reelSummary}

Detect the patterns and recommend fresh Reel ideas for this niche.`;

    const context = new AIContextBuilder()
      .withSystem(system)
      .withUser(user)
      .withModel(selectModel("trending-reels", config?.model).model)
      .withFallback(DEFAULT_DEV_OUTPUT)
      .withOperation("trending-reels")
      .withMetadata({ projectId: input.projectId, query: input.query, reelCount: input.reels.length })
      .build();

    const raw = await deps.aiProvider.complete(context.messages, {
      model: context.model,
      fallback: context.fallback,
      operation: context.operation,
      metadata: context.metadata,
    });

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed !== "object" || parsed === null) return parseFallback(raw, input.query);
      return parseAnalysis(parsed, input.query);
    } catch {
      return parseFallback(raw, input.query);
    }
  };
}

const DEFAULT_DEV_OUTPUT = JSON.stringify({
  query: "trending reels",
  summary: "Short, high-energy Reels with clear hooks and trending audio are driving the most engagement in this niche.",
  patterns: ["Fast 3-second hook", "Text-on-screen narration", "Before/after reveal", "Trending audio sync", "Product-in-use demo"],
  topHashtags: ["#reels", "#viral", "#smallbusiness", "#trending", "#behindthescenes", "#musthave"],
  audioSuggestions: ["Trending upbeat pop", "Satisfying ASR", "Voiceover storytelling"],
  bestTimeToPost: "Tuesday, 7:00 PM EST",
  recommendations: [
    {
      title: "Hook in 3 Seconds",
      outline: "Start with a bold question or visual surprise, then deliver the payoff in under 15 seconds.",
      hashtags: ["#reels", "#viral", "#smallbusiness"],
      audioSuggestion: "Trending upbeat pop",
    },
    {
      title: "Before vs After",
      outline: "Show a relatable transformation using your product or process with text captions guiding the story.",
      hashtags: ["#beforeandafter", "#transformation", "#musthave"],
      audioSuggestion: "Satisfying ASR",
    },
  ],
});

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function parseRecommendation(value: unknown): TrendingReelRecommendation {
  const raw = value as Record<string, unknown>;
  return {
    title: typeof raw.title === "string" ? raw.title : "Reel idea",
    outline: typeof raw.outline === "string" ? raw.outline : "",
    hashtags: parseStringArray(raw.hashtags),
    audioSuggestion: typeof raw.audioSuggestion === "string" ? raw.audioSuggestion : "",
  };
}

function parseAnalysis(value: unknown, query: string): TrendingReelsAnalysis {
  const raw = value as Record<string, unknown>;
  const recommendations = Array.isArray(raw.recommendations)
    ? raw.recommendations.map((r) => parseRecommendation(r))
    : [];
  return {
    query: typeof raw.query === "string" ? raw.query : query,
    summary: typeof raw.summary === "string" ? raw.summary : "",
    patterns: parseStringArray(raw.patterns),
    topHashtags: parseStringArray(raw.topHashtags),
    audioSuggestions: parseStringArray(raw.audioSuggestions),
    bestTimeToPost: typeof raw.bestTimeToPost === "string" ? raw.bestTimeToPost : "",
    recommendations,
  };
}

function parseFallback(raw: string, query: string): TrendingReelsAnalysis {
  return {
    query,
    summary: raw.slice(0, 240),
    patterns: ["Short-form Reels", "Trending audio", "Strong opening hook"],
    topHashtags: ["#reels", "#trending", "#smallbusiness"],
    audioSuggestions: ["Trending audio"],
    bestTimeToPost: "Weekday, 7:00 PM local time",
    recommendations: [
      {
        title: "Trending Reel",
        outline: "Create a 15-second Reel with a clear hook, trending audio, and a soft CTA.",
        hashtags: ["#reels", "#trending", "#smallbusiness"],
        audioSuggestion: "Trending audio",
      },
    ],
  };
}
