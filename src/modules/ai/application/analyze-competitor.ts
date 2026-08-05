import type { MetaMediaItem } from "@/modules/meta";
import type { AIConfigurationRepository, AIProvider } from "./ports";
import { AIContextBuilder } from "./ai-context";
import { selectModel } from "./model-router";

export interface AnalyzeCompetitorInput {
  projectId: string;
  handle: string;
  niche?: string | null;
  posts: MetaMediaItem[];
}

export interface CompetitorAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  contentPatterns: string[];
  postingStrategy: string;
  recommendations: string[];
  hashtags: string[];
  audioSuggestion: string;
  bestTimeToPost: string;
}

export interface AnalyzeCompetitor {
  (input: AnalyzeCompetitorInput): Promise<CompetitorAnalysis>;
}

const DEFAULT_TONE = "trendy, authentic, and platform-native";

export function makeAnalyzeCompetitor(deps: {
  aiProvider: AIProvider;
  aiConfigurationRepository: AIConfigurationRepository;
}): AnalyzeCompetitor {
  return async function analyzeCompetitor(input): Promise<CompetitorAnalysis> {
    const config = await deps.aiConfigurationRepository.getByStore(input.projectId);
    const tone = config?.tone ?? DEFAULT_TONE;
    const niche = input.niche ?? "their niche";

    const postsSummary = input.posts.map((p, i) => {
      const metrics = [
        p.metrics.likes !== undefined ? `${p.metrics.likes} likes` : "",
        p.metrics.comments !== undefined ? `${p.metrics.comments} comments` : "",
        p.metrics.plays !== undefined ? `${p.metrics.plays} plays` : "",
      ].filter(Boolean).join(", ");
      return `${i + 1}. ${p.mediaType} | ${p.caption?.slice(0, 200) ?? "(no caption)"} | ${metrics}`;
    }).join("\n");

    const system = `You are a social media competitive analyst for Instagram. Tone: ${tone}.
Analyze the provided competitor posts and return a JSON object only (no markdown) with the following keys:
- summary (string, 2-3 sentences overview of the account's content strategy)
- strengths (array of 3-5 strings)
- weaknesses (array of 2-4 strings)
- contentPatterns (array of 3-5 strings describing repeating formats, hooks, visuals)
- postingStrategy (string, 1-2 sentences on timing/frequency/engagement tactics)
- recommendations (array of 3-5 actionable ideas to beat this competitor)
- hashtags (array of 10-15 niche hashtags the competitor uses or that would work for a similar brand)
- audioSuggestion (string, trending audio style or sound cue)
- bestTimeToPost (string, human-readable like "Tuesday, 11:00 AM EST")
Be concise and strategic. Do not mention that you are an AI.`;

    const user = `Competitor handle: @${input.handle}
Niche: ${niche}
Posts:\n${postsSummary}\n\nAnalyze the content strategy and suggest how to outperform them.`;

    const context = new AIContextBuilder()
      .withSystem(system)
      .withUser(user)
      .withModel(selectModel("competitor-analysis", config?.model).model)
      .withFallback(DEFAULT_DEV_OUTPUT)
      .withOperation("competitor-analysis")
      .withMetadata({ projectId: input.projectId, handle: input.handle, postCount: input.posts.length })
      .build();

    const raw = await deps.aiProvider.complete(context.messages, {
      model: context.model,
      fallback: context.fallback,
    });

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed !== "object" || parsed === null) return parseFallback(raw);
      return parseAnalysis(parsed);
    } catch {
      return parseFallback(raw);
    }
  };
}

const DEFAULT_DEV_OUTPUT = JSON.stringify({
  summary: "This competitor mixes educational carousels, aspirational Reels, and behind-the-scenes posts to build trust and drive saves.",
  strengths: ["Strong hook writing", "Consistent visual branding", "High-save carousel content", "Frequent Reel posting"],
  weaknesses: ["Limited product CTAs", "No clear link-in-bio funnel", "Stories underutilized"],
  contentPatterns: ["How-to carousels", "POV Reels", "Before/after transformations", "Q&A in captions"],
  postingStrategy: "Posts 1-2 Reels and 3-4 carousels per week, optimized for evening engagement.",
  recommendations: ["Create a strong CTA in every post", "Use Reels to tease carousels", "Run a comment-to-DM giveaway", "Add product tags to high-performers"],
  hashtags: ["#smallbusiness", "#behindthescenes", "#satisfying", "#shoplocal", "#musthave"],
  audioSuggestion: "Trending soft-pop / satisfying audio",
  bestTimeToPost: "Tuesday, 7:00 PM EST",
});

function parseAnalysis(item: unknown): CompetitorAnalysis {
  const raw = item as Record<string, unknown>;
  return {
    summary: typeof raw.summary === "string" ? raw.summary : "",
    strengths: parseStringArray(raw.strengths),
    weaknesses: parseStringArray(raw.weaknesses),
    contentPatterns: parseStringArray(raw.contentPatterns),
    postingStrategy: typeof raw.postingStrategy === "string" ? raw.postingStrategy : "",
    recommendations: parseStringArray(raw.recommendations),
    hashtags: parseStringArray(raw.hashtags),
    audioSuggestion: typeof raw.audioSuggestion === "string" ? raw.audioSuggestion : "",
    bestTimeToPost: typeof raw.bestTimeToPost === "string" ? raw.bestTimeToPost : "",
  };
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function parseFallback(raw: string): CompetitorAnalysis {
  return {
    summary: raw.slice(0, 240),
    strengths: ["Consistent posting", "Engaging captions"],
    weaknesses: ["Analysis unavailable — refine inputs"],
    contentPatterns: ["Reels and carousels"],
    postingStrategy: "Post when your audience is most active and test new formats weekly.",
    recommendations: ["Add clearer CTAs", "Engage in comments quickly", "Cross-post Stories"],
    hashtags: ["#trending", "#viral", "#smallbusiness"],
    audioSuggestion: "Trending audio",
    bestTimeToPost: "Weekday, 11:00 AM local time",
  };
}
