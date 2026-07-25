"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { conversationCommands } from "../infrastructure/container";

export interface ConversationActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

async function assertStoreInOrg(
  organizationId: string | null,
  storeId: string,
): Promise<boolean> {
  if (!organizationId) return false;
  const overview = await organizationQueries.getOrganizationOverview(
    organizationId,
  );
  return overview?.stores.some((s) => s.id === storeId) ?? false;
}

const takeoverSchema = z.object({
  storeId: z.string().min(1),
  conversationId: z.string().min(1),
});

export async function takeOverConversationAction(
  _prev: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  const user = await requireRole("STAFF");
  const parsed = takeoverSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { storeId, conversationId } = parsed.data;
  if (!(await assertStoreInOrg(user.organizationId, storeId))) {
    return { error: "Store not found in your organization." };
  }

  await conversationCommands.takeOver({
    conversationId,
    humanUserId: user.id,
  });

  revalidatePath(`/stores/${storeId}/conversations`);
  revalidatePath(`/stores/${storeId}/conversations/${conversationId}`);
  return { ok: true, message: "Conversation taken over." };
}

export async function resumeAIConversationAction(
  _prev: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  const user = await requireRole("STAFF");
  const parsed = takeoverSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { storeId, conversationId } = parsed.data;
  if (!(await assertStoreInOrg(user.organizationId, storeId))) {
    return { error: "Store not found in your organization." };
  }

  await conversationCommands.resumeAI(conversationId);

  revalidatePath(`/stores/${storeId}/conversations`);
  revalidatePath(`/stores/${storeId}/conversations/${conversationId}`);
  return { ok: true, message: "AI resumed." };
}
