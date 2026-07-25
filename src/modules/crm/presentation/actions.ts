"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, requireRole } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
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
  organizationId: string | null,
  customerId: string,
): Promise<boolean> {
  if (!organizationId) return false;
  const overview = await organizationQueries.getOrganizationOverview(
    organizationId,
  );
  const customer = await customers.findById(customerId);
  if (!customer) return false;
  return overview?.stores.some((s) => s.id === customer.storeId) ?? false;
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

  if (!(await assertCustomerInOrg(user.organizationId, parsed.data.customerId))) {
    return { error: "Customer not found in your organization." };
  }

  try {
    await customers.updateLifecycleStage(
      parsed.data.customerId,
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

  if (!(await assertCustomerInOrg(user.organizationId, parsed.data.customerId))) {
    return { error: "Customer not found in your organization." };
  }

  try {
    await customers.updateConsent(
      parsed.data.customerId,
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
  organizationId: string,
  filter?: Parameters<typeof customerDirectory.listCustomersByOrganization>[1],
) {
  const user = await getCurrentUser();
  if (!user || user.organizationId !== organizationId) {
    return { customers: [] };
  }
  const customers = await customerDirectory.listCustomersByOrganization(
    organizationId,
    filter,
  );
  return { customers };
}
