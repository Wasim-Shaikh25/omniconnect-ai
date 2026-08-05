import { aiProvider } from "@/modules/ai/server";
import { PrismaSocialMentionRepository } from "./repositories";
import { makeMentionService } from "../application/mention-service";
import { makeMockBrandMentionSource } from "./mock-mention-source";
import { makeOpenRouterMentionSentimentAnalyzer } from "./open-router-mention-analyzer";

const mentions = new PrismaSocialMentionRepository();
const mentionSource = makeMockBrandMentionSource();
const mentionAnalyzer = makeOpenRouterMentionSentimentAnalyzer({ aiProvider });

export const mentionService = makeMentionService({
  mentions,
  source: mentionSource,
  analyzer: mentionAnalyzer,
});
