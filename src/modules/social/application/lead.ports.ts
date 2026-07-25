export interface SocialLeadRecord {
  id: string;
  storeId: string;
  source: string;
  externalFormId: string | null;
  externalLeadId: string | null;
  payload: unknown;
  mappedFields: unknown;
  status: string;
  score: number;
  customerId: string | null;
  assignedTo: string | null;
  nurturedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadRepository {
  create(input: {
    storeId: string;
    source: string;
    externalFormId?: string | null;
    externalLeadId?: string | null;
    payload?: unknown;
    mappedFields?: unknown;
    status?: string;
    score?: number;
    customerId?: string | null;
  }): Promise<SocialLeadRecord>;
  listByStore(storeId: string, limit?: number): Promise<SocialLeadRecord[]>;
  updateScore(id: string, score: number, status: string): Promise<SocialLeadRecord>;
}

export interface LeadService {
  captureLead(input: {
    storeId: string;
    source: string;
    externalFormId?: string | null;
    externalLeadId?: string | null;
    payload?: unknown;
  }): Promise<SocialLeadRecord>;
  scoreLead(id: string, storeId: string): Promise<SocialLeadRecord>;
}

export interface LeadQueries {
  listLeads(storeId: string, limit?: number): Promise<SocialLeadRecord[]>;
}
