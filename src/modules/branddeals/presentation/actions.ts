"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { brandDealCommands } from "../infrastructure/container";

async function requireStoreAccess(storeId: string) {
  const user = await getCurrentUser();
  if (!user) return false;
  const overview = user.organizationId
    ? await organizationQueries.getOrganizationOverview(user.organizationId)
    : null;
  return overview?.stores.some((s) => s.id === storeId) ?? false;
}

const createSchema = z.object({
  storeId: z.string().min(1),
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

  const { storeId, ...input } = parsed.data;

  if (!(await requireStoreAccess(storeId))) {
    throw new Error("Unauthorized");
  }

  await brandDealCommands.createBrandDeal({
    storeId,
    brandName: input.brandName,
    contactEmail: input.contactEmail || undefined,
    value: input.value,
    status: input.status || "LEAD",
    notes: input.notes,
  });

  revalidatePath(`/stores/${storeId}/brand-deals`);
}
