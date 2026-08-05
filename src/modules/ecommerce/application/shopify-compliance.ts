import type { AuditLogCommands } from "@/modules/users";

export interface CustomerDataPayload {
  customer: {
    id?: number | string;
    email?: string;
    phone?: string;
  };
  orders: Array<{
    id: string;
    externalId: string;
    total: number | null;
    currency: string | null;
    orderDate: Date;
    couponCode: string | null;
  }>;
  carts: Array<{
    id: string;
    cartToken: string;
    totalPrice: number | null;
    currency: string | null;
    lineItemTitles: string[];
    createdAt: Date;
  }>;
}

export interface RedactionSummary {
  orders: number;
  carts: number;
  customers: number;
  followers: number;
  conversations: number;
  messages: number;
}

export interface ShopRedactionSummary extends RedactionSummary {
  products: number;
  coupons: number;
  integrations: number;
}

export interface ShopifyComplianceRepository {
  fetchCustomerData(input: {
    storeId: string;
    customerRef: string | null;
    customerEmail: string | null;
  }): Promise<CustomerDataPayload>;

  redactCustomer(input: {
    storeId: string;
    customerRef: string | null;
    customerEmail: string | null;
  }): Promise<RedactionSummary>;

  redactShop(storeId: string): Promise<ShopRedactionSummary>;

  disconnectStore(storeId: string): Promise<void>;
}

export interface AuditLogEntry {
  organizationId: string | null;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
}

export function makeRecordCompliance(
  auditLog: AuditLogCommands,
) {
  return async function record(entry: AuditLogEntry): Promise<void> {
    await auditLog.create({
      organizationId: entry.organizationId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      details: entry.details,
    });
  };
}
