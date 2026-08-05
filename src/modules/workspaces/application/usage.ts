import { OrganizationRepository } from "./ports";
import { Plan, planLimits } from "../domain/plan";

export function makeOrganizationUsageService(deps: {
  organizations: OrganizationRepository;
}) {
  return {
    /**
     * Attempt to consume one AI reply for the organization.
     * Returns `true` when the request is within the plan's monthly limit and
     * the atomic counter was incremented, `false` otherwise.
     */
    async consumeAIReply(userId: string): Promise<boolean> {
      const org = await deps.organizations.findById(userId);
      if (!org) return false;
      const { monthlyAiReplies } = planLimits(org.plan as Plan);
      return deps.organizations.incrementAIReplies(userId, monthlyAiReplies);
    },
  };
}
