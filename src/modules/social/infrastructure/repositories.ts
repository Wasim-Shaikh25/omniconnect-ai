import { prisma } from "@/shared/database";
import type { CommentIntent, CommentSentiment, MentionSource } from "@prisma/client";
import type {
  SocialCommentRecord,
  SocialCommentRepository,
  SocialMentionRecord,
  SocialMentionRepository,
} from "../application/ports";

export class PrismaSocialCommentRepository implements SocialCommentRepository {
  async create(input: {
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
  }): Promise<SocialCommentRecord> {
    const created = await prisma.socialComment.create({
      data: {
        projectId: input.projectId,
        externalMediaId: input.externalMediaId ?? null,
        externalCommentId: input.externalCommentId ?? null,
        parentId: input.parentId ?? null,
        externalUserId: input.externalUserId ?? null,
        username: input.username ?? null,
        text: input.text,
        intent: input.intent as CommentIntent,
        sentiment: input.sentiment as CommentSentiment,
        autoReplyText: input.autoReplyText ?? null,
      },
    });
    return toCommentRecord(created);
  }

  async listByStore(
    projectId: string,
    limit = 50,
  ): Promise<SocialCommentRecord[]> {
    const rows = await prisma.socialComment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toCommentRecord);
  }

  async findById(id: string): Promise<SocialCommentRecord | null> {
    const row = await prisma.socialComment.findUnique({ where: { id } });
    return row ? toCommentRecord(row) : null;
  }

  async markReplied(
    id: string,
    replyText: string,
  ): Promise<SocialCommentRecord> {
    const updated = await prisma.socialComment.update({
      where: { id },
      data: { autoReplyText: replyText, repliedAt: new Date() },
    });
    return toCommentRecord(updated);
  }

  async markHidden(id: string, hidden: boolean): Promise<SocialCommentRecord> {
    const updated = await prisma.socialComment.update({
      where: { id },
      data: { hidden },
    });
    return toCommentRecord(updated);
  }
}

export class PrismaSocialMentionRepository implements SocialMentionRepository {
  async create(input: {
    projectId: string;
    externalMediaId?: string | null;
    externalUserId?: string | null;
    handle?: string | null;
    mediaUrl?: string | null;
    source: string;
    caption?: string | null;
    hashtags?: string[];
  }): Promise<SocialMentionRecord> {
    const created = await prisma.socialMention.create({
      data: {
        projectId: input.projectId,
        externalMediaId: input.externalMediaId ?? null,
        externalUserId: input.externalUserId ?? null,
        handle: input.handle ?? null,
        mediaUrl: input.mediaUrl ?? null,
        source: input.source as MentionSource,
        caption: input.caption ?? null,
        hashtags: input.hashtags ?? [],
      },
    });
    return toMentionRecord(created);
  }

  async listByStore(
    projectId: string,
    limit = 50,
  ): Promise<SocialMentionRecord[]> {
    const rows = await prisma.socialMention.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toMentionRecord);
  }
}

function toCommentRecord(row: {
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
}): SocialCommentRecord {
  return { ...row };
}

function toMentionRecord(row: {
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
}): SocialMentionRecord {
  return { ...row };
}