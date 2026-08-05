"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStoreAccess } from "@/modules/workspaces";
import { mentionService } from "../infrastructure/mention-container";

const projectIdSchema = z.string().min(1);

export async function syncMentionsAction(
  projectId: string,
): Promise<{ ok: boolean; count?: number; error?: string }> {
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await requireStoreAccess(parsed.data);
  } catch {
    return { ok: false, error: "Not authorized" };
  }

  try {
    const count = await mentionService.syncMentions(parsed.data);
    revalidatePath(`/stores/${parsed.data}/analytics/mentions`);
    return { ok: true, count };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Sync failed" };
  }
}

export async function listMentionsWithSentimentAction(projectId: string): Promise<{
  mentions: Awaited<ReturnType<typeof mentionService.listMentionsWithSentiment>>;
  error?: string;
}> {
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) {
    return { mentions: [], error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await requireStoreAccess(parsed.data);
  } catch {
    return { mentions: [], error: "Not authorized" };
  }

  try {
    const mentions = await mentionService.listMentionsWithSentiment(parsed.data);
    return { mentions };
  } catch (error) {
    return { mentions: [], error: error instanceof Error ? error.message : "Could not load mentions" };
  }
}
