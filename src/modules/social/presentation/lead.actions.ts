"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/workspaces";
import { leadService } from "../infrastructure/container";

const captureSchema = z.object({
  projectId: z.string().min(1),
  source: z.enum(["LEAD_ADS", "DM", "COMMENT", "FOLLOW"]),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  note: z.string().optional(),
});

const scoreSchema = z.object({
  projectId: z.string().min(1),
  leadId: z.string().min(1),
});

async function requireStoreAccess(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { user: null, ok: false };
  const overview = user.userId
    ? await organizationQueries.getOrganizationOverview(user.userId)
    : null;
  const store = overview?.stores.find((s) => s.id === projectId);
  if (!store) return { user, ok: false };
  return { user, ok: true };
}

export async function listLeadsAction(projectId: string) {
  const access = await requireStoreAccess(projectId);
  if (!access.ok) return [];
  return leadService.listLeads(projectId);
}

export async function captureLeadAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = captureSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const access = await requireStoreAccess(parsed.data.projectId);
  if (!access.ok) return { ok: false, error: "Not authorized" };

  const payload: Record<string, string | undefined> = {};
  if (parsed.data.name) payload.name = parsed.data.name;
  if (parsed.data.email) payload.email = parsed.data.email;
  if (parsed.data.note) payload.note = parsed.data.note;

  await leadService.captureLead({
    projectId: parsed.data.projectId,
    source: parsed.data.source,
    payload,
  });
  revalidatePath(`/stores/${parsed.data.projectId}/commerce/leads`);
  return { ok: true };
}

export async function scoreLeadAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = scoreSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const access = await requireStoreAccess(parsed.data.projectId);
  if (!access.ok) return { ok: false, error: "Not authorized" };

  await leadService.scoreLead(parsed.data.leadId, parsed.data.projectId);
  revalidatePath(`/stores/${parsed.data.projectId}/commerce/leads`);
  return { ok: true };
}
