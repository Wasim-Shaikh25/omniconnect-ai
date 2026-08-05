export interface SocialCommentRecord {
  id: string;
  projectId: string;
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
  projectId: string;
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
    projectId: string;
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
  listByStore(projectId: string, limit?: number): Promise<SocialCommentRecord[]>;
  findById(id: string): Promise<SocialCommentRecord | null>;
  markReplied(id: string, replyText: string): Promise<SocialCommentRecord>;
  markHidden(id: string, hidden: boolean): Promise<SocialCommentRecord>;
}

export interface SocialMentionRepository {
  create(input: {
    projectId: string;
    externalMediaId?: string | null;
    externalUserId?: string | null;
    handle?: string | null;
    mediaUrl?: string | null;
    source: string;
    caption?: string | null;
    hashtags?: string[];
  }): Promise<SocialMentionRecord>;
  listByStore(projectId: string, limit?: number): Promise<SocialMentionRecord[]>;
}

export interface SocialAutomationService {
  handleComment(input: {
    projectId: string;
    externalUserId: string;
    username: string | null;
    text: string;
    externalMediaId?: string | null;
    externalCommentId?: string | null;
  }): Promise<SocialCommentRecord>;
  replyToComment(id: string, projectId: string, replyText: string): Promise<SocialCommentRecord>;
  toggleHidden(id: string, projectId: string, hidden: boolean): Promise<SocialCommentRecord>;
}

export interface SocialQueries {
  listComments(projectId: string, limit?: number): Promise<SocialCommentRecord[]>;
  listMentions(projectId: string, limit?: number): Promise<SocialMentionRecord[]>;
}
