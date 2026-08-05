import { organizationUsage } from "@/modules/organizations";

export interface AIUsageGuard {
  assertAvailable(userId: string | null): Promise<void>;
  consume(userId: string | null): Promise<boolean>;
}

export class OrganizationAIUsageGuard implements AIUsageGuard {
  async assertAvailable(userId: string | null): Promise<void> {
    if (!userId) {
      throw new Error("Organization is required to use AI features.");
    }
    const allowed = await organizationUsage.consumeAIReply(userId);
    if (!allowed) {
      throw new Error("AI reply quota exceeded. Upgrade your plan or try again next month.");
    }
  }

  async consume(userId: string | null): Promise<boolean> {
    if (!userId) return false;
    return organizationUsage.consumeAIReply(userId);
  }
}

export const aiUsageGuard: AIUsageGuard = new OrganizationAIUsageGuard();
