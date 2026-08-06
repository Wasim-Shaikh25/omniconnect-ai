import type { AIProvider } from "@/modules/ai";
import { env } from "@/shared/config";
import { makeOpenRouterAdapterGenerator } from "./openrouter-adapter-generator";

/**
 * Lazy-load the AI provider to avoid a module-initialization cycle:
 * `ecommerce` -> `ai/server` -> `ai/container` -> `ecommerce`.
 */
async function getAIProvider(): Promise<Pick<AIProvider, "complete">> {
  const mod = await import("@/modules/ai/server");
  return mod.aiProvider;
}

let generator: ReturnType<typeof makeOpenRouterAdapterGenerator> | null = null;

async function getGenerator(): Promise<ReturnType<typeof makeOpenRouterAdapterGenerator>> {
  if (generator) return generator;
  const aiProvider = await getAIProvider();
  generator = makeOpenRouterAdapterGenerator({
    aiProvider,
    model: env.AI_DEFAULT_MODEL,
  });
  return generator;
}

export const adapterConfigGenerator = {
  async generate(input: {
    platformName: string;
    apiDocs: string;
    userId: string;
    projectId?: string | null;
  }) {
    const gen = await getGenerator();
    return gen.generate(input);
  },
};
