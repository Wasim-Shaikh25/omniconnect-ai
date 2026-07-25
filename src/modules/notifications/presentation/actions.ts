"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/modules/auth";
import { notificationQueries } from "../infrastructure/container";

const markReadSchema = z.object({
  notificationId: z.string().min(1),
});

export async function listNotificationsAction() {
  const user = await getCurrentUser();
  if (!user) return [];
  return notificationQueries.listForUser(user.id, 50);
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
