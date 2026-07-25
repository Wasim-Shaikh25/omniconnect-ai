"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { metaService } from "@/modules/meta/server";
import { analyzeCompetitor } from "@/modules/ai/server";
import type { MetaMediaItem } from "@/modules/meta";
import type { CompetitorAnalysis } from "@/modules/ai";
import type { TrackedAccountRecord } from "../application/ports";
import { PrismaTrackedAccountRepository } from "../infrastructure/tracked-account.repository";

const trackedAccountRepository = new PrismaTrackedAccountRepository();

export interface TrackCompetitorState {
  error?: string;
  ok?: boolean;
  account?: TrackedAccountRecord;
}

export interface ListCompetitorsState {
  error?: string;
  accounts?: TrackedAccountRecord[];
}

export interface CompetitorMediaState {
  error?: string;
  media?: MetaMediaItem[];
  accountId?: string;
}

export interface CompetitorAnalysisState {
  error?: string;
  analysis?: CompetitorAnalysis;
  accountId?: string;
}

async function assertStoreInOrg(organizationId: string | null, storeId: string): Promise<boolean> {
  if (!organizationId) return false;
  const overview = await organizationQueries.getOrganizationOverview(organizationId);
  return overview?.stores.some((s) => s.id === storeId) ?? false;
}

const trackCompetitorSchema = z.object({
  storeId: z.string().min(1),
  handle: z.string().min(1).max(120),
  platform: z.string().max(50).default("INSTAGRAM"),
  niche: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
});

export async function trackCompetitorAction(
  _prev: TrackCompetitorState,
  formData: FormData,
): Promise<TrackCompetitorState> {
  const user = await requireRole("STORE_OWNER");
  const parsed = trackCompetitorSchema.safeParse({
    storeId: formData.get("storeId"),
    handle: formData.get("handle"),
    platform: formData.get("platform") ?? "INSTAGRAM",
    niche: formData.get("niche") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    const account = await trackedAccountRepository.create({
      storeId: parsed.data.storeId,
      handle: parsed.data.handle.replace(/^@/, ""),
      platform: parsed.data.platform,
      niche: parsed.data.niche ?? null,
      note: parsed.data.note ?? null,
    });
    revalidatePath(`/stores/${parsed.data.storeId}/commerce/competitors`);
    return { ok: true, account };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not track competitor" };
  }
}

export async function listTrackedCompetitorsAction(storeId: string): Promise<ListCompetitorsState> {
  const user = await requireRole("STORE_OWNER");
  if (!(await assertStoreInOrg(user.organizationId, storeId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    const accounts = await trackedAccountRepository.listByStore(storeId);
    return { accounts };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not load competitors" };
  }
}

const getCompetitorMediaSchema = z.object({
  storeId: z.string().min(1),
  accountId: z.string().min(1),
  limit: z.coerce.number().min(1).max(25).default(10),
});

export async function getCompetitorMediaAction(
  _prev: CompetitorMediaState,
  formData: FormData,
): Promise<CompetitorMediaState> {
  const user = await requireRole("STORE_OWNER");
  const parsed = getCompetitorMediaSchema.safeParse({
    storeId: formData.get("storeId"),
    accountId: formData.get("accountId"),
    limit: formData.get("limit") ? Number(formData.get("limit")) : 10,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  const account = await trackedAccountRepository.findById(parsed.data.accountId);
  if (!account || account.storeId !== parsed.data.storeId) {
    return { error: "Competitor not found." };
  }

  try {
    const media = await metaService.getCompetitorMedia(parsed.data.storeId, account.handle, { limit: parsed.data.limit });
    await trackedAccountRepository.update(account.id, {
      lastMedia: media,
      lastSyncedAt: new Date(),
    });
    return { media, accountId: account.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not fetch competitor media" };
  }
}

const analyzeCompetitorSchema = z.object({
  storeId: z.string().min(1),
  accountId: z.string().min(1),
});

export async function analyzeCompetitorAction(
  _prev: CompetitorAnalysisState,
  formData: FormData,
): Promise<CompetitorAnalysisState> {
  const user = await requireRole("STORE_OWNER");
  const parsed = analyzeCompetitorSchema.safeParse({
    storeId: formData.get("storeId"),
    accountId: formData.get("accountId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  const account = await trackedAccountRepository.findById(parsed.data.accountId);
  if (!account || account.storeId !== parsed.data.storeId) {
    return { error: "Competitor not found." };
  }

  const posts = account.lastMedia ?? [];
  if (posts.length === 0) {
    return { error: "Fetch competitor posts first before analyzing." };
  }

  try {
    const analysis = await analyzeCompetitor({
      storeId: parsed.data.storeId,
      handle: account.handle,
      niche: account.niche,
      posts,
    });
    await trackedAccountRepository.update(account.id, { lastAnalysis: analysis });
    return { analysis, accountId: account.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not analyze competitor" };
  }
}

const deleteTrackedCompetitorSchema = z.object({
  storeId: z.string().min(1),
  accountId: z.string().min(1),
});

export async function deleteTrackedCompetitorAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireRole("STORE_OWNER");
  const parsed = deleteTrackedCompetitorSchema.safeParse({
    storeId: formData.get("storeId"),
    accountId: formData.get("accountId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  const account = await trackedAccountRepository.findById(parsed.data.accountId);
  if (!account || account.storeId !== parsed.data.storeId) {
    return { error: "Competitor not found." };
  }

  try {
    await trackedAccountRepository.delete(account.id);
    revalidatePath(`/stores/${parsed.data.storeId}/commerce/competitors`);
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not remove competitor" };
  }
}
