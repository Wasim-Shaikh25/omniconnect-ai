import { env } from "@/shared/config";
import { PrismaNotificationRepository } from "./notification.repository";
import { PrismaNotificationPreferenceRepository } from "./preference.repository";
import { PrismaOrganizationMembersResolver } from "./organization-members.resolver";
import { EmailChannelStub } from "./email-channel.stub";
import { InAppChannelAdapter } from "./in-app-channel.adapter";
import { makeNotificationService } from "../application/service";
import { makeNotificationQueries } from "../application/queries";
import { ConsoleSmsSender } from "./console-sms";
import { makeTwilioSmsSender } from "./twilio-sms";
import type { SmsSender } from "../domain/sms-sender";

const notifications = new PrismaNotificationRepository();
const preferences = new PrismaNotificationPreferenceRepository();
const members = new PrismaOrganizationMembersResolver();
const emailChannel = new EmailChannelStub();
const inAppChannel = new InAppChannelAdapter();

export const notificationService = makeNotificationService({
  notifications,
  preferences,
  members,
  channels: {
    IN_APP: inAppChannel,
    EMAIL: emailChannel,
  },
});

export const notificationQueries = makeNotificationQueries({ notifications });

export const notificationPreferences = {
  listForUser: preferences.listForUser.bind(preferences),
  upsert: preferences.upsert.bind(preferences),
};

function makeSmsSender(): SmsSender | null {
  if (env.SMS_PROVIDER === "disabled") return null;
  if (env.SMS_PROVIDER === "twilio") {
    const sender = makeTwilioSmsSender();
    if (!sender) {
      throw new Error(
        "SMS_PROVIDER=twilio but Twilio credentials are incomplete. " +
        "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.",
      );
    }
    return sender;
  }
  return new ConsoleSmsSender();
}

export const smsSender = makeSmsSender();
