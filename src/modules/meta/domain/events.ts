import { BaseDomainEvent } from "@/shared/kernel";
import type { MetaChannel } from "./types";

export interface MetaMessageReceivedPayload {
  storeId: string;
  channel: MetaChannel;
  externalUserId: string;
  username: string | null;
  text: string;
  externalConversationId: string | null;
}

export class MetaMessageReceived extends BaseDomainEvent<MetaMessageReceivedPayload> {
  readonly name = "MetaMessageReceived";
}

export interface MetaFollowReceivedPayload {
  storeId: string;
  channel: MetaChannel;
  externalUserId: string;
  username: string | null;
}

export class MetaFollowReceived extends BaseDomainEvent<MetaFollowReceivedPayload> {
  readonly name = "MetaFollowReceived";
}

export interface MetaCommentReceivedPayload {
  storeId: string;
  channel: MetaChannel;
  externalUserId: string;
  username: string | null;
  text: string;
  postId: string | null;
}

export class MetaCommentReceived extends BaseDomainEvent<MetaCommentReceivedPayload> {
  readonly name = "MetaCommentReceived";
}
