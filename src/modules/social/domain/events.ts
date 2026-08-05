import { BaseDomainEvent } from "@/shared/kernel";

export interface CommentRepliedPayload {
  projectId: string;
  commentId: string;
  replyText: string;
}

export class CommentReplied extends BaseDomainEvent<CommentRepliedPayload> {
  readonly name = "CommentReplied";
}

export interface CommentHiddenPayload {
  projectId: string;
  commentId: string;
}

export class CommentHidden extends BaseDomainEvent<CommentHiddenPayload> {
  readonly name = "CommentHidden";
}
