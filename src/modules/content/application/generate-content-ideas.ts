import { aiUsageGuard } from "@/modules/ai";
import type { GeneratePostIdeas, GeneratePostIdeasInput, GeneratePostIdeasResult } from "@/modules/ai";
import type { EventBus } from "@/shared/events";
import { ContentIdeasGenerated } from "../domain/events";

export type GenerateContentIdeasInput = GeneratePostIdeasInput;
export type GenerateContentIdeasResult = GeneratePostIdeasResult;

export interface GenerateContentIdeas {
  (input: GenerateContentIdeasInput): Promise<GenerateContentIdeasResult>;
}

export function makeGenerateContentIdeas(deps: {
  generatePostIdeas: GeneratePostIdeas;
  eventBus: EventBus;
  getOrganizationIdByStoreId: (projectId: string) => Promise<string | null>;
}): GenerateContentIdeas {
  return async function generateContentIdeas(input): Promise<GenerateContentIdeasResult> {
    const userId = await deps.getOrganizationIdByStoreId(input.projectId);
    if (userId) {
      await aiUsageGuard.assertAvailable(userId);
    }

    const result = await deps.generatePostIdeas(input);

    await deps.eventBus.publish(
      new ContentIdeasGenerated(input.projectId, {
        projectId: input.projectId,
        userId: userId ?? undefined,
        ideas: result.ideas.map((idea) => idea.title),
        evidence: result.evidence,
        generatedAt: new Date().toISOString(),
      }),
    );

    return result;
  };
}
