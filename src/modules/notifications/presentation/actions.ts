"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/modules/auth";
import { notificationQueries, notificationPreferences } from "../infrastructure/container";
import type { PaginationInput } from "@/shared/kernel";

const markReadSchema = z.object({
  notificationId: z.string().min(1),
});

export async function listNotificationsAction(
  pagination?: PaginationInput,
  search?: string,
) {
  const user = await getCurrentUser();
  if (!user) return { items: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  if (!pagination) {
    const items = await notificationQueries.listForUser(user.id, 50);
    return { items, total: items.length, page: 1, limit: items.length, totalPages: 1 };
  }
  return notificationQueries.listForUserPaginated(user.id, pagination, search);
}

export async function getUnreadNotificationCountAction(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  return notificationQueries.getUnreadCount(user.id);
}

export async function markNotificationAsReadAction(
  formData: FormData,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const parsed = markReadSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return;

  await notificationQueries.markAsRead(user.id, parsed.data.notificationId);
  revalidatePath("/notifications");
}

export async function markAllNotificationsAsReadAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await notificationQueries.markAllRead(user.id);
  revalidatePath("/notifications");
}

export async function getNotificationPreferencesAction() {
  const user = await getCurrentUser();
  if (!user) return [];
  return notificationPreferences.listForUser(user.id);
}

const preferenceSchema = z.object({
  channel: z.string().min(1),
  eventType: z.string().min(1),
  enabled: z.enum(["true", "false"]),
});

export async function updateNotificationPreferenceAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = preferenceSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await notificationPreferences.upsert({
    userId: user.id,
    channel: parsed.data.channel,
    eventType: parsed.data.eventType,
    enabled: parsed.data.enabled === "true",
  });
  revalidatePath("/settings/notifications");
  return { ok: true };
}
