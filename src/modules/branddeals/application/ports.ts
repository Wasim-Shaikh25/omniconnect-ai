export type BrandDealStatus =
  | "LEAD"
  | "NEGOTIATING"
  | "CONTRACTED"
  | "DELIVERED"
  | "PAID"
  | "CLOSED";

export interface BrandDealRecord {
  id: string;
  storeId: string;
  brandName: string;
  contactEmail: string | null;
  value: number | null;
  status: BrandDealStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrandDealInput {
  storeId: string;
  brandName: string;
  contactEmail?: string;
  value?: number;
  status?: BrandDealStatus;
  notes?: string;
}

export interface BrandDealRepository {
  listByStore(storeId: string, limit?: number): Promise<BrandDealRecord[]>;
  create(input: CreateBrandDealInput): Promise<BrandDealRecord>;
}

export interface BrandDealQueries {
  listByStore(storeId: string, limit?: number): Promise<BrandDealRecord[]>;
}

export interface BrandDealCommands {
  create(input: CreateBrandDealInput): Promise<BrandDealRecord>;
}
