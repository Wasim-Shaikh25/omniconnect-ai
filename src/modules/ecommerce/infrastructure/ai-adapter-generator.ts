import { aiProvider } from "@/modules/ai/ai-services";
import { env } from "@/shared/config";
import { makeOpenRouterAdapterGenerator } from "./openrouter-adapter-generator";

let generator: ReturnType<typeof makeOpenRouterAdapterGenerator> | null = null;

function getGenerator(): ReturnType<typeof makeOpenRouterAdapterGenerator> {
  if (!generator) {
    generator = makeOpenRouterAdapterGenerator({
      aiProvider,
      model: env.AI_DEFAULT_MODEL,
    });
  }
  return generator;
}

export const adapterConfigGenerator = {
  async generate(input: {
    platformName: string;
    apiDocs: string;
    userId: string;
    projectId?: string | null;
  }) {
    return getGenerator().generate(input);
  },
};
