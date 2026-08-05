export interface SocialLeadRecord {
  id: string;
  projectId: string;
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
    projectId: string;
    source: string;
    externalFormId?: string | null;
    externalLeadId?: string | null;
    payload?: unknown;
    mappedFields?: unknown;
    status?: string;
    score?: number;
    customerId?: string | null;
  }): Promise<SocialLeadRecord>;
  listByStore(projectId: string, limit?: number): Promise<SocialLeadRecord[]>;
  updateScore(id: string, score: number, status: string): Promise<SocialLeadRecord>;
}

export interface LeadService {
  captureLead(input: {
    projectId: string;
    source: string;
    externalFormId?: string | null;
    externalLeadId?: string | null;
    payload?: unknown;
  }): Promise<SocialLeadRecord>;
  scoreLead(id: string, projectId: string): Promise<SocialLeadRecord>;
}

export interface LeadQueries {
  listLeads(projectId: string, limit?: number): Promise<SocialLeadRecord[]>;
}
