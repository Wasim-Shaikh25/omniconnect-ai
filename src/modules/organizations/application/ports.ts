import { EcommerceProvider } from "../domain/provider";
import { Plan } from "../domain/plan";

export interface OrganizationRecord {
  id: string;
  name: string;
  plan: Plan;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  createdAt: Date;
}

export interface StoreRecord {
  id: string;
  name: string;
  provider: EcommerceProvider;
  domain: string | null;
  organizationId: string;
  createdAt: Date;
}

export interface OrganizationRepository {
  create(input: { name: string }): Promise<OrganizationRecord>;
  findById(id: string): Promise<OrganizationRecord | null>;
  listAll(): Promise<OrganizationRecord[]>;
  updatePlan(
    id: string,
    input: { plan: Plan; subscriptionId?: string | null; subscriptionStatus?: string | null },
  ): Promise<OrganizationRecord | null>;
}

export interface StoreRepository {
  create(input: {
    organizationId: string;
    name: string;
    provider: EcommerceProvider;
    domain: string | null;
  }): Promise<StoreRecord>;
  listByOrganization(organizationId: string): Promise<StoreRecord[]>;
  findById(id: string): Promise<StoreRecord | null>;
}
