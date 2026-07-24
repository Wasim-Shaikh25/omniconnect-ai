"use server";

import { revalidatePath } from "next/cache";
import { requireRole, ForbiddenError } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { connectMeta } from "../infrastructure/container";
import { connectMetaSchema } from "../application/connect-meta";
import {
  simulateInbound,
  simulateInboundSchema,
} from "../application/simulate-inbound";

export interface MetaActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

/** Ensures the current user's organization owns the target store. */
async function assertStoreInOrg(
  organizationId: string | null,
  storeId: string,
): Promise<boolean> {
  if (!organizationId) return false;
  const overview =
    await organizationQueries.getOrganizationOverview(organizationId);
  return overview?.stores.some((s) => s.id === storeId) ?? false;
}

export async function connectMetaAction(
  _prev: MetaActionState,
  formData: FormData,
): Promise<MetaActionState> {
  const user = await requireRole("STORE_OWNER");

  const parsed = connectMetaSchema.safeParse({
    storeId: formData.get("storeId"),
    channel: formData.get("channel") || undefined,
    accountId: formData.get("accountId"),
    accessToken: formData.get("accessToken") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await connectMeta(parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/stores/${parsed.data.storeId}`);
  return { ok: true, message: `${parsed.data.channel} connected.` };
}

export async function simulateInboundAction(
  _prev: MetaActionState,
  formData: FormData,
): Promise<MetaActionState> {
  const user = await requireRole("STORE_OWNER");

  const parsed = simulateInboundSchema.safeParse({
    storeId: formData.get("storeId"),
    channel: formData.get("channel") || undefined,
    kind: formData.get("kind") || undefined,
    externalUserId: formData.get("externalUserId"),
    username: formData.get("username") || undefined,
    text: formData.get("text") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  await simulateInbound(parsed.data);

  revalidatePath(`/stores/${parsed.data.storeId}`);
  return { ok: true, message: `Simulated ${parsed.data.kind} event.` };
}
