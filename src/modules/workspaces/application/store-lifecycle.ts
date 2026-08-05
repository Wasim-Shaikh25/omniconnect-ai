import { z } from "zod";
import type { StoreRepository } from "./ports";
import { EcommerceProvider, isEcommerceProvider } from "../domain/provider";
import { Result, ok, err } from "@/shared/kernel";

export const updateStoreSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  provider: z.string().optional(),
  domain: z.string().max(255).optional().nullable(),
});

export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;

export interface StoreLifecycleDependencies {
  stores: StoreRepository;
}

export function makeUpdateStore(deps: StoreLifecycleDependencies) {
  return async function updateStore(
    input: UpdateStoreInput,
  ): Promise<Result<import("./ports").StoreRecord, Error>> {
    const parsed = updateStoreSchema.safeParse(input);
    if (!parsed.success) {
      return err(new Error(parsed.error.issues[0]?.message ?? "Invalid input"));
    }

    const update: {
      name?: string;
      provider?: EcommerceProvider;
      domain?: string | null;
    } = {};
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.provider !== undefined) {
      if (!isEcommerceProvider(parsed.data.provider)) {
        return err(new Error("Invalid provider"));
      }
      update.provider = parsed.data.provider;
    }
    if (parsed.data.domain !== undefined) update.domain = parsed.data.domain ?? null;

    const store = await deps.stores.update(parsed.data.projectId, update);
    if (!store) return err(new Error("Store not found"));
    return ok(store);
  };
}

export function makeArchiveStore(deps: StoreLifecycleDependencies) {
  return async function archiveStore(
    projectId: string,
  ): Promise<Result<import("./ports").StoreRecord, Error>> {
    const store = await deps.stores.archive(projectId);
    if (!store) return err(new Error("Store not found"));
    return ok(store);
  };
}

export function makeRestoreStore(deps: StoreLifecycleDependencies) {
  return async function restoreStore(
    projectId: string,
  ): Promise<Result<import("./ports").StoreRecord, Error>> {
    const store = await deps.stores.restore(projectId);
    if (!store) return err(new Error("Store not found"));
    return ok(store);
  };
}

export function makeDeleteStore(deps: StoreLifecycleDependencies) {
  return async function deleteStore(
    projectId: string,
  ): Promise<Result<import("./ports").StoreRecord, Error>> {
    const store = await deps.stores.delete(projectId);
    if (!store) return err(new Error("Store not found"));
    return ok(store);
  };
}
