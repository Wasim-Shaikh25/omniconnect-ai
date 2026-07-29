"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/modules/auth";
import { notificationQueries } from "../infrastructure/container";
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
