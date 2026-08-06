"use server";

import { z } from "zod";
import { requireSuperAdmin } from "@/modules/auth";
import { listAllOrganizationsAction, billingService } from "@/modules/workspaces";

const refundSchema = z.object({
  paymentIntentId: z.string().min(1),
  amount: z.coerce.number().int().min(0).optional(),
  reason: z.string().max(500).optional(),
});

export interface PaymentInvoiceView {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: number;
  pdfUrl: string | null;
  paymentIntentId: string | null;
  organizationId: string;
  organizationName: string;
}

export type AdminBillingActionState =
  | { error?: string; ok?: boolean; refundId?: string; amount?: number }
  | undefined;

export async function listPaymentInvoicesAction(): Promise<{
  items: PaymentInvoiceView[];
}> {
  await requireSuperAdmin();
  if (!billingService) {
    return { items: [] };
  }

  const invoices: PaymentInvoiceView[] = [];

  const first = await listAllOrganizationsAction(1, 100);
  const totalPages = first.totalPages;

  for (let p = 1; p <= totalPages; p++) {
    const result = p === 1 ? first : await listAllOrganizationsAction(p, 100);
    for (const org of result.items) {
      if (!org.stripeCustomerId) continue;
      const orgInvoices = await billingService.listInvoices(org.stripeCustomerId);
      for (const invoice of orgInvoices) {
        invoices.push({
          ...invoice,
          organizationId: org.id,
          organizationName: org.name,
        });
      }
    }
  }

  return { items: invoices.sort((a, b) => b.createdAt - a.createdAt) };
}

export async function refundInvoiceAction(
  _prev: AdminBillingActionState,
  formData: FormData,
): Promise<AdminBillingActionState> {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "Forbidden" };
  if (!billingService) {
    return { error: "Payment gateway is not configured" };
  }

  const raw: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    raw[key] = value;
  });

  const parsed = refundSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const result = await billingService.refundPayment({
      paymentIntentId: parsed.data.paymentIntentId,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
    });
    return { ok: true, refundId: result.refundId, amount: result.amount };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Refund failed" };
  }
}
