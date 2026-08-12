import type { Prisma } from "@prisma/client";
import type { Role } from "@/modules/auth";
import type { PaginationInput, PaginatedResult } from "@/shared/kernel";
import { EcommerceProvider } from "../domain/provider";
import { Plan } from "../domain/plan";
import type { PlanLimits } from "../domain/plan";
import type { InviteStatus } from "../domain/invite";

export interface OrganizationRecord {
  id: string;
  name: string;
  plan: Plan;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  paymentCustomerId: string | null;
  createdAt: Date;
}

export interface StoreRecord {
  id: string;
  name: string;
  provider: EcommerceProvider;
  domain: string | null;
  userId: string;
  archivedAt: Date | null;
  deletedAt: Date | null;
  lastProductSyncAt: Date | null;
  createdAt: Date;
}

export interface OrganizationRepository {
  create(input: { name: string; email?: string }): Promise<OrganizationRecord>;
  findById(id: string): Promise<OrganizationRecord | null>;
  findBySubscriptionId(
    subscriptionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<OrganizationRecord | null>;
  listAll(pagination?: PaginationInput): Promise<PaginatedResult<OrganizationRecord>>;
  updatePlan(
    id: string,
    input: { plan: Plan; subscriptionId?: string | null; subscriptionStatus?: string | null; paymentCustomerId?: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<OrganizationRecord | null>;
  /**
   * Atomically increments the organization's monthly AI reply counter when it is
   * still below the supplied limit. Resets the counter when crossing into a new
   * month. Returns true when the increment succeeded, false when the limit is
   * already reached. A `null` limit means unlimited.
   */
  incrementAIReplies(id: string, limit: number | null): Promise<boolean>;
  /**
   * Atomically increments the organization's daily profile-inspection counter when it is
   * still below the supplied limit. Resets the counter when crossing into a new day.
   * Returns true when the increment succeeded, false when the limit is already reached.
   * A `null` limit means unlimited.
   */
  incrementProfileInspections(id: string, limit: number | null): Promise<boolean>;
}

export type PlanConfigInput = PlanLimits & {
  plan: Plan;
  priceMonthlyCents?: number;
  isDefault?: boolean;
};

export interface PlanConfigRecord extends PlanConfigInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanConfigRepository {
  list(): Promise<PlanConfigRecord[]>;
  findByPlan(plan: Plan): Promise<PlanConfigRecord | null>;
  upsert(input: PlanConfigInput): Promise<PlanConfigRecord>;
}

export interface StoreRepository {
  create(
    input: {
      userId: string;
      name: string;
      provider: EcommerceProvider;
      domain: string | null;
    },
    maxStores?: number | null,
  ): Promise<StoreRecord>;
  update(
    id: string,
    input: { name?: string; provider?: EcommerceProvider; domain?: string | null },
  ): Promise<StoreRecord | null>;
  listByOrganization(userId: string, includeDeleted?: boolean, limit?: number): Promise<StoreRecord[]>;
  findById(id: string, includeDeleted?: boolean): Promise<StoreRecord | null>;
}

export interface OrganizationInviteRecord {
  id: string;
  email: string;
  userId: string;
  role: Role;
  projectId: string | null;
  status: InviteStatus;
  token: string;
  createdByUserId: string;
  createdAt: Date;
  expiresAt: Date;
}

export type CreateInviteInput = Omit<OrganizationInviteRecord, "id" | "createdAt" | "status"> & {
  status?: InviteStatus;
};

export type CreateInviteResult =
  | { ok: true; invite: OrganizationInviteRecord }
  | { ok: false; reason: "seat_limit"; limit: number };

export interface OrganizationInviteRepository {
  findByToken(token: string): Promise<OrganizationInviteRecord | null>;
  findPendingByEmail(userId: string, email: string): Promise<OrganizationInviteRecord | null>;
  findById(id: string, userId: string): Promise<OrganizationInviteRecord | null>;
  create(input: CreateInviteInput): Promise<OrganizationInviteRecord>;
  createWithinSeatLimit(
    input: CreateInviteInput,
    teamSeats: number | null,
    now?: Date,
  ): Promise<CreateInviteResult>;
  updateStatus(id: string, status: InviteStatus): Promise<OrganizationInviteRecord>;
  updateToken(id: string, userId: string, token: string, expiresAt: Date): Promise<OrganizationInviteRecord | null>;
  deleteInvite(id: string, userId: string): Promise<void>;
  countPendingByOrganization(userId: string): Promise<number>;
  listPendingByOrganization(userId: string, limit?: number): Promise<OrganizationInviteRecord[]>;
}
