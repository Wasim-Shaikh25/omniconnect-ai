import { z } from "zod";
import { Result, ok } from "@/shared/kernel";
import type { AdapterConfigMapping } from "../domain/adapter-config";
import type { GeneratedAdapterRepository, IntegrationRepository } from "./ports";

export const saveGeneratedAdapterSchema = z.object({
  projectId: z.string().min(1),
  platformName: z.string().min(1),
  config: z.unknown(),
  credentials: z.record(z.string()),
});

export type SaveGeneratedAdapterInput = z.infer<
  typeof saveGeneratedAdapterSchema
>;

export class SaveGeneratedAdapterError extends Error {}

export function makeSaveGeneratedAdapter(deps: {
  generatedAdapters: GeneratedAdapterRepository;
  integrations: IntegrationRepository;
}) {
  return async function saveGeneratedAdapter(
    raw: SaveGeneratedAdapterInput,
  ): Promise<Result<{ id: string; platformName: string }, SaveGeneratedAdapterError>> {
    const input = saveGeneratedAdapterSchema.parse(raw);

    const saved = await deps.generatedAdapters.upsert({
      projectId: input.projectId,
      platformName: input.platformName,
      config: input.config as AdapterConfigMapping,
      credentials: input.credentials,
    });

    await deps.integrations.upsertEcommerce({
      projectId: input.projectId,
      provider: "CUSTOM",
      shopDomain: input.platformName,
      accessToken: null,
      scopes: null,
      metadata: { generatedAdapterId: saved.id, platformName: input.platformName },
    });

    return ok({ id: saved.id, platformName: saved.platformName });
  };
}
