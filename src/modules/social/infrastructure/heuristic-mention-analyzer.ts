import type { MentionSentimentAnalyzer } from "../application/mention-service";

function countMatches(text: string, signals: readonly string[]): number {
  return signals.reduce((count, signal) => (text.includes(signal) ? count + 1 : count), 0);
}

export const heuristicMentionSentimentAnalyzer: MentionSentimentAnalyzer = {
  async analyze(caption) {
    const text = (caption ?? "").toLowerCase();

    const positiveSignals = [
      "love",
      "great",
      "awesome",
      "amazing",
      "best",
      "good",
      "happy",
      "thank",
      "thanks",
      "nice",
      "excellent",
      "beautiful",
      "perfect",
      "fantastic",
      "wonderful",
    ] as const;

    const negativeSignals = [
      "hate",
      "bad",
      "worst",
      "terrible",
      "awful",
      "disappointed",
      "angry",
      "poor",
      "broken",
      "never",
      "sucks",
      "horrible",
      "disgusting",
      "frustrated",
      "scam",
    ] as const;

    const purchaseSignals = [
      "buy",
      "order",
      "price",
      "discount",
      "coupon",
      "purchase",
      "link",
      "shop",
      "where",
      "how much",
    ] as const;

    const questionSignals = ["?", "how", "what", "where", "when", "which", "who"] as const;

    const positives = countMatches(text, positiveSignals);
    const negatives = countMatches(text, negativeSignals);
    const purchases = countMatches(text, purchaseSignals);
    const questions = countMatches(text, questionSignals);

    if (positives > 0 && negatives > 0) {
      return { sentiment: "MIXED", confidence: 0.6, summary: "Mixed positive and negative signals" };
    }
    if (negatives > 0) {
      return { sentiment: "NEGATIVE", confidence: 0.75, summary: "Negative language detected" };
    }
    if (positives > 0 || purchases > 0) {
      return {
        sentiment: "POSITIVE",
        confidence: 0.7,
        summary: purchases > 0 ? "Positive or purchase intent detected" : "Positive language detected",
      };
    }
    if (questions > 0) {
      return { sentiment: "NEUTRAL", confidence: 0.6, summary: "Question or informational mention" };
    }
    return { sentiment: "NEUTRAL", confidence: 0.5, summary: "Neutral mention" };
  },
};
