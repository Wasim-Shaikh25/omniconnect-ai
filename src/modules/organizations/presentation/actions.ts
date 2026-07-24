"use server";

import { revalidatePath } from "next/cache";
import { requireRole, ForbiddenError } from "@/modules/auth";
import { createStore } from "../infrastructure/container";
import { createStoreSchema } from "../application/create-store";

export interface StoreActionState {
  error?: string;
  ok?: boolean;
}

export async function createStoreAction(
  _prev: StoreActionState,
  formData: FormData,
): Promise<StoreActionState> {
  const user = await requireRole("STORE_OWNER");
  if (!user.organizationId) {
    return { error: "No organization is linked to your account yet." };
  }

  const parsed = createStoreSchema.safeParse({
    organizationId: user.organizationId,
    name: formData.get("name"),
    provider: formData.get("provider") || undefined,
    domain: formData.get("domain") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const result = await createStore(parsed.data);
    if (!result.ok) return { error: result.error.message };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath("/stores");
  return { ok: true };
}
