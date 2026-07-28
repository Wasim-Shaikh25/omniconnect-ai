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
  getOrganizationIdByStoreId: (storeId: string) => Promise<string | null>;
}): GenerateContentIdeas {
  return async function generateContentIdeas(input): Promise<GenerateContentIdeasResult> {
    const organizationId = await deps.getOrganizationIdByStoreId(input.storeId);
    if (organizationId) {
      await aiUsageGuard.assertAvailable(organizationId);
    }

    const result = await deps.generatePostIdeas(input);

    await deps.eventBus.publish(
      new ContentIdeasGenerated(input.storeId, {
        storeId: input.storeId,
        organizationId: organizationId ?? undefined,
        ideas: result.ideas.map((idea) => idea.title),
        evidence: result.evidence,
        generatedAt: new Date().toISOString(),
      }),
    );

    return result;
  };
}
