import type { MetaMediaItem } from "@/modules/meta";
import type { CompetitorAnalysis } from "@/modules/ai";

export interface TrackedAccountRecord {
  id: string;
  storeId: string;
  platform: string;
  handle: string;
  niche: string | null;
  note: string | null;
  lastMedia: MetaMediaItem[] | null;
  lastAnalysis: CompetitorAnalysis | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTrackedAccountInput {
  storeId: string;
  platform?: string;
  handle: string;
  niche?: string | null;
  note?: string | null;
}

export interface UpdateTrackedAccountInput {
  niche?: string | null;
  note?: string | null;
  lastMedia?: MetaMediaItem[] | null;
  lastAnalysis?: CompetitorAnalysis | null;
  lastSyncedAt?: Date | null;
}

export interface TrackedAccountRepository {
  create(input: CreateTrackedAccountInput): Promise<TrackedAccountRecord>;
  listByStore(storeId: string): Promise<TrackedAccountRecord[]>;
  findById(id: string): Promise<TrackedAccountRecord | null>;
  update(id: string, input: UpdateTrackedAccountInput): Promise<TrackedAccountRecord>;
  delete(id: string): Promise<void>;
}
