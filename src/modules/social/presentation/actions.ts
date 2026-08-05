"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/workspaces";
import { socialAutomationService, socialQueries } from "../infrastructure/container";

const replySchema = z.object({
  commentId: z.string().min(1),
  projectId: z.string().min(1),
  replyText: z.string().min(1).max(1000),
});
const hideSchema = z.object({
  commentId: z.string().min(1),
  projectId: z.string().min(1),
  hidden: z.enum(["true", "false"]),
});

async function requireStoreAccess(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { user: null, ok: false };
  const overview = user.userId
    ? await organizationQueries.getOrganizationOverview(user.userId)
    : null;
  const store = overview?.stores.find((s) => s.id === projectId);
  if (!store) return { user, ok: false };
  return { user, ok: true };
}

export async function listSocialCommentsAction(projectId: string) {
  const access = await requireStoreAccess(projectId);
  if (!access.ok) return { comments: [], mentions: [] };
  const [comments, mentions] = await Promise.all([
    socialQueries.listComments(projectId),
    socialQueries.listMentions(projectId),
  ]);
  return { comments, mentions };
}

export async function replyToCommentAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = replySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const access = await requireStoreAccess(parsed.data.projectId);
  if (!access.ok) return { ok: false, error: "Not authorized" };

  await socialAutomationService.replyToComment(
    parsed.data.commentId,
    parsed.data.projectId,
    parsed.data.replyText,
  );
  revalidatePath(`/stores/${parsed.data.projectId}/commerce/comments`);
  return { ok: true };
}

export async function toggleCommentHiddenAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = hideSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const access = await requireStoreAccess(parsed.data.projectId);
  if (!access.ok) return { ok: false, error: "Not authorized" };

  await socialAutomationService.toggleHidden(
    parsed.data.commentId,
    parsed.data.projectId,
    parsed.data.hidden === "true",
  );
  revalidatePath(`/stores/${parsed.data.projectId}/commerce/comments`);
  return { ok: true };
}
