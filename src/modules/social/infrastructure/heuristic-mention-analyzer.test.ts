import { describe, it, expect } from "vitest";
import { heuristicMentionSentimentAnalyzer } from "./heuristic-mention-analyzer";

describe("heuristicMentionSentimentAnalyzer", () => {
  it("classifies positive captions", async () => {
    const result = await heuristicMentionSentimentAnalyzer.analyze("Love this brand, amazing quality!");
    expect(result.sentiment).toBe("POSITIVE");
  });

  it("classifies negative captions", async () => {
    const result = await heuristicMentionSentimentAnalyzer.analyze("Worst experience ever, never buying again.");
    expect(result.sentiment).toBe("NEGATIVE");
  });

  it("classifies mixed captions", async () => {
    const result = await heuristicMentionSentimentAnalyzer.analyze("Love the product but terrible shipping.");
    expect(result.sentiment).toBe("MIXED");
  });

  it("classifies questions as neutral", async () => {
    const result = await heuristicMentionSentimentAnalyzer.analyze("When is the next drop?");
    expect(result.sentiment).toBe("NEUTRAL");
  });

  it("classifies empty captions as neutral", async () => {
    const result = await heuristicMentionSentimentAnalyzer.analyze("");
    expect(result.sentiment).toBe("NEUTRAL");
  });
});
