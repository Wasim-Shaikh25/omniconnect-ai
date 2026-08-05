"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/modules/auth";
import { tenantGuard } from "@/modules/workspaces";
import { env } from "@/shared/config";
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
  let user;
  try {
    user = await requireRole("STORE_OWNER");
    await tenantGuard.assertStoreAccess(user, String(formData.get("projectId") ?? ""));
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

  const { projectId, ...update } = parsed.data;
  await updateCampaign({ projectId, ...update });
  revalidatePath(`/stores/${projectId}/campaigns/first-follower`);
  return { status: "success", message: "Campaign settings saved" };
}

const simulateSchema = z.object({
  projectId: z.string().min(1),
  externalUserId: z.string().min(1),
  username: z.string().min(1),
  channel: z.enum(["INSTAGRAM", "FACEBOOK"]),
});

export async function simulateFirstTimeFollower(
  _prev: CouponsActionState,
  formData: FormData,
): Promise<CouponsActionState> {
  if (env.NODE_ENV === "production") {
    return { status: "error", message: "Simulation is disabled in production." };
  }
  let user;
  try {
    user = await requireRole("STORE_OWNER");
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

  const { projectId, externalUserId, username, channel } = parsed.data;
  try {
    await tenantGuard.assertStoreAccess(user, projectId);
  } catch {
    return { status: "error", message: "Unauthorized" };
  }

  await eventBus.publish(
    new MetaFollowReceived(projectId, {
      projectId,
      externalUserId,
      username,
      channel,
    }),
  );
  revalidatePath(`/stores/${projectId}/campaigns/first-follower`);
  return { status: "success", message: `Simulated new ${channel.toLowerCase()} follower` };
}
