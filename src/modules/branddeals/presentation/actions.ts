"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/workspaces";
import { brandDealCommands } from "../infrastructure/container";

async function requireStoreAccess(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return false;
  const overview = user.userId
    ? await organizationQueries.getOrganizationOverview(user.userId)
    : null;
  return overview?.stores.some((s) => s.id === projectId) ?? false;
}

const createSchema = z.object({
  projectId: z.string().min(1),
  brandName: z.string().min(1).max(200),
  contactEmail: z.string().email().optional().or(z.literal("")),
  value: z.coerce.number().nonnegative().optional(),
  status: z
    .enum(["LEAD", "NEGOTIATING", "CONTRACTED", "DELIVERED", "PAID", "CLOSED"])
    .optional(),
  notes: z.string().max(2000).optional(),
});

export async function createBrandDealAction(formData: FormData): Promise<void> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = createSchema.safeParse({
    ...raw,
    value: raw.value ? Number(raw.value) : undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Validation failed");
  }

  const { projectId, ...input } = parsed.data;

  if (!(await requireStoreAccess(projectId))) {
    throw new Error("Unauthorized");
  }

  await brandDealCommands.createBrandDeal({
    projectId,
    brandName: input.brandName,
    contactEmail: input.contactEmail || undefined,
    value: input.value,
    status: input.status || "LEAD",
    notes: input.notes,
  });

  revalidatePath(`/stores/${projectId}/brand-deals`);
}
