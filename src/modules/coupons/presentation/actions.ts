"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/modules/auth";
import { eventBus } from "@/shared/events";
import { MetaFollowReceived } from "@/modules/meta";
import { updateCampaignSchema, updateCampaign } from "@/modules/coupons";

export type CouponsActionState = {
  status: "idle" | "success" | "error";
  message: string;
  errors?: Record<string, string[]>;
};

export async function updateCampaignAction(
  _prev: CouponsActionState,
  formData: FormData,
): Promise<CouponsActionState> {
  try {
    await requireRole("STORE_OWNER");
  } catch {
    return { status: "error", message: "Unauthorized" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateCampaignSchema.safeParse({
    ...raw,
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { storeId, ...update } = parsed.data;
  await updateCampaign({ storeId, ...update });
  revalidatePath(`/stores/${storeId}/campaigns/first-follower`);
  return { status: "success", message: "Campaign settings saved" };
}

const simulateSchema = z.object({
  storeId: z.string().min(1),
  externalUserId: z.string().min(1),
  username: z.string().min(1),
  channel: z.enum(["INSTAGRAM", "FACEBOOK"]),
});

export async function simulateFirstTimeFollower(
  _prev: CouponsActionState,
  formData: FormData,
): Promise<CouponsActionState> {
  try {
    await requireRole("STORE_OWNER");
  } catch {
    return { status: "error", message: "Unauthorized" };
  }

  const parsed = simulateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { storeId, externalUserId, username, channel } = parsed.data;
  await eventBus.publish(
    new MetaFollowReceived(storeId, {
      storeId,
      externalUserId,
      username,
      channel,
    }),
  );
  revalidatePath(`/stores/${storeId}/campaigns/first-follower`);
  return { status: "success", message: `Simulated new ${channel.toLowerCase()} follower` };
}
