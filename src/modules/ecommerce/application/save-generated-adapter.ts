import { z } from "zod";
import { Result, ok } from "@/shared/kernel";
import type { AdapterConfigMapping } from "../domain/adapter-config";
import type { GeneratedAdapterRepository } from "./ports";

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

    return ok({ id: saved.id, platformName: saved.platformName });
  };
}
