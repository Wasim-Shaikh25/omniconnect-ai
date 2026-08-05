"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, ForbiddenError } from "@/modules/auth";
import { organizationQueries } from "@/modules/workspaces";
import { connectMeta } from "../infrastructure/container";
import { metaService } from "../infrastructure/container";
import { connectMetaSchema } from "../application/connect-meta";
import {
  simulateInbound,
  simulateInboundSchema,
} from "../application/simulate-inbound";
import type { MetaMediaItem } from "../application/ports";

export interface MetaActionState {
  error?: string;
  ok?: boolean;
  message?: string;
  media?: MetaMediaItem[];
}

/** Ensures the current user's organization owns the target store. */
async function assertStoreInOrg(
  userId: string | null,
  projectId: string,
): Promise<boolean> {
  if (!userId) return false;
  const overview =
    await organizationQueries.getOrganizationOverview(userId);
  return overview?.stores.some((s) => s.id === projectId) ?? false;
}

export async function connectMetaAction(
  _prev: MetaActionState,
  formData: FormData,
): Promise<MetaActionState> {
  const user = await requireRole("USER");

  const parsed = connectMetaSchema.safeParse({
    projectId: formData.get("projectId"),
    channel: formData.get("channel") || undefined,
    accountId: formData.get("accountId"),
    accessToken: formData.get("accessToken") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await connectMeta(parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/stores/${parsed.data.projectId}`);
  return { ok: true, message: `${parsed.data.channel} connected.` };
}

export async function simulateInboundAction(
  _prev: MetaActionState,
  formData: FormData,
): Promise<MetaActionState> {
  const user = await requireRole("USER");

  const parsed = simulateInboundSchema.safeParse({
    projectId: formData.get("projectId"),
    channel: formData.get("channel") || undefined,
    kind: formData.get("kind") || undefined,
    externalUserId: formData.get("externalUserId"),
    username: formData.get("username") || undefined,
    text: formData.get("text") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  await simulateInbound(parsed.data);

  revalidatePath(`/stores/${parsed.data.projectId}`);
  return { ok: true, message: `Simulated ${parsed.data.kind} event.` };
}

const searchHashtagMediaSchema = z.object({
  projectId: z.string().min(1),
  query: z.string().min(1).max(120),
  ownerFilter: z.string().max(120).optional(),
  limit: z.coerce.number().min(1).max(25).default(10),
});

export async function searchHashtagMediaAction(
  _prev: MetaActionState,
  formData: FormData,
): Promise<MetaActionState> {
  const user = await requireRole("USER");
  const parsed = searchHashtagMediaSchema.safeParse({
    projectId: formData.get("projectId"),
    query: formData.get("query"),
    ownerFilter: formData.get("ownerFilter") || undefined,
    limit: formData.get("limit") || 10,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  const { projectId, query, ownerFilter, limit } = parsed.data;

  const search = await metaService.searchHashtag(projectId, query);
  if (!search.hashtagId) {
    // When no connected IG account / token, fallback returns dev sample media.
    const fallback = await metaService.getHashtagMedia(projectId, `mock-${query.toLowerCase()}`, {
      top: true,
      limit,
    });
    return { ok: true, media: filterByOwner(fallback, ownerFilter) };
  }

  const media = await metaService.getHashtagMedia(projectId, search.hashtagId, {
    top: true,
    limit,
  });
  return { ok: true, media: filterByOwner(media, ownerFilter) };
}

function filterByOwner(media: MetaMediaItem[], ownerFilter?: string): MetaMediaItem[] {
  if (!ownerFilter) return media;
  const needle = ownerFilter.toLowerCase().replace(/^@/, "");
  return media.filter(
    (m) =>
      (m.ownerUsername?.toLowerCase().includes(needle) ?? false) ||
      (m.caption?.toLowerCase().includes(needle) ?? false),
  );
}
