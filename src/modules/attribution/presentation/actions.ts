"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { organizationUsage, requireStoreAccess } from "@/modules/workspaces";
import {
  createAttributionLink,
  listAttributionLinks,
  countAttributionLinksThisMonth,
} from "../infrastructure/container";
import type { AttributionLink } from "../application/ports";

const createSchema = z.object({
  projectId: z.string().min(1),
  couponId: z.string().optional().nullable(),
  utmSource: z.string().min(1),
  utmMedium: z.string().optional().nullable(),
  utmCampaign: z.string().optional().nullable(),
});

export interface CreateAttributionLinkState {
  ok: boolean;
  link?: AttributionLink;
  error?: string;
}

export async function createAttributionLinkAction(
  input: z.infer<typeof createSchema>,
): Promise<CreateAttributionLinkState> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const { user } = await requireStoreAccess(parsed.data.projectId);
    if (!user.userId) {
      return { ok: false, error: "User is not associated with an organization." };
    }
    const currentLinks = await countAttributionLinksThisMonth(parsed.data.projectId);
    const { allowed, limit } = await organizationUsage.checkLimit(
      user.userId,
      currentLinks,
      "maxAttributionLinksPerMonth",
    );
    if (!allowed) {
      return {
        ok: false,
        error:
          limit === null
            ? "Could not create attribution link."
            : `Your plan allows up to ${limit} attribution link(s) per month. Upgrade to create more.`,
      };
    }

    const link = await createAttributionLink({
      projectId: parsed.data.projectId,
      couponId: parsed.data.couponId,
      utmSource: parsed.data.utmSource,
      utmMedium: parsed.data.utmMedium,
      utmCampaign: parsed.data.utmCampaign,
    });
    revalidatePath(`/stores/${parsed.data.projectId}/analytics/attribution`);
    return { ok: true, link };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create link" };
  }
}

export interface ListAttributionLinksState {
  links: AttributionLink[];
  error?: string;
}

export async function listAttributionLinksAction(projectId: string): Promise<ListAttributionLinksState> {
  const parsed = z.string().min(1).safeParse(projectId);
  if (!parsed.success) {
    return { links: [], error: "Invalid project id" };
  }

  try {
    await requireStoreAccess(parsed.data);
    const links = await listAttributionLinks(parsed.data);
    return { links };
  } catch (error) {
    return { links: [], error: error instanceof Error ? error.message : "Failed to load links" };
  }
}
