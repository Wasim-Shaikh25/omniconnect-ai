export type BrandDealStatus =
  | "LEAD"
  | "NEGOTIATING"
  | "CONTRACTED"
  | "DELIVERED"
  | "PAID"
  | "CLOSED";

export interface BrandDealRecord {
  id: string;
  projectId: string;
  brandName: string;
  contactEmail: string | null;
  value: number | null;
  status: BrandDealStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrandDealInput {
  projectId: string;
  brandName: string;
  contactEmail?: string;
  value?: number;
  status?: BrandDealStatus;
  notes?: string;
}

export interface BrandDealRepository {
  listByStore(projectId: string, limit?: number): Promise<BrandDealRecord[]>;
  create(input: CreateBrandDealInput): Promise<BrandDealRecord>;
}

export interface BrandDealQueries {
  listByStore(projectId: string, limit?: number): Promise<BrandDealRecord[]>;
}

export interface BrandDealCommands {
  create(input: CreateBrandDealInput): Promise<BrandDealRecord>;
}
