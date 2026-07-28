"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, requireRole, ForbiddenError } from "@/modules/auth";
import { tenantGuard } from "@/modules/organizations";
import { conversationCommands, unifiedInboxQueries } from "../infrastructure/container";
import type { UnifiedInboxFilter } from "../application/unified-inbox";

export interface ConversationActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

export async function getUnifiedInboxAction(filter?: UnifiedInboxFilter) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { items: [] };
  const items = await unifiedInboxQueries(user, filter);
  return { items };
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
  try {
    await tenantGuard.assertStoreAccess(user, storeId);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { error: "Store not found in your organization." };
    }
    throw error;
  }

  await conversationCommands.takeOver({
    conversationId,
    storeId,
    humanUserId: user.id,
  });

  revalidatePath("/inbox");
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
  try {
    await tenantGuard.assertStoreAccess(user, storeId);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { error: "Store not found in your organization." };
    }
    throw error;
  }

  await conversationCommands.resumeAI({ conversationId, storeId });

  revalidatePath("/inbox");
  revalidatePath(`/stores/${storeId}/conversations`);
  revalidatePath(`/stores/${storeId}/conversations/${conversationId}`);
  return { ok: true, message: "AI resumed." };
}
