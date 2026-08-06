"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, requireVerifiedEmail } from "@/modules/auth";
import { organizationQueries } from "@/modules/workspaces";
import { aiConfigurationRepository, chatAssistant } from "../infrastructure/container";
import { aiUsageGuard } from "../application/usage-guard";
import type { ChatSessionRecord } from "../application/ports";

export type ChatActionState =
  | { error?: string; ok?: boolean; message?: string; session?: ChatSessionRecord }
  | undefined;

const createSessionSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().optional(),
});

const sendMessageSchema = z.object({
  sessionId: z.string().min(1),
  projectId: z.string().min(1),
  content: z.string().min(1).max(4000),
});

const renameSessionSchema = z.object({
  sessionId: z.string().min(1),
  title: z.string().min(1).max(120),
});

const idSchema = z.object({
  id: z.string().min(1),
});

async function assertStoreInOrg(userId: string, projectId: string): Promise<boolean> {
  const overview = await organizationQueries.getOrganizationOverview(userId);
  return overview?.stores.some((s) => s.id === projectId) ?? false;
}

export async function createChatSessionAction(
  _prev: ChatActionState,
  formData: FormData,
): Promise<ChatActionState> {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { error: "Unauthorized" };
  await requireVerifiedEmail(user);

  const parsed = createSessionSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await aiUsageGuard.assertAvailable(user.userId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "AI quota exceeded" };
  }

  const session = await chatAssistant.createSession({
    projectId: parsed.data.projectId,
    userId: user.userId,
    title: parsed.data.title,
  });
  revalidatePath("/chat");
  return { ok: true, session };
}

export async function listChatSessionsAction(projectId: string): Promise<{
  items: ChatSessionRecord[];
}> {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { items: [] };

  if (!(await assertStoreInOrg(user.userId, projectId))) {
    return { items: [] };
  }

  const items = await chatAssistant.listSessions(projectId);
  return { items };
}

export async function getChatSessionAction(sessionId: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return null;

  const session = await chatAssistant.getSession(sessionId);
  if (!session) return null;

  if (!(await assertStoreInOrg(user.userId, session.projectId))) {
    return null;
  }

  return session;
}

export async function sendChatMessageAction(
  _prev: ChatActionState,
  formData: FormData,
): Promise<ChatActionState> {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { error: "Unauthorized" };
  await requireVerifiedEmail(user);

  const parsed = sendMessageSchema.safeParse({
    sessionId: formData.get("sessionId"),
    projectId: formData.get("projectId"),
    content: formData.get("content"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await aiUsageGuard.assertAvailable(user.userId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "AI quota exceeded" };
  }

  const config = await aiConfigurationRepository.getOrCreateDefault(parsed.data.projectId);

  try {
    const result = await chatAssistant.sendMessage({
      sessionId: parsed.data.sessionId,
      projectId: parsed.data.projectId,
      userId: user.userId,
      content: parsed.data.content,
      config,
      brandName: user.name ?? undefined,
    });
    revalidatePath("/chat");
    return { ok: true, message: result.message.content };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to send message" };
  }
}

export async function renameChatSessionAction(
  _prev: ChatActionState,
  formData: FormData,
): Promise<ChatActionState> {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { error: "Unauthorized" };

  const parsed = renameSessionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    title: formData.get("title"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await chatAssistant.getSession(parsed.data.sessionId);
  if (!session) return { error: "Session not found" };

  if (!(await assertStoreInOrg(user.userId, session.projectId))) {
    return { error: "Store not found in your organization." };
  }

  const updated = await chatAssistant.renameSession(parsed.data.sessionId, parsed.data.title);
  if (!updated) return { error: "Session not found" };
  revalidatePath("/chat");
  return { ok: true, session: updated };
}

export async function deleteChatSessionAction(
  _prev: ChatActionState,
  formData: FormData,
): Promise<ChatActionState> {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { error: "Unauthorized" };

  const parsed = idSchema.safeParse({ id: formData.get("sessionId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await chatAssistant.getSession(parsed.data.id);
  if (!session) return { error: "Session not found" };

  if (!(await assertStoreInOrg(user.userId, session.projectId))) {
    return { error: "Store not found in your organization." };
  }

  await chatAssistant.deleteSession(parsed.data.id, session.projectId);
  revalidatePath("/chat");
  return { ok: true };
}
