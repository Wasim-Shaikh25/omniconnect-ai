import type { CustomerRepository, FollowerRepository } from "./ports";

export function makeCrmCommands(deps: {
  customers: CustomerRepository;
  followers: FollowerRepository;
}) {
  return {
    recordFollowerCampaignEnrollment(input: {
      followerId: string;
      storeId: string;
      couponId: string;
      welcomeMessageText: string;
    }) {
      return deps.followers.recordCampaignEnrollment(input);
    },

    upsertByExternalId(input: {
      storeId: string;
      channel: "INSTAGRAM" | "FACEBOOK";
      externalUserId: string;
      username: string | null;
    }) {
      return deps.customers.upsertByExternalId(input);
    },
  };
}

export type CrmCommands = ReturnType<typeof makeCrmCommands>;
