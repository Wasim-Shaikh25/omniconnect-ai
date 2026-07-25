import type { FollowerRepository } from "./ports";

export function makeCrmCommands(deps: { followers: FollowerRepository }) {
  return {
    recordFollowerCampaignEnrollment(input: {
      followerId: string;
      couponId: string;
      welcomeMessageText: string;
    }) {
      return deps.followers.recordCampaignEnrollment(input);
    },
  };
}

export type CrmCommands = ReturnType<typeof makeCrmCommands>;
