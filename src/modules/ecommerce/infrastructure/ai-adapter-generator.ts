import { aiProvider } from "@/modules/ai/server";
import { env } from "@/shared/config";
import { makeOpenRouterAdapterGenerator } from "./openrouter-adapter-generator";

export const adapterConfigGenerator = makeOpenRouterAdapterGenerator({
  aiProvider,
  model: env.AI_DEFAULT_MODEL,
});
