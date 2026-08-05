"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, requireRole } from "@/modules/auth";
import { organizationQueries } from "@/modules/workspaces";
import { customerDirectory } from "../infrastructure/container";
import { PrismaCustomerRepository } from "../infrastructure/customer.repository";
import type { CustomerConsent, CustomerLifecycleStage } from "../application/ports";

export interface CustomerActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

const customers = new PrismaCustomerRepository();

const lifecycleStageSchema = z.object({
  customerId: z.string().min(1),
  lifecycleStage: z.enum(["LEAD", "PROSPECT", "CUSTOMER", "CHURNED"]),
});

const consentSchema = z.object({
  customerId: z.string().min(1),
  consent: z.enum(["PENDING", "GRANTED", "DECLINED"]),
});

async function assertCustomerInOrg(
  userId: string | null,
  customerId: string,
): Promise<{ ok: boolean; projectId?: string }> {
  if (!userId) return { ok: false };
  const overview = await organizationQueries.getOrganizationOverview(
    userId,
  );
  // Search all stores in the org for this customer first.
  const storeIds = overview?.stores.map((s) => s.id) ?? [];
  for (const projectId of storeIds) {
    const customer = await customers.findById(customerId, projectId);
    if (customer) return { ok: true, projectId: customer.projectId };
  }
  return { ok: false };
}

export async function updateCustomerLifecycleAction(
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireRole("STAFF");
  const parsed = lifecycleStageSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const auth = await assertCustomerInOrg(user.userId, parsed.data.customerId);
  if (!auth.ok || !auth.projectId) {
    return { error: "Customer not found in your organization." };
  }

  try {
    await customers.updateLifecycleStage(
      parsed.data.customerId,
      auth.projectId,
      parsed.data.lifecycleStage as CustomerLifecycleStage,
    );
    revalidatePath("/customers");
    revalidatePath(`/customers/${parsed.data.customerId}`);
    return { ok: true, message: "Lifecycle stage updated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Update failed" };
  }
}

export async function updateCustomerConsentAction(
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireRole("STAFF");
  const parsed = consentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const auth = await assertCustomerInOrg(user.userId, parsed.data.customerId);
  if (!auth.ok || !auth.projectId) {
    return { error: "Customer not found in your organization." };
  }

  try {
    await customers.updateConsent(
      parsed.data.customerId,
      auth.projectId,
      parsed.data.consent as CustomerConsent,
    );
    revalidatePath("/customers");
    revalidatePath(`/customers/${parsed.data.customerId}`);
    return { ok: true, message: "Consent updated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Update failed" };
  }
}

export async function getCustomerDirectoryAction(
  userId: string,
  filter?: Parameters<typeof customerDirectory.listCustomersByOrganization>[1],
) {
  const user = await getCurrentUser();
  if (!user || user.userId !== userId) {
    return { customers: [] };
  }
  const projectId = user.role === "STAFF" ? user.projectId : undefined;
  if (user.role === "STAFF" && !projectId) {
    return { customers: [] };
  }
  const customers = await customerDirectory.listCustomersByOrganization(
    userId,
    filter,
    projectId,
  );
  return { customers };
}
