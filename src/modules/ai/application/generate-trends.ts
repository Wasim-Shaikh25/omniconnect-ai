import type { AIConfigurationRepository, AIProvider } from "./ports";
import type { MediaPost, BestTimeWindow } from "@/modules/analytics/pure";
import type { OrderRecord } from "@/modules/ecommerce";
import { AIContextBuilder } from "./ai-context";
import { selectModel } from "./model-router";
import {
  engagementScore,
  percentileRank,
  topN,
  median,
  bestTimeLabel,
  type ScoredPost,
} from "@/modules/analytics/pure";

export interface GenerateTrendsInput {
  projectId: string;
  niche: string;
  format?: "REEL" | "POST" | "CAROUSEL" | "STORY" | "ANY" | null;
  count?: number;
}

export interface TrendIdea {
  title: string;
  format: string;
  hook: string;
  description: string;
  whyItWorks: string;
  hashtags: string[];
  audioSuggestion: string;
  predictedEngagementScore: number;
  bestTimeToPost: string;
  cta: string;
  predictedRevenue?: number | null;
  suggestedPublishAt?: Date | null;
  basedOnMediaIds?: string[];
}

export interface GenerateTrends {
  (input: GenerateTrendsInput): Promise<TrendIdea[]>;
}

interface TrendSignals {
  predictedEngagementScore: number;
  predictedRevenue: number | null;
  bestTimeToPost: string;
  suggestedPublishAt: Date | null;
  basedOnMediaIds: string[];
}

export interface GenerateTrendsDeps {
  aiProvider: AIProvider;
  aiConfigurationRepository: AIConfigurationRepository;
  getBestTimeToPostForStore: (projectId: string) => Promise<BestTimeWindow[]>;
  listMediaPosts: (projectId: string) => Promise<MediaPost[]>;
  listOrders: (projectId: string, limit?: number) => Promise<OrderRecord[]>;
}

const DEFAULT_TONE = "trendy, authentic, and platform-native";

function toScoredPost(post: MediaPost): ScoredPost | null {
  const i = post.latestInsight;
  if (!i) return null;
  return {
    id: post.id,
    likes: i.likes ?? 0,
    comments: i.comments ?? 0,
    shares: i.shares ?? 0,
    saves: i.saves ?? 0,
    plays: i.plays ?? 0,
    views: i.views ?? 0,
    reach: i.reach ?? 0,
    impressions: i.impressions ?? 0,
  };
}

function computeSignals(
  mediaPosts: MediaPost[],
  orders: OrderRecord[],
  bestWindows: BestTimeWindow[],
  count: number,
): TrendSignals {
  const bestWindow = bestWindows[0];
  const bestTimeToPost = bestTimeLabel(bestWindow);
  const suggestedPublishAt = bestWindow ? nextOccurrence(bestWindow.dayOfWeek, bestWindow.hour) : null;

  const scored = mediaPosts
    .map((post) => ({ post, scoredPost: toScoredPost(post) }))
    .filter((item): item is { post: MediaPost; scoredPost: ScoredPost } => item.scoredPost !== null)
    .map((item) => ({ post: item.post, score: engagementScore(item.scoredPost) }));

  const topScored = topN(scored, (item) => item.score, count);
  const allScores = scored.map((item) => item.score);
  const medianTopScore = topScored.length > 0 ? median(topScored.map((item) => item.score)) : 0;
  const predictedEngagementScore =
    allScores.length > 0 ? Math.min(100, Math.max(0, percentileRank(allScores, medianTopScore))) : 50;

  const revenues = orders.map((o) => o.total).filter((t): t is number => t !== null);
  const predictedRevenue = revenues.length > 0 ? Math.round(median(revenues) * 100) / 100 : null;

  return {
    predictedEngagementScore,
    predictedRevenue,
    bestTimeToPost,
    suggestedPublishAt,
    basedOnMediaIds: topScored.map((item) => item.post.id).slice(0, count),
  };
}

function nextOccurrence(dayOfWeek: string, hour: number): Date {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const targetIndex = days.indexOf(dayOfWeek);
  const now = new Date();
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0));
  const currentDay = current.getUTCDay();
  const diff = targetIndex === -1 ? 0 : (targetIndex - currentDay + 7) % 7;
  current.setUTCDate(current.getUTCDate() + diff);
  if (diff === 0 && current.getTime() < now.getTime()) {
    current.setUTCDate(current.getUTCDate() + 7);
  }
  return current;
}

export function makeGenerateTrends(deps: GenerateTrendsDeps): GenerateTrends {
  return async function generateTrends(input): Promise<TrendIdea[]> {
    const config = await deps.aiConfigurationRepository.getByStore(input.projectId);
    const tone = config?.tone ?? DEFAULT_TONE;
    const niche = input.niche || "eCommerce";
    const format = input.format ?? "ANY";
    const count = Math.min(Math.max(input.count ?? 5, 1), 10);

    const [bestWindows, mediaPosts, orders] = await Promise.all([
      deps.getBestTimeToPostForStore(input.projectId).catch(() => [] as BestTimeWindow[]),
      deps.listMediaPosts(input.projectId).catch(() => [] as MediaPost[]),
      deps.listOrders(input.projectId, 100).catch(() => [] as OrderRecord[]),
    ]);

    const signals = computeSignals(mediaPosts, orders, bestWindows, count);

    const system = `You are a social media trend analyst for Instagram. Tone: ${tone}.
Niche: ${niche}. Format focus: ${format}.
The following numbers are pre-computed from the account's own data and are final — do not invent different numbers:
- predictedEngagementScore: ${signals.predictedEngagementScore} (0-100)
- predictedRevenue: ${signals.predictedRevenue ?? "n/a"}
- bestTimeToPost: ${signals.bestTimeToPost}
- basedOnMediaIds: ${signals.basedOnMediaIds.join(", ") || "n/a"}

Return a JSON array of ${count} current, high-performing content ideas that are trending or likely to trend on Instagram right now.
For each idea return:
- title (string, punchy idea name)
- format (string, one of Reel/Post/Carousel/Story)
- hook (string, scroll-stopping first line)
- description (string, 2-3 sentences describing the video/post)
- whyItWorks (string, 1 sentence explaining the trend mechanic)
- hashtags (array of 10-15 niche hashtags, no banned/spam ones)
- audioSuggestion (string, trending audio style or sound cue)
- predictedEngagementScore (number 0-100)
- bestTimeToPost (string, human-readable like "Tuesday, 11:00 AM EST")
- cta (string, a short call-to-action)
Return only a JSON array. Do not wrap in markdown. You may omit the numeric fields; they will be replaced with the pre-computed values above.`;

    const user = `Niche: ${niche}. Format: ${format}.`;
    const context = new AIContextBuilder()
      .withSystem(system)
      .withUser(user)
      .withModel(selectModel("trends", config?.model).model)
      .withFallback(DEFAULT_DEV_OUTPUT)
      .withOperation("trends")
      .withMetadata({ projectId: input.projectId, niche, format })
      .build();

    const raw = await deps.aiProvider.complete(context.messages, {
      model: context.model,
      fallback: context.fallback,
      operation: context.operation,
      metadata: context.metadata,
    });

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [parseSingleTrend(raw, format, signals)];
      }
      return parsed
        .map((item) => parseTrend(item, format, signals))
        .filter((t): t is TrendIdea => t !== null)
        .slice(0, count);
    } catch {
      return [parseSingleTrend(raw, format, signals)];
    }
  };
}

const DEFAULT_DEV_OUTPUT = JSON.stringify([
  {
    title: "Behind-the-scenes packing reel",
    format: "REEL",
    hook: "POV: your order is being packed with extra love ✨",
    description:
      "A fast-cut 15-second Reel showing an order being packed, sealed, and decorated. Add a trending lo-fi or soft-pop audio cue.",
    whyItWorks: "Behind-the-scenes content builds trust and satisfies the 'satisfying' content craving.",
    hashtags: ["#behindthescenes", "#smallbusiness", "#packingorders", "#satisfying", "#shoplocal"],
    audioSuggestion: "Trending soft-pop / ASMR packing sound",
    predictedEngagementScore: 78,
    bestTimeToPost: "Tuesday, 11:00 AM EST",
    cta: "Tap the link in bio to shop the drop.",
  },
  {
    title: "This or that carousel",
    format: "CAROUSEL",
    hook: "Which vibe are you today? A or B 👇",
    description:
      "A 3-slide carousel: two product variations, a poll in the caption, and a final slide with a shoppable link.",
    whyItWorks: "Poll-style carousels drive saves and comments because people love giving opinions.",
    hashtags: ["#thisorthat", "#poll", "#shopping", "#musthave", "#styleinspo"],
    audioSuggestion: "Light, upbeat trending audio",
    predictedEngagementScore: 72,
    bestTimeToPost: "Thursday, 7:00 PM EST",
    cta: "Comment A or B for a surprise DM discount.",
  },
]);

function parseTrend(item: unknown, requestedFormat: string, signals: TrendSignals): TrendIdea | null {
  if (typeof item !== "object" || item === null) return null;
  const raw = item as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title : "Trend idea";
  const format = typeof raw.format === "string" ? raw.format : requestedFormat;
  const hook = typeof raw.hook === "string" ? raw.hook : "";
  const description = typeof raw.description === "string" ? raw.description : "";
  const whyItWorks = typeof raw.whyItWorks === "string" ? raw.whyItWorks : "";
  const hashtags = Array.isArray(raw.hashtags)
    ? raw.hashtags.filter((h): h is string => typeof h === "string")
    : [];
  const audioSuggestion = typeof raw.audioSuggestion === "string" ? raw.audioSuggestion : "";
  const cta = typeof raw.cta === "string" ? raw.cta : "";
  const suggestedPublishAt =
    typeof raw.suggestedPublishAt === "string" ? new Date(raw.suggestedPublishAt) : signals.suggestedPublishAt;

  return {
    title,
    format,
    hook,
    description,
    whyItWorks,
    hashtags,
    audioSuggestion,
    predictedEngagementScore: signals.predictedEngagementScore,
    bestTimeToPost: signals.bestTimeToPost,
    cta,
    predictedRevenue: signals.predictedRevenue,
    suggestedPublishAt,
    basedOnMediaIds: signals.basedOnMediaIds,
  };
}

function parseSingleTrend(raw: string, requestedFormat: string, signals: TrendSignals): TrendIdea {
  return {
    title: "Trending idea",
    format: requestedFormat,
    hook: raw.slice(0, 120),
    description: raw,
    whyItWorks: "AI returned unstructured output; refine the niche or try again.",
    hashtags: ["#trending", "#viral", "#smallbusiness"],
    audioSuggestion: "Trending audio",
    predictedEngagementScore: signals.predictedEngagementScore,
    bestTimeToPost: signals.bestTimeToPost,
    cta: "Tap the link in bio.",
    predictedRevenue: signals.predictedRevenue,
    suggestedPublishAt: signals.suggestedPublishAt,
    basedOnMediaIds: signals.basedOnMediaIds,
  };
}
