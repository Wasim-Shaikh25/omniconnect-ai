"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, requireRole, ForbiddenError } from "@/modules/auth";
import { tenantGuard } from "@/modules/workspaces";
import { paginatedResult, toSkip } from "@/shared/kernel";
import type { PaginationInput } from "@/shared/kernel";
import { conversationCommands, sendMessage, unifiedInboxQueries } from "../infrastructure/container";
import type { UnifiedInboxFilter } from "../application/unified-inbox";

export interface ConversationActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

export async function getUnifiedInboxAction(
  filter?: UnifiedInboxFilter,
  pagination?: PaginationInput,
) {
  const user = await getCurrentUser();
  if (!user || !user.userId) {
    return { items: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
  const all = await unifiedInboxQueries(user, filter);
  if (!pagination) {
    return { items: all, total: all.length, page: 1, limit: all.length, totalPages: 1 };
  }
  const skip = toSkip(pagination);
  const items = all.slice(skip, skip + pagination.limit);
  return paginatedResult(items, all.length, pagination);
}

const takeoverSchema = z.object({
  projectId: z.string().min(1),
  conversationId: z.string().min(1),
});

export async function takeOverConversationAction(
  _prev: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  const user = await requireRole("USER");
  const parsed = takeoverSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { projectId, conversationId } = parsed.data;
  try {
    await tenantGuard.assertStoreAccess(user, projectId);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { error: "Store not found in your organization." };
    }
    throw error;
  }

  await conversationCommands.takeOver({
    conversationId,
    projectId,
    humanUserId: user.id,
  });

  revalidatePath("/inbox");
  revalidatePath(`/stores/${projectId}/conversations`);
  revalidatePath(`/stores/${projectId}/conversations/${conversationId}`);
  return { ok: true, message: "Conversation taken over." };
}

export async function resumeAIConversationAction(
  _prev: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  const user = await requireRole("USER");
  const parsed = takeoverSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { projectId, conversationId } = parsed.data;
  try {
    await tenantGuard.assertStoreAccess(user, projectId);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { error: "Store not found in your organization." };
    }
    throw error;
  }

  await conversationCommands.resumeAI({ conversationId, projectId });

  revalidatePath("/inbox");
  revalidatePath(`/stores/${projectId}/conversations`);
  revalidatePath(`/stores/${projectId}/conversations/${conversationId}`);
  return { ok: true, message: "AI resumed." };
}

const sendMessageSchema = z.object({
  projectId: z.string().min(1),
  conversationId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

export async function sendConversationMessageAction(
  _prev: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  const user = await requireRole("USER");
  const parsed = sendMessageSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { projectId, conversationId, content } = parsed.data;
  try {
    await tenantGuard.assertStoreAccess(user, projectId);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { error: "Store not found in your organization." };
    }
    throw error;
  }

  try {
    await sendMessage({
      conversationId,
      projectId,
      sender: "HUMAN",
      content,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message";
    return { error: message };
  }

  revalidatePath(`/stores/${projectId}/conversations/${conversationId}`);
  revalidatePath(`/stores/${projectId}/conversations`);
  revalidatePath("/inbox");
  return { ok: true, message: "Message sent." };
}
