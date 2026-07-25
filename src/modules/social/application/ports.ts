export interface SocialCommentRecord {
  id: string;
  storeId: string;
  externalMediaId: string | null;
  externalCommentId: string | null;
  parentId: string | null;
  externalUserId: string | null;
  username: string | null;
  text: string;
  intent: string;
  sentiment: string;
  autoReplyText: string | null;
  repliedAt: Date | null;
  hidden: boolean;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialMentionRecord {
  id: string;
  storeId: string;
  externalMediaId: string | null;
  externalUserId: string | null;
  handle: string | null;
  mediaUrl: string | null;
  source: string;
  caption: string | null;
  hashtags: string[];
  createdAt: Date;
}

export interface SocialCommentRepository {
  create(input: {
    storeId: string;
    externalMediaId?: string | null;
    externalCommentId?: string | null;
    parentId?: string | null;
    externalUserId?: string | null;
    username?: string | null;
    text: string;
    intent: string;
    sentiment: string;
    autoReplyText?: string | null;
  }): Promise<SocialCommentRecord>;
  listByStore(storeId: string, limit?: number): Promise<SocialCommentRecord[]>;
  findById(id: string): Promise<SocialCommentRecord | null>;
  markReplied(id: string, replyText: string): Promise<SocialCommentRecord>;
  markHidden(id: string, hidden: boolean): Promise<SocialCommentRecord>;
}

export interface SocialMentionRepository {
  create(input: {
    storeId: string;
    externalMediaId?: string | null;
    externalUserId?: string | null;
    handle?: string | null;
    mediaUrl?: string | null;
    source: string;
    caption?: string | null;
    hashtags?: string[];
  }): Promise<SocialMentionRecord>;
  listByStore(storeId: string, limit?: number): Promise<SocialMentionRecord[]>;
}

export interface SocialAutomationService {
  handleComment(input: {
    storeId: string;
    externalUserId: string;
    username: string | null;
    text: string;
    externalMediaId?: string | null;
    externalCommentId?: string | null;
  }): Promise<SocialCommentRecord>;
  replyToComment(id: string, storeId: string, replyText: string): Promise<SocialCommentRecord>;
  toggleHidden(id: string, storeId: string, hidden: boolean): Promise<SocialCommentRecord>;
}

export interface SocialQueries {
  listComments(storeId: string, limit?: number): Promise<SocialCommentRecord[]>;
  listMentions(storeId: string, limit?: number): Promise<SocialMentionRecord[]>;
}
