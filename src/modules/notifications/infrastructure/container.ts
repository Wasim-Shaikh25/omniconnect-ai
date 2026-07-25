import { PrismaNotificationRepository } from "./notification.repository";
import { PrismaOrganizationMembersResolver } from "./organization-members.resolver";
import { EmailChannelStub } from "./email-channel.stub";
import { InAppChannelAdapter } from "./in-app-channel.adapter";
import { makeNotificationService } from "../application/service";
import { makeNotificationQueries } from "../application/queries";

const notifications = new PrismaNotificationRepository();
const members = new PrismaOrganizationMembersResolver();
const emailChannel = new EmailChannelStub();
const inAppChannel = new InAppChannelAdapter();

export const notificationService = makeNotificationService({
  notifications,
  members,
  channels: {
    IN_APP: inAppChannel,
    EMAIL: emailChannel,
  },
});

export const notificationQueries = makeNotificationQueries({ notifications });
