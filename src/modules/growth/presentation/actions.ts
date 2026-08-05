"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/workspaces";
import { growthService, growthQueries } from "../infrastructure/container";

export interface GrowthActionState {
  error?: string;
  ok?: boolean;
}

function isEmptyValue(value: FormDataEntryValue): boolean {
  if (typeof value === "string") return value.trim() === "";
  return value.size === 0;
}

function parseForm(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (isEmptyValue(value)) continue;
    const existing = obj[key];
    if (existing === undefined) {
      obj[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      obj[key] = [existing, value];
    }
  }
  return obj;
}

const collectUgcSchema = z.object({
  projectId: z.string().min(1),
  creatorHandle: z.string().max(255).optional(),
  mediaUrl: z.string().url().optional(),
  mediaType: z.string().max(50).optional(),
  source: z.string().min(1),
  caption: z.string().max(2000).optional(),
});

const idSchema = z.object({
  projectId: z.string().min(1),
  assetId: z.string().min(1),
  approvedBy: z.string().max(255).optional(),
});

const enrollSchema = z.object({
  projectId: z.string().min(1),
  handle: z.string().max(255).optional(),
  discountPct: z.coerce.number().min(0).max(100).optional(),
  commissionPct: z.coerce.number().min(0).max(100).optional(),
});

const referralSchema = z.object({
  projectId: z.string().min(1),
  ambassadorId: z.string().min(1),
  orderId: z.string().min(1),
  orderAmount: z.coerce.number().min(0),
});

const campaignSchema = z.object({
  projectId: z.string().min(1),
  campaignType: z.enum(["WELCOME", "ABANDONED_CART", "BACK_IN_STOCK", "REVIEW", "RE_ENGAGE"]),
  audienceCriteria: z.string().max(2000).optional(),
  scheduledAt: z.coerce.date().optional(),
});

const campaignIdSchema = z.object({
  projectId: z.string().min(1),
  campaignId: z.string().min(1),
});

const backInStockSchema = z.object({
  projectId: z.string().min(1),
  productId: z.string().min(1),
  externalUserId: z.string().max(255).optional(),
});

const subscriptionIdSchema = z.object({
  projectId: z.string().min(1),
  subscriptionId: z.string().min(1),
});

const commentUnlockSchema = z.object({
  projectId: z.string().min(1),
  keyword: z.string().min(1).max(120),
  rewardType: z.enum(["LINK", "COUPON", "MESSAGE"]),
  rewardValue: z.string().max(1000).optional(),
  message: z.string().min(1).max(2000),
  referralAsk: z.string().max(500).optional(),
});

async function requireStoreAccess(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return false;
  const overview = user.userId
    ? await organizationQueries.getOrganizationOverview(user.userId)
    : null;
  return overview?.stores.some((s) => s.id === projectId) ?? false;
}

export async function listGrowthAction(projectId: string) {
  if (!(await requireStoreAccess(projectId))) {
    return { ugc: [], ambassadors: [], referrals: [], campaigns: [], backInStock: [], commentUnlocks: [] };
  }
  const [ugc, ambassadors, referrals, campaigns, backInStock, commentUnlocks] = await Promise.all([
    growthQueries.listUgc(projectId),
    growthQueries.listAmbassadors(projectId),
    growthQueries.listReferrals(projectId),
    growthQueries.listCampaigns(projectId),
    growthQueries.listBackInStock(projectId),
    growthQueries.listCommentUnlockCampaigns(projectId),
  ]);
  return { ugc, ambassadors, referrals, campaigns, backInStock, commentUnlocks };
}

export async function collectUgcAction(formData: FormData): Promise<void> {
  const parsed = collectUgcSchema.safeParse(parseForm(formData));
  if (!parsed.success) return;
  if (!(await requireStoreAccess(parsed.data.projectId))) return;
  await growthService.collectUgc(parsed.data);
  revalidatePath(`/stores/${parsed.data.projectId}/commerce/growth`);
}

export async function requestUgcRightsAction(formData: FormData): Promise<void> {
  const parsed = idSchema.safeParse(parseForm(formData));
  if (!parsed.success) return;
  if (!(await requireStoreAccess(parsed.data.projectId))) return;
  await growthService.requestRights(parsed.data.assetId, parsed.data.projectId);
  revalidatePath(`/stores/${parsed.data.projectId}/commerce/growth`);
}

export async function approveUgcRightsAction(formData: FormData): Promise<void> {
  const parsed = idSchema.safeParse(parseForm(formData));
  if (!parsed.success) return;
  if (!(await requireStoreAccess(parsed.data.projectId))) return;
  await growthService.approveRights(
    parsed.data.assetId,
    parsed.data.projectId,
    parsed.data.approvedBy ?? "store-owner",
  );
  revalidatePath(`/stores/${parsed.data.projectId}/commerce/growth`);
}

export async function enrollAmbassadorAction(formData: FormData): Promise<void> {
  const parsed = enrollSchema.safeParse(parseForm(formData));
  if (!parsed.success) return;
  if (!(await requireStoreAccess(parsed.data.projectId))) return;
  await growthService.enrollAmbassador(parsed.data);
  revalidatePath(`/stores/${parsed.data.projectId}/commerce/growth`);
  revalidatePath(`/stores/${parsed.data.projectId}/affiliates`);
}

export async function recordReferralAction(formData: FormData): Promise<void> {
  const parsed = referralSchema.safeParse(parseForm(formData));
  if (!parsed.success) return;
  if (!(await requireStoreAccess(parsed.data.projectId))) return;
  await growthService.recordReferral(parsed.data);
  revalidatePath(`/stores/${parsed.data.projectId}/commerce/growth`);
  revalidatePath(`/stores/${parsed.data.projectId}/affiliates`);
}

export async function createDmCampaignAction(formData: FormData): Promise<void> {
  const parsed = campaignSchema.safeParse(parseForm(formData));
  if (!parsed.success) return;
  if (!(await requireStoreAccess(parsed.data.projectId))) return;
  await growthService.createDmCampaign({
    projectId: parsed.data.projectId,
    campaignType: parsed.data.campaignType,
    audienceCriteria: parsed.data.audienceCriteria
      ? { description: parsed.data.audienceCriteria }
      : undefined,
    scheduledAt: parsed.data.scheduledAt,
  });
  revalidatePath(`/stores/${parsed.data.projectId}/commerce/growth`);
}

export async function sendDmCampaignAction(formData: FormData): Promise<void> {
  const parsed = campaignIdSchema.safeParse(parseForm(formData));
  if (!parsed.success) return;
  if (!(await requireStoreAccess(parsed.data.projectId))) return;
  await growthService.sendDmCampaign(parsed.data.campaignId, parsed.data.projectId);
  revalidatePath(`/stores/${parsed.data.projectId}/commerce/growth`);
}

export async function subscribeBackInStockAction(formData: FormData): Promise<void> {
  const parsed = backInStockSchema.safeParse(parseForm(formData));
  if (!parsed.success) return;
  if (!(await requireStoreAccess(parsed.data.projectId))) return;
  await growthService.subscribeBackInStock(parsed.data);
  revalidatePath(`/stores/${parsed.data.projectId}/commerce/growth`);
}

export async function notifyBackInStockAction(formData: FormData): Promise<void> {
  const parsed = subscriptionIdSchema.safeParse(parseForm(formData));
  if (!parsed.success) return;
  if (!(await requireStoreAccess(parsed.data.projectId))) return;
  await growthService.notifyBackInStock(parsed.data.subscriptionId, parsed.data.projectId);
  revalidatePath(`/stores/${parsed.data.projectId}/commerce/growth`);
}

export async function createCommentUnlockCampaignAction(
  formData: FormData,
): Promise<void> {
  const parsed = commentUnlockSchema.safeParse(parseForm(formData));
  if (!parsed.success) return;
  if (!(await requireStoreAccess(parsed.data.projectId))) return;
  await growthService.createCommentUnlockCampaign(parsed.data);
  revalidatePath(`/stores/${parsed.data.projectId}/commerce/growth`);
}
