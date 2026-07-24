import type { MetaChannel } from "../domain/types";

export interface MetaIntegrationRecord {
  id: string;
  storeId: string;
  channel: MetaChannel;
  accountId: string | null;
  connectedAt: Date;
}

export interface MetaIntegrationRepository {
  connect(input: {
    storeId: string;
    channel: MetaChannel;
    accountId: string | null;
    accessToken: string | null;
  }): Promise<MetaIntegrationRecord>;

  findByStore(storeId: string): Promise<MetaIntegrationRecord | null>;

  /** Resolve which store owns an inbound page/IG account. */
  findStoreByAccountId(accountId: string): Promise<string | null>;
}

/** Outbound Graph API port (send replies, etc.). */
export interface MetaService {
  sendMessage(input: {
    storeId: string;
    recipientId: string;
    text: string;
  }): Promise<void>;
}
