import { z } from "zod";
import { Result, ok } from "@/shared/kernel";
import { isEcommerceProvider } from "@/modules/workspaces";
import type { EcommerceProvider } from "@/modules/workspaces";
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

    const existingRecord = await deps.integrations.findEcommerceByStore(input.projectId);
    const existingCreds = existingRecord
      ? await deps.integrations.findCredentialsByStore(input.projectId)
      : null;

    const provider: EcommerceProvider =
      existingCreds?.provider && isEcommerceProvider(existingCreds.provider)
        ? existingCreds.provider
        : "CUSTOM";

    await deps.integrations.upsertEcommerce({
      projectId: input.projectId,
      provider,
      shopDomain: existingCreds?.shopDomain ?? input.platformName,
      accessToken: existingCreds?.accessToken ?? null,
      refreshToken: existingCreds?.refreshToken ?? null,
      scopes: existingRecord?.scopes ?? null,
      metadata: {
        ...(existingCreds?.metadata ?? {}),
        generatedAdapterId: saved.id,
        platformName: input.platformName,
      },
    });

    return ok({ id: saved.id, platformName: saved.platformName });
  };
}
