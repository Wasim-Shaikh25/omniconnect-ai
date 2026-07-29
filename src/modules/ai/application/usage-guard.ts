import { organizationUsage } from "@/modules/organizations";

export interface AIUsageGuard {
  assertAvailable(organizationId: string | null): Promise<void>;
  consume(organizationId: string | null): Promise<boolean>;
}

export class OrganizationAIUsageGuard implements AIUsageGuard {
  async assertAvailable(organizationId: string | null): Promise<void> {
    if (!organizationId) {
      throw new Error("Organization is required to use AI features.");
    }
    const allowed = await organizationUsage.consumeAIReply(organizationId);
    if (!allowed) {
      throw new Error("AI reply quota exceeded. Upgrade your plan or try again next month.");
    }
  }

  async consume(organizationId: string | null): Promise<boolean> {
    if (!organizationId) return false;
    return organizationUsage.consumeAIReply(organizationId);
  }
}

export const aiUsageGuard: AIUsageGuard = new OrganizationAIUsageGuard();
