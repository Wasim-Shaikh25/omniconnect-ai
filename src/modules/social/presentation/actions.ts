"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { socialAutomationService, socialQueries } from "../infrastructure/container";

const replySchema = z.object({
  commentId: z.string().min(1),
  storeId: z.string().min(1),
  replyText: z.string().min(1).max(1000),
});
const hideSchema = z.object({
  commentId: z.string().min(1),
  storeId: z.string().min(1),
  hidden: z.enum(["true", "false"]),
});

async function requireStoreAccess(storeId: string) {
  const user = await getCurrentUser();
  if (!user) return { user: null, ok: false };
  const overview = user.organizationId
    ? await organizationQueries.getOrganizationOverview(user.organizationId)
    : null;
  const store = overview?.stores.find((s) => s.id === storeId);
  if (!store) return { user, ok: false };
  return { user, ok: true };
}

export async function listSocialCommentsAction(storeId: string) {
  const access = await requireStoreAccess(storeId);
  if (!access.ok) return { comments: [], mentions: [] };
  const [comments, mentions] = await Promise.all([
    socialQueries.listComments(storeId),
    socialQueries.listMentions(storeId),
  ]);
  return { comments, mentions };
}

export async function replyToCommentAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = replySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const access = await requireStoreAccess(parsed.data.storeId);
  if (!access.ok) return { ok: false, error: "Not authorized" };

  await socialAutomationService.replyToComment(
    parsed.data.commentId,
    parsed.data.storeId,
    parsed.data.replyText,
  );
  revalidatePath(`/stores/${parsed.data.storeId}/commerce/comments`);
  return { ok: true };
}

export async function toggleCommentHiddenAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = hideSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const access = await requireStoreAccess(parsed.data.storeId);
  if (!access.ok) return { ok: false, error: "Not authorized" };

  await socialAutomationService.toggleHidden(
    parsed.data.commentId,
    parsed.data.storeId,
    parsed.data.hidden === "true",
  );
  revalidatePath(`/stores/${parsed.data.storeId}/commerce/comments`);
  return { ok: true };
}
