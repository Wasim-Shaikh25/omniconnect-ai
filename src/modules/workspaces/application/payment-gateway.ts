import { Plan } from "../domain/plan";

export interface CheckoutSessionInput {
  userId: string;
  plan: Plan;
  successUrl: string;
  cancelUrl: string;
  promotionCodeId?: string;
  couponCode?: string;
}

export interface CheckoutSessionResult {
  url: string | null;
}

export interface PortalSessionInput {
  customerId: string;
  returnUrl: string;
}

export interface PortalSessionResult {
  url: string | null;
}

export interface InvoiceRecord {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: number;
  pdfUrl: string | null;
  periodStart: number | null;
  periodEnd: number | null;
  paymentIntentId: string | null;
}

export interface RefundResult {
  refundId: string;
  amount: number;
  status: string;
}

export interface RefundInput {
  paymentIntentId: string;
  amount?: number; // cents; omitted = full refund
  reason?: string;
}

export interface PaymentGateway {
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  createPortalSession(input: PortalSessionInput): Promise<PortalSessionResult>;
  listInvoices(customerId: string): Promise<InvoiceRecord[]>;
  createRefund(input: RefundInput): Promise<RefundResult>;
  constructWebhookEvent(payload: string | Buffer, signature: string, secret: string): unknown;
}
